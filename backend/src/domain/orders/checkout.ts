import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {Prisma} from '@/generated/prisma/client';
import {db} from '@/server/db';
import {command,DomainError,type Tx} from '@/server/commands';
import {solveAllocation,type AllocationPlan} from '@/domain/allocation/solver';
import {allocationWarehouse} from '@/domain/allocation/contracts';
import {lockAllocationStock} from '@/domain/inventory/locks';
import {moveStock} from '@/domain/inventory/service';
import {issueDocumentCode} from './identifiers';
import {nextCustomerId} from '@/domain/foundation/service';
const line=z.object({skuId:z.string().min(1).max(80),quantity:z.number().int().min(1).max(5)});
const quoteInput=z.object({draftId:z.string().min(1).max(80).optional(),city:z.enum(['HN','DN','HCM']),address:z.string().trim().min(5).max(500),lines:z.array(line).min(1).max(5)});
const checkoutInput=quoteInput.extend({orderId:z.string().regex(/^DH-\d{6}-[0-9A-F]{6}$/).optional(),draftId:z.string().min(1).max(80).optional(),version:z.number().int().positive().optional(),customerId:z.string().min(1).max(80).optional(),newCustomer:z.boolean().default(false),recipient:z.string().trim().min(2).max(120),phone:z.string().regex(/^[0-9+ ()-]{8,20}$/),channel:z.enum(['NHAP_TAY','WEBSITE','SHOPEE','TIKTOK','SHOPVUI']),externalId:z.string().trim().min(1).max(80).optional(),storefrontRecoveryHash:z.string().regex(/^[a-f0-9]{64}$/).optional(),paymentMethod:z.enum(['TRA_TRUOC','COD']),quote:z.string().max(2048).optional(),mode:z.enum(['confirm','draft']).default('confirm'),paidOnline:z.boolean().default(false)});
type Input=z.infer<typeof quoteInput>;
function validateLines(input:Input){if(new Set(input.lines.map(l=>l.skuId)).size!==input.lines.length)throw new DomainError('Mỗi sản phẩm chỉ được chọn một dòng.',422);}
function secret(){if(!process.env.SESSION_SECRET)throw Error('SESSION_SECRET required');return process.env.SESSION_SECRET;}
function digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function sign(data:string){return createHmac('sha256',secret()).update('oms-checkout-v1:'+data).digest('base64url');}
function token(hash:string){const data=Buffer.from(JSON.stringify({hash,expires:Date.now()+5*60000})).toString('base64url');return data+'.'+sign(data);}
function verify(value:string|undefined,hash:string){try{if(!value)throw Error();const [data,signature,...rest]=value.split('.');if(rest.length||!signature)throw Error();const expected=Buffer.from(sign(data)),actual=Buffer.from(signature);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error();const decoded=JSON.parse(Buffer.from(data,'base64url').toString());if(decoded.expires<Date.now()||decoded.hash!==hash)throw Error();}catch{throw new DomainError('Tồn, giá hoặc phương án giao đã thay đổi / báo phí hết hạn. Kiểm tra lại kho và phí trước khi xác nhận.',409);}}
async function calculate(tx:Tx,input:Input){
 validateLines(input);const requested=[...input.lines].sort((a,b)=>a.skuId.localeCompare(b.skuId));
 const skus=await tx.sku.findMany({where:{id:{in:requested.map(l=>l.skuId)},active:true}});if(skus.length!==requested.length)throw new DomainError('Có sản phẩm không còn kinh doanh. Vui lòng chọn lại.',422);
 const lines=requested.map(l=>{const sku=skus.find(s=>s.id===l.skuId)!;return{id:l.skuId,skuId:l.skuId,name:sku.name+(sku.variant?' — '+sku.variant:''),quantity:l.quantity,weightGrams:sku.weightGrams,price:Number(sku.price)};});
 const warehouses=await tx.warehouse.findMany({where:{active:true},include:{inventory:{where:{skuId:{in:requested.map(l=>l.skuId)}}}}});
 const candidates=warehouses.map(allocationWarehouse);
 const draft=input.draftId?await tx.order.findUnique({where:{id:input.draftId},select:{deadline:true,status:true}}):null;
 if(input.draftId&&(!draft||!['NHAP','CHO_HANG'].includes(draft.status)))throw new DomainError('Không tìm thấy đơn nháp còn được lập phương án.',409);
 const remaining=draft?.deadline?Math.max(0,(draft.deadline.getTime()-Date.now())/3600000):24;
 const plan=solveAllocation(lines,candidates,input.city+'-NOITHANH',remaining);const goods=lines.reduce((n,l)=>n+l.price*l.quantity,0),shippingFee=plan?.parcels.reduce((n,p)=>n+p.freight,0)??null;
 const available=candidates.filter(w=>['HN','DN','HCM'].includes(w.region.replace(/-NOITHANH$/,'')));
 const shortages=lines.flatMap(l=>{const count=available.reduce((n,w)=>n+(w.stock[l.skuId]??0),0);return count<l.quantity?[`${l.name}: cần ${l.quantity}, khả dụng ${count}, thiếu ${l.quantity-count}.`]:[];});
 const reasons=plan?[]:shortages.length?shortages:['Chưa có kho/cặp kho đủ hàng và đạt SLA 24 giờ theo bảng thời gian của vùng, giờ xử lý và hàng chờ. Không tự hạ ETA để xác nhận.'];
 const hash=digest({input:{draftId:input.draftId??null,city:input.city,address:input.address,lines:requested},lines,plan,shippingFee});return{lines,plan,goods,shippingFee,total:shippingFee===null?null:goods+shippingFee,reasons,hash};
}
export async function checkoutQuote(raw:unknown){const input=quoteInput.parse(raw);const q=await db.$transaction(tx=>calculate(tx,input),{isolationLevel:'RepeatableRead',timeout:20000});return{...q,hash:undefined,quote:q.plan?token(q.hash):null,policy:'DOM-REGION-V3',expiresInSeconds:300};}
export async function createCheckout(actorId:string,key:string,raw:unknown){
 const p=checkoutInput.parse(raw);validateLines(p);if(!p.newCustomer&&!p.customerId)throw new DomainError('Chọn khách hàng hoặc nhập khách mới.',422);
 return command(actorId,key,p.mode==='confirm'?'TAO_VA_XAC_NHAN':'TAO_NHAP_MOI','DON_HANG',p.draftId??key,p,async tx=>{
  const existing=p.draftId?await tx.order.findUnique({where:{id:p.draftId},include:{shipments:true,transactions:true}}):null;
  if(p.draftId&&(!existing||!['NHAP','CHO_HANG'].includes(existing.status)||existing.version!==p.version||existing.shipments.length||existing.transactions.some(t=>t.kind==='THU'&&t.status!=='THAT_BAI')))throw new DomainError('Đơn nháp đã thay đổi hoặc có thu tiền. Tải lại trước khi sửa/xác nhận.');
  // Consistent lock order; serializable retry cannot silently substitute a different quote.
  await lockAllocationStock(tx,p.lines.map(l=>l.skuId));
  const q=await calculate(tx,p);if(p.mode==='confirm'){if(!q.plan)throw new DomainError(q.reasons.join(' ')+' Chưa tạo đơn hoặc giữ hàng.',409);verify(p.quote,q.hash);}
  let customerId=p.customerId;
  if(p.newCustomer){const c=await tx.customer.create({data:{id:await nextCustomerId(tx),name:p.recipient,phone:p.phone,address:p.address,city:p.city}});customerId=c.id;}
  else{const c=await tx.customer.findUnique({where:{id:customerId!}});if(!c)throw new DomainError('Khách hàng không tồn tại.',422);if(!c.city&&c.address===p.address)await tx.customer.update({where:{id:c.id},data:{city:p.city}});}
  const at=new Date(),id=existing?.id??p.orderId??issueDocumentCode('DH',at);/* storefront orders keep the order code the buyer already sees */const shipping=p.mode==='confirm'?q.shippingFee!:q.shippingFee??0;
  if(existing)await tx.orderLine.deleteMany({where:{orderId:id}});
  const data={shippingPolicy:'SUM_FREIGHT_V1',customerId:customerId!,channel:p.channel,externalId:p.externalId??null,storefrontRecoveryHash:p.storefrontRecoveryHash??existing?.storefrontRecoveryHash??null,recipient:p.recipient,phone:p.phone,address:p.address,region:p.city+'-NOITHANH',paymentMethod:p.paymentMethod,shippingFee:new Prisma.Decimal(shipping),status:p.mode==='confirm'?'DA_XAC_NHAN' as const:'NHAP' as const,confirmedAt:p.mode==='confirm'?at:null,deadline:existing?.deadline??new Date(at.getTime()+24*3600000),reason:null,lines:{create:q.lines.map(l=>({skuId:l.skuId,nameSnapshot:l.name,priceSnapshot:l.price,quantity:l.quantity}))}};
  const order=existing?await tx.order.update({where:{id},data:{...data,version:{increment:1}},include:{lines:true}}):await tx.order.create({data:{id,...data,createdById:actorId,createdAt:at},include:{lines:true}});
  if(p.mode==='confirm')for(const [index,parcel]of q.plan!.parcels.entries()){
   const evidence:AllocationPlan={...q.plan!,parcels:q.plan!.parcels.map(pa=>({...pa,items:pa.items.map(item=>({...item,lineId:order.lines.find(l=>l.skuId===item.skuId)!.id}))}))};
   const goods=parcel.items.reduce((n,l)=>n+l.quantity*q.lines.find(x=>x.skuId===l.skuId)!.price,0);
   const shipment=await tx.shipment.create({data:{orderId:id,warehouseId:parcel.warehouseId,freight:parcel.freight,packingFee:parcel.packing,eta:new Date(at.getTime()+parcel.etaHours*3600000),allocationEvidence:JSON.parse(JSON.stringify(evidence)),codAmount:p.paymentMethod==='COD'?goods+(index===0?shipping:0):0,updatedById:actorId,lines:{create:parcel.items.map(l=>({orderLineId:order.lines.find(x=>x.skuId===l.skuId)!.id,quantity:l.quantity}))}}});
   for(const item of [...parcel.items].sort((a,b)=>a.skuId.localeCompare(b.skuId)))await moveStock(tx,{warehouseId:parcel.warehouseId,skuId:item.skuId,kind:'GIU',deltas:{sellable:0,reserved:item.quantity,qc:0,quarantined:0},documentType:'KIEN_HANG',documentId:shipment.id,reason:'Tạo đơn và xác nhận',actorId,key:key+':'+shipment.id+':'+item.skuId,at});
  }
  // Prepaid checkout paid through the (simulated) payment gateway: the receipt is recorded with the order, no manual collection step.
  if(p.mode==='confirm'&&p.paymentMethod==='TRA_TRUOC'&&p.paidOnline)await tx.moneyTransaction.create({data:{orderId:id,kind:'THU',reason:'THU_TRA_TRUOC',note:'Khách thanh toán qua cổng khi đặt hàng (mô phỏng)',amount:q.goods+shipping,source:'CHUYEN_KHOAN',reference:'CTT-'+id,status:'THANH_CONG',idempotencyKey:key+':pay',recordedById:actorId,approvedById:actorId,confirmedAt:at}});
  return{id,customerId:customerId!,status:order.status,shippingFee:shipping,parcels:p.mode==='confirm'?q.plan!.parcels.length:0};
 });
}

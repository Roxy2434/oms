// ShopVui storefront integration: the storefront sells this store's SKUs; its orders land in OMS (channel SHOPVUI)
// and OMS fulfillment status flows back. The storefront never touches the DB directly.
import {randomBytes,createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {hash} from 'argon2';
import {z} from 'zod';
import {db} from '@/server/db';
import {DomainError} from '@/server/commands';
import {checkoutQuote,createCheckout} from '@/domain/orders/checkout';
import {orderCommand} from '@/domain/orders/lifecycle';
import {paymentCommand} from '@/domain/payments/service';
import {moneyPosition,causeAmount} from '@/domain/payments/balances';
import {returnCommand} from '@/domain/returns/service';
import {effectiveValue} from '@/domain/dashboard/queries';
import {sepayConfig,prepaidDue,qrUrl,payCode} from '@/domain/payments/sepay';

// Same split as ShopVui's own shipping table; OMS prices/allocates for HN, DN, HCM, so other provinces use their region's city.
const NORTH=['Hà Nội','Hải Phòng','Bắc Ninh','Cao Bằng','Điện Biên','Hưng Yên','Lai Châu','Lạng Sơn','Lào Cai','Ninh Bình','Phú Thọ','Quảng Ninh','Sơn La','Thái Nguyên','Tuyên Quang'];
const CENTRAL=['Đà Nẵng','Huế','Hà Tĩnh','Nghệ An','Thanh Hóa','Quảng Trị','Quảng Ngãi','Gia Lai','Khánh Hòa','Đắk Lắk','Lâm Đồng'];
export const cityOf=(province:string)=>NORTH.includes(province)?'HN' as const:CENTRAL.includes(province)?'DN' as const:'HCM' as const;

const address=z.object({province:z.string().trim().min(2).max(60),ward:z.string().trim().max(120).default(''),detail:z.string().trim().min(2).max(300)});
const items=z.array(z.object({sku:z.string().min(1).max(80),qty:z.number().int().min(1).max(5)})).min(1).max(5);
const quoteInput=z.object({address,items});
const orderInput=z.object({replayOnly:z.boolean().optional(),token:z.string().max(64).optional(),recoveryKey:z.string().min(32).max(128).optional(),orderId:z.string().trim().min(1).max(80),name:z.string().trim().min(2).max(120),phone:z.string().regex(/^[0-9+ ()-]{8,20}$/),address,items,payment:z.enum(['cod','wallet','bank'])});
const refInput=z.object({orderId:z.string().trim().min(1).max(80),token:z.string().max(64).default('')});
const text=(a:z.infer<typeof address>)=>[a.detail,a.ward,a.province].filter(Boolean).join(', ');
const lines=(list:z.infer<typeof items>)=>list.map(i=>({skuId:i.sku,quantity:i.qty}));

/** The storefront key ships in public JS, so it only identifies the storefront. Acting on an existing order (pay, cancel,
 * return, read status) also needs this per-order token, handed only to the browser that placed the order. */
export function orderToken(orderId:string){const secret=process.env.SESSION_SECRET;if(!secret)throw Error('SESSION_SECRET required');return createHmac('sha256',secret).update('shopvui-order:'+orderId).digest('base64url').slice(0,32);}
function owns(orderId:string,token:string){const want=Buffer.from(orderToken(orderId)),got=Buffer.from(token);return got.length===want.length&&timingSafeEqual(got,want);}
function ownRef<T extends {orderId:string;token:string}>(r:T){if(!owns(r.orderId,r.token))throw new DomainError('Không có quyền thao tác trên đơn này.',403);return r;}

/** Unpaid bank-transfer orders hold stock; after this window OMS cancels them and releases the stock (like a payment gateway's expiry). */
export const PAY_MINUTES=10;
/** Presentation switch (.env SHOPVUI_DEMO_PAY=1): the payment page shows "Đã thanh toán (demo)", which records the receipt
 * without real money, clearly marked DEMO. Off by default: with it on, a buyer can mark their own order paid. Real SePay
 * transfers keep working either way. */
export const demoPayEnabled=()=>process.env.SHOPVUI_DEMO_PAY==='1';
export const EXPIRED_REASON='ShopVui: quá hạn thanh toán chuyển khoản ('+PAY_MINUTES+' phút)';
const payBy=(o:{confirmedAt:Date|null})=>o.confirmedAt?new Date(o.confirmedAt.getTime()+PAY_MINUTES*60000).toISOString():null;

/** The storefront's system user: every ShopVui order is recorded as created by it (audit); its password is random and never shown, so it cannot log in. */
async function actor(){return db.account.upsert({where:{username:'shopvui'},update:{},create:{username:'shopvui',name:'Kênh ShopVui (tích hợp)',role:'NHAN_VIEN',passwordHash:await hash(randomBytes(32).toString('hex'))}});}
/** ShopVui and OMS share one order code (DH-...): the storefront issues it, OMS stores it as the order id. */
async function find(orderId:string){return db.order.findFirst({where:{id:orderId,channel:'SHOPVUI'},include:{shipments:{include:{lines:true}},transactions:true,lines:true}});}
/** Prepaid state for the storefront: paid = the bank/gateway money fully arrived; qr = what to scan for the rest (SePay on). */
function payment(o:Parameters<typeof prepaidDue>[0]&{id:string;paymentMethod:string;confirmedAt:Date|null;transactions:Parameters<typeof moneyPosition>[0]}):{paid?:boolean;qr?:{url:string;amount:number;note:string;account:string;bankName:string;holder:string;payBy:string|null;demo:boolean}}{
 if(o.paymentMethod!=='TRA_TRUOC')return {};
 const due=prepaidDue(o),cfg=sepayConfig(),paid=Number(effectiveValue(o))>0&&moneyPosition(o.transactions).net>=Number(effectiveValue(o));
 return {paid,...(cfg&&due>0&&o.status==='DA_XAC_NHAN'?{qr:{url:qrUrl(cfg,o.id,due),amount:due,note:payCode(o.id),account:cfg.account,bankName:cfg.bankName,holder:cfg.holder,payBy:payBy(o),demo:demoPayEnabled()}}:{})};
}

/** Live price and sellable quantity (ATP summed over active warehouses) so the storefront never oversells. */
export async function catalog(){
 const skus=await db.sku.findMany({where:{active:true},orderBy:{id:'asc'},include:{inventory:{where:{warehouse:{active:true}}}}});
 return {products:skus.map(s=>({sku:s.id,name:s.name+(s.variant?' — '+s.variant:''),price:Number(s.price),available:s.inventory.reduce((n,i)=>n+Math.max(0,i.sellable-i.reserved-i.safety),0)}))};
}
export async function quote(raw:unknown){
 const p=quoteInput.parse(raw);const q=await checkoutQuote({city:cityOf(p.address.province),address:text(p.address),lines:lines(p.items)});
 return {ok:q.shippingFee!==null,shippingFee:q.shippingFee,goods:q.goods,total:q.total,parcels:q.plan?.parcels.length??0,reasons:q.reasons};
}

export async function placeOrder(raw:unknown){
 const p=orderInput.parse(raw);const existing=await find(p.orderId);
 if(existing){
  const recovery=p.recoveryKey?createHash('sha256').update(p.recoveryKey).digest('hex'):null;
  const recovered=!!recovery&&!!existing.storefrontRecoveryHash&&timingSafeEqual(Buffer.from(recovery),Buffer.from(existing.storefrontRecoveryHash));
  if(!owns(p.orderId,p.token??'')&&!recovered)throw new DomainError('Cần token đơn hoặc khóa khôi phục bí mật đã lưu khi đặt. Thông tin đơn không đủ để cấp lại quyền.',403);
  const same=existing.phone===p.phone&&existing.lines.length===p.items.length&&p.items.every(i=>existing.lines.some(l=>l.skuId===i.sku&&l.quantity===i.qty));
  if(!same)throw new DomainError('Mã đơn hàng này đã được dùng cho một đơn khác.',409);
  return {orderId:existing.id,shippingFee:Number(existing.shippingFee),replay:true,token:orderToken(p.orderId),...payment(existing)};
 }
 // replayOnly: the storefront recovering the token of an order it placed earlier must never create a new order.
 if(p.replayOnly)throw new DomainError('EZMART không có đơn này.',404);
 // The storefront issues the order code (OMS format) before sending, so a retried request finds the same order instead of creating a second one.
 if(!/^DH-\d{6}-[0-9A-F]{6}$/.test(p.orderId))throw new DomainError('Mã đơn hàng phải có dạng DH-YYMMDD-XXXXXX.',422);
 if(await db.order.findUnique({where:{id:p.orderId},select:{id:true}}))throw new DomainError('Mã đơn hàng '+p.orderId+' đã tồn tại. Vui lòng đặt lại.',409);
 const city=cityOf(p.address.province),addr=text(p.address);
 const q=await checkoutQuote({city,address:addr,lines:lines(p.items)});if(!q.quote)throw new DomainError(q.reasons.join(' ')||'Chưa xếp được kho cho đơn này.',409);
 const customer=await db.customer.findFirst({where:{phone:p.phone},orderBy:{createdAt:'asc'}});
 const me=await actor();
 const r=await createCheckout(me.id,'shopvui:'+p.orderId,{orderId:p.orderId,city,address:addr,lines:lines(p.items),...(customer?{customerId:customer.id}:{newCustomer:true}),recipient:p.name,phone:p.phone,channel:'SHOPVUI',storefrontRecoveryHash:p.recoveryKey?createHash('sha256').update(p.recoveryKey).digest('hex'):undefined,paymentMethod:p.payment==='cod'?'COD':'TRA_TRUOC',paidOnline:p.payment==='wallet',quote:q.quote});
 return {orderId:r.id,shippingFee:r.shippingFee,parcels:r.parcels,replay:false,token:orderToken(p.orderId),...payment((await find(p.orderId))!)};
}

/** Buyer finished the bank transfer on ShopVui: record the prepaid receipt for what is still due. */
export async function pay(raw:unknown){
 // With real transfers on, only the bank (via SePay) can say the money arrived, unless the demo switch is on.
 const demo=!!sepayConfig();
 if(demo&&!demoPayEnabled())throw new DomainError('Chuyển khoản do ngân hàng xác nhận tự động qua SePay, không ghi tay được.',403);
 const {orderId}=ownRef(refInput.parse(raw));const o=await find(orderId);if(!o)throw new DomainError('EZMART không có đơn này.',404);
 const due=prepaidDue(o);
 if(due<=0)return {orderId:o.id,paid:0};
 const me=await actor();
 await paymentCommand(me.id,'shopvui-pay:'+orderId,o.id,{action:'record',kind:'THU',reason:'THU_TRA_TRUOC',amount:due,source:'CHUYEN_KHOAN',reference:(demo?'DEMO-':'SV-')+orderId,note:demo?'DEMO trình diễn: bấm "Đã thanh toán (demo)" trên ShopVui, không có tiền thật':'Khách chuyển khoản trên ShopVui (mô phỏng)',status:'THANH_CONG'});
 return {orderId:o.id,paid:due};
}

export async function cancel(raw:unknown){
 const p=ownRef(refInput.extend({reason:z.string().trim().min(3).max(200)}).parse(raw));const o=await find(p.orderId);if(!o)throw new DomainError('EZMART không có đơn này.',404);
 const me=await actor();
 if(o.status!=='DA_HUY')await orderCommand(me.id,'shopvui-cancel:'+p.orderId,o.id,{action:'cancel',reason:'ShopVui: '+p.reason});
 // Paid with the ShopVuiPay wallet (simulated gateway): refund to the wallet at once, as the storefront tells the buyer.
 // Real bank transfers are refunded by staff (dashboard queue "Đơn hủy còn tiền phải hoàn"). Runs on replay too, so a lost refund is retried.
 const fresh=(await find(p.orderId))!;const refundable=moneyPosition(fresh.transactions).available;
 if(refundable>0&&fresh.transactions.some(t=>t.reference==='CTT-'+fresh.id&&t.status==='THANH_CONG'))
  await paymentCommand(me.id,'shopvui-cancel-refund:'+p.orderId,fresh.id,{action:'record',kind:'HOAN',reason:'HOAN_HUY',amount:refundable,source:'CHUYEN_KHOAN',reference:'HTV-'+fresh.id,note:'Hoàn về Ví ShopVuiPay khi khách hủy đơn (mô phỏng)',status:'THANH_CONG'});
 return {orderId:o.id,refunded:refundable>0};
}

export type ShopVuiStatus={orderId:string;status:'TO_SHIP'|'SHIPPING'|'COMPLETED'|'CANCELLED';stage:'confirmed'|'packed'|'shipping'|'failed'|'delivered'|'cancelled'|'returned';tracking:string[];deliveredAt:string|null;note:string;returnedParcels:number};
/** Maps OMS fulfillment state to the storefront's order states. Several parcels: the least advanced one wins;
 * parcels sent back to the warehouse only cancel the order when EVERY parcel came back (a split order may be partly delivered). */
export function storefrontStatus(o:{id:string;status:string;reason?:string|null;shipments:{status:string;trackingCode:string|null;deliveredAt:Date|null}[]}):ShopVuiStatus{
 const live=o.shipments.filter(s=>s.status!=='HUY'),tracking=live.map(s=>s.trackingCode).filter((t):t is string=>!!t);
 const back=live.filter(s=>['CHUYEN_HOAN','DA_NHAN_HOAN'].includes(s.status)),forward=live.filter(s=>!back.includes(s));
 const base={orderId:o.id,tracking,deliveredAt:null as string|null,returnedParcels:back.length};
 if(o.status==='DA_HUY'||!live.length)return {...base,status:'CANCELLED',stage:'cancelled',note:o.reason===EXPIRED_REASON?'Đơn đã tự hủy vì quá hạn thanh toán chuyển khoản':'Đơn đã hủy trên EZMART'};
 if(!forward.length)return {...base,status:'CANCELLED',stage:'returned',note:'Giao không thành công, hàng được chuyển hoàn về kho'};
 const part=back.length?` (${back.length}/${live.length} kiện giao không thành công, đã chuyển hoàn về kho)`:'';
 const has=(...st:string[])=>forward.some(s=>st.includes(s.status));
 if(has('DANG_GIU'))return {...base,status:'TO_SHIP',stage:'confirmed',note:'Kho đã giữ hàng và đang chuẩn bị'+part};
 if(has('CHO_BAN_GIAO'))return {...base,status:'TO_SHIP',stage:'packed',note:'Đã đóng gói, chờ bàn giao cho đơn vị vận chuyển'+part};
 if(has('GIAO_THAT_BAI'))return {...base,status:'SHIPPING',stage:'failed',note:'Giao chưa thành công, đơn vị vận chuyển sẽ liên hệ lại'+part};
 if(has('DANG_GIAO'))return {...base,status:'SHIPPING',stage:'shipping',note:'Đơn vị vận chuyển đang giao'+part};
 const last=forward.map(s=>s.deliveredAt?.getTime()??0).reduce((a,b)=>Math.max(a,b),0);
 return {...base,status:'COMPLETED',stage:'delivered',deliveredAt:last?new Date(last).toISOString():null,note:'Giao hàng thành công'+part};
}
/** Buyer asks to return a delivered ShopVui order: one RMA per source warehouse (an RMA is received at one warehouse),
 * auto-approved inside OMS's 7-day policy; later requests wait for staff approval. Same request replays, never duplicates.
 * `items` picks which SKUs and how many (omitted = everything delivered); note + up to 3 photos are the buyer's evidence. */
const PHOTO_MAX=1_500_000;
const photoInput=z.string().max(2_100_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,'Ảnh phải là JPEG, PNG hoặc WebP');
/** Decodes a data URL and checks the bytes really are the declared image type (the storefront is untrusted input). */
export function decodePhoto(url:string){
 const comma=url.indexOf(','),mime=url.slice(5,comma-7),data=Buffer.from(url.slice(comma+1),'base64');
 if(!data.length||data.length>PHOTO_MAX)throw new DomainError('Mỗi ảnh tối đa 1,5 MB.',422);
 const ok=mime==='image/jpeg'?data[0]===0xff&&data[1]===0xd8&&data[2]===0xff:mime==='image/png'?data.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])):data.subarray(0,4).toString('latin1')==='RIFF'&&data.subarray(8,12).toString('latin1')==='WEBP';
 if(!ok)throw new DomainError('Tệp ảnh không đúng định dạng.',422);
 return {mime,data};
}
export async function requestReturn(raw:unknown){
 const p=ownRef(refInput.extend({reason:z.string().trim().min(3).max(200),note:z.string().trim().max(500).optional(),items:z.array(z.object({sku:z.string().min(1).max(80),qty:z.number().int().min(1).max(5)})).min(1).max(10).optional(),photos:z.array(photoInput).max(3).default([])}).parse(raw));
 const photos=p.photos.map(decodePhoto);
 const o=await db.order.findFirst({where:{id:p.orderId,channel:'SHOPVUI'},include:{shipments:{where:{status:'DA_GIAO'},include:{lines:{include:{orderLine:true}}}}}});
 if(!o)throw new DomainError('EZMART không có đơn này.',404);if(!o.shipments.length)throw new DomainError('Đơn chưa có kiện đã giao để trả.',409);
 // Spread each requested SKU quantity over the delivered parcel lines that carry it (a SKU may ship from 2 warehouses).
 const picked=new Map<string,{shipmentLineId:string;quantity:number}[]>(),need=new Map<string,number>();
 for(const i of p.items??[])need.set(i.sku,(need.get(i.sku)??0)+i.qty);
 for(const s of o.shipments)for(const l of s.lines){const want=p.items?need.get(l.orderLine.skuId)??0:l.quantity,take=Math.min(want,l.quantity);if(!take)continue;
  if(p.items)need.set(l.orderLine.skuId,want-take);picked.set(s.warehouseId,[...(picked.get(s.warehouseId)??[]),{shipmentLineId:l.id,quantity:take}]);}
 const over=[...need].find(([,n])=>n>0);if(over)throw new DomainError('Số lượng trả của '+over[0]+' vượt số đã giao.',422);
 if(!picked.size)throw new DomainError('Chọn ít nhất một sản phẩm để trả.',422);
 const me=await actor(),chosen=o.shipments.filter(s=>picked.has(s.warehouseId));
 const late=chosen.some(s=>s.deliveredAt&&Date.now()-s.deliveredAt.getTime()>7*86400000);
 // Keyed by the whole request: the same submit replays, a later different request (e.g. the other unit) becomes its own RMA.
 const tag=':'+createHash('sha256').update(JSON.stringify([[...picked].sort(),p.reason,p.note??'',p.photos])).digest('hex').slice(0,16);
 const created=[];
 for(const [warehouseId,lines] of picked){
  const r=await returnCommand(me.id,'shopvui-return:'+p.orderId+':'+warehouseId+tag,'new',{action:'create',orderId:o.id,warehouseId,kind:'KHACH_TRA',reason:'ShopVui: '+p.reason,...(p.note?{note:p.note}:{}),autoApprove:true,...(late?{lateReason:'Khách gửi yêu cầu qua ShopVui sau 7 ngày, chờ cửa hàng duyệt'}:{}),lines}) as {id:string};
  created.push(r.id);
  // Lock the RMA before testing/inserting evidence: parallel retries cannot attach photos twice.
  if(photos.length)await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "HO_SO_TRA" WHERE id=${r.id} FOR UPDATE`;if(!await tx.returnPhoto.count({where:{returnId:r.id}}))await tx.returnPhoto.createMany({data:photos.map(x=>({returnId:r.id,mime:x.mime,data:x.data}))});});
 }
 const cases=await db.returnCase.findMany({where:{id:{in:created}},select:{code:true,trackingCode:true,status:true}});
 return {returns:cases};
}

const returnStage=(st:string[])=>st.every(x=>x==='TU_CHOI')?'rejected':st.some(x=>x==='CHO_DUYET')?'requested':st.some(x=>x==='CHO_NHAN')?'approved':st.some(x=>['CHO_QC','CHO_HOAN_TIEN'].includes(x))?'inspecting':'closed';
/** refs: (orderId, token) pairs; refs whose token does not match are ignored, so nobody reads orders they did not place. */
export async function statuses(refs:{orderId:string;token:string}[]){
 const list=[...new Set(refs.slice(0,100).filter(r=>owns(r.orderId,r.token)).map(r=>r.orderId))];
 const all=await db.order.findMany({where:{channel:'SHOPVUI',id:{in:list}},select:{id:true,status:true,reason:true,confirmedAt:true,paymentMethod:true,shippingFee:true,lines:{select:{id:true,quantity:true,priceSnapshot:true}},shipments:{select:{status:true,trackingCode:true,deliveredAt:true,handedOverAt:true,lines:{select:{orderLineId:true,quantity:true}}}},transactions:true,returns:{select:{id:true,kind:true,code:true,trackingCode:true,status:true}}}});
 const orders=all.map(o=>({...o,returns:o.returns.filter(r=>r.kind==='KHACH_TRA'),senderReturns:o.returns.filter(r=>r.kind==='CHUYEN_HOAN')}));
 return {orders:orders.map(o=>({...storefrontStatus(o),...payment(o),
  // Every successful refund of this order (cancel, return, sender return), net of compensations: ShopVui credits it to the buyer's ShopVuiPay wallet.
  refunded:causeAmount(o.transactions,'HOAN',root=>root.kind==='HOAN'),
  // Milestone times, so the storefront can record steps it skipped between two syncs at the time they really happened.
  confirmedAt:o.confirmedAt?.toISOString()??null,
  handedOverAt:o.shipments.map(s=>s.handedOverAt?.getTime()??0).filter(Boolean).sort((a,b)=>a-b).map(t=>new Date(t).toISOString())[0]??null,
  // Parcels the carrier brought back: what OMS refunded for them (after receiving them) and whether that is still open.
  rtsRefunded:causeAmount(o.transactions,'HOAN',t=>t.reason==='HOAN_RMA'&&o.senderReturns.some(r=>r.id===t.returnId)),
  rtsOpen:o.senderReturns.some(r=>!['DA_DONG','TU_CHOI'].includes(r.status)),
  // Return progress for the storefront: RMA codes + return waybills, stage, and what was actually refunded.
  ...(o.returns.length?{rma:{stage:returnStage(o.returns.map(r=>r.status)),cases:o.returns.map(r=>({code:r.code,trackingCode:r.trackingCode,status:r.status})),refunded:causeAmount(o.transactions,'HOAN',t=>t.reason==='HOAN_RMA'&&o.returns.some(r=>r.id===t.returnId))}}:{})})),
  // Orders the caller proved it owns (valid token) but OMS no longer has, e.g. after the OMS database was rebuilt: the storefront drops them.
  missing:list.filter(id=>!all.some(o=>o.id===id))};
}

/** Cancels ShopVui bank-transfer orders still unpaid after PAY_MINUTES and releases their stock. unpaidOnly makes the cancel
 * re-check inside the order lock, so a transfer that lands at the last second is never cancelled away. */
export async function expireUnpaidTransfers(now=new Date()){
 const due=await db.order.findMany({where:{channel:'SHOPVUI',paymentMethod:'TRA_TRUOC',status:'DA_XAC_NHAN',confirmedAt:{lt:new Date(now.getTime()-PAY_MINUTES*60000)},transactions:{none:{kind:'THU',status:{not:'THAT_BAI'}}},shipments:{none:{handedOverAt:{not:null}}}},select:{id:true},orderBy:{confirmedAt:'asc'},take:50});// oldest first; the next minute takes the rest
 const expired:string[]=[];if(!due.length)return {expired};
 const me=await actor();
 for(const o of due){
  try{await orderCommand(me.id,'shopvui-expire:'+o.id,o.id,{action:'cancel',reason:EXPIRED_REASON,unpaidOnly:true});expired.push(o.id);}
  catch(e){if(!(e instanceof DomainError))throw e;}
 }
 return {expired};
}
/** Started once per server process from instrumentation.ts: checks every minute. */
export function startPaymentExpiry(everyMs=60000){
 const g=globalThis as {paymentExpiry?:boolean};if(g.paymentExpiry)return;g.paymentExpiry=true;
 let busy=false;setInterval(async()=>{if(busy)return;busy=true;try{const r=await expireUnpaidTransfers();if(r.expired.length)console.log('ShopVui: tự hủy',r.expired.length,'đơn quá hạn thanh toán:',r.expired.join(', '));}catch(e){console.error('ShopVui expiry:',e instanceof Error?e.message:e);}finally{busy=false;}},everyMs);
}

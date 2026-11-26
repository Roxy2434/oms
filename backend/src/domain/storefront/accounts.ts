import {hash,verify} from 'argon2';
import {z} from 'zod';
import {db} from '@/server/db';
import {DomainError} from '@/server/commands';
import {OPENING_BALANCE} from './wallet';
import {passwordWork} from '@/server/password-work';
import {orderToken,statuses} from '@/domain/integrations/shopvui';
import {causeAmount} from '@/domain/payments/balances';
const phone=/^(0|\+84)(3|5|7|8|9)\d{8}$/;
const password=z.string().min(8).max(16).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,'Mật khẩu phải có chữ hoa, chữ thường và số.');
const username=z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{4,20}$/,'Tên đăng nhập gồm 4–20 chữ, số, dấu _ hoặc .').refine(v=>!phone.test(v),'Không dùng số điện thoại làm tên đăng nhập; nhập số ở ô liên hệ.');
const contact=z.string().trim().toLowerCase().max(200).refine(v=>phone.test(v)||z.email().safeParse(v).success,'Email/Số điện thoại không hợp lệ.');
export async function registerShop(raw:unknown){
 const p=z.object({username,contact,password}).parse(raw),isEmail=p.contact.includes('@');
 const passwordHash=await passwordWork(()=>hash(p.password));
 try{return await db.$transaction(async tx=>{
  const u=await tx.shopAccount.create({data:{username:p.username,email:isEmail?p.contact:null,phone:isEmail?null:p.contact,name:p.username,passwordHash,balance:OPENING_BALANCE}});
  await tx.shopWalletEntry.create({data:{accountId:u.id,key:'open:'+u.id,kind:'OPEN',amount:OPENING_BALANCE,note:'Ưu đãi mở tài khoản thành viên mới: 6.000.000₫'}});
  return {id:u.id,sessionVersion:u.sessionVersion};
 });}catch(e){if((e as {code?:string}).code==='P2002')throw new DomainError('Tên đăng nhập hoặc Email/Số điện thoại đã được đăng ký.',409);throw e;}
}
// Nonexistent accounts still pay the password-hash verification cost.
const dummy=hash('NotARealShopAccount9');
export async function loginShop(raw:unknown){
 const p=z.object({identifier:z.string().trim().toLowerCase().min(1).max(200),password:z.string().min(1).max(128)}).parse(raw);
 const users=await db.shopAccount.findMany({where:{OR:[{username:p.identifier},{email:p.identifier},{phone:p.identifier}]},take:2});const u=users.length===1?users[0]:null;
 const dummyHash=u?.passwordHash??await dummy;const ok=await passwordWork(()=>verify(dummyHash,p.password));
 if(!u?.active||!ok)throw new DomainError('Tên tài khoản hoặc mật khẩu không đúng.',401);
 return {id:u.id,sessionVersion:u.sessionVersion};
}
const address=z.object({id:z.string().min(1).max(80),name:z.string().trim().min(2).max(120),phone:z.string().regex(phone),province:z.enum(['TP. Hồ Chí Minh','Hà Nội','Đà Nẵng']),ward:z.string().trim().min(1).max(120),detail:z.string().trim().min(3).max(500),type:z.enum(['home','office']).default('home'),isDefault:z.boolean()});
export async function saveAddresses(accountId:string,raw:unknown){
 const p=z.object({addresses:z.array(address).max(30)}).parse(raw);
 if(new Set(p.addresses.map(a=>a.id)).size!==p.addresses.length||p.addresses.filter(a=>a.isDefault).length>1)throw new DomainError('Danh sách địa chỉ không hợp lệ.',422);
 await db.shopAccount.update({where:{id:accountId},data:{addresses:p.addresses}});
}
export async function updateShopProfile(accountId:string,raw:unknown){
 const p=z.object({name:z.string().trim().min(2).max(120),email:z.union([z.literal(''),z.email().max(200)]),phone:z.union([z.literal(''),z.string().regex(phone)]),gender:z.enum(['','male','female','other']),birthday:z.string().max(10).refine(v=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v))}).parse(raw);
 try{await db.shopAccount.update({where:{id:accountId},data:{...p,email:p.email.toLowerCase()||null,phone:p.phone||null}});}catch(e){if((e as {code?:string}).code==='P2002')throw new DomainError('Email/Số điện thoại đã được sử dụng.',409);throw e;}
}
export async function changeShopPassword(accountId:string,raw:unknown){
 const p=z.object({old:z.string().min(1).max(128),new:password}).parse(raw),u=await db.shopAccount.findUniqueOrThrow({where:{id:accountId}});
 if(!await passwordWork(()=>verify(u.passwordHash,p.old)))throw new DomainError('Mật khẩu hiện tại không đúng.',422);
 const passwordHash=await passwordWork(()=>hash(p.new));
 const changed=await db.shopAccount.updateMany({where:{id:accountId,sessionVersion:u.sessionVersion,passwordHash:u.passwordHash},data:{passwordHash,sessionVersion:{increment:1}}});
 if(changed.count!==1)throw new DomainError('Tài khoản vừa thay đổi, hãy đăng nhập lại.',409);
 return {id:u.id,sessionVersion:u.sessionVersion+1};
}
/** Only successful refunds of SIMULATED wallet purchases can credit the simulated wallet; bank/COD refunds never do. */
async function reconcileWallet(accountId:string){
 await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "SHOP_TAI_KHOAN" WHERE id=${accountId} FOR UPDATE`;
  const purchases=await tx.shopPurchase.findMany({where:{accountId,payment:'wallet'},include:{order:{include:{transactions:true}}}});
  for(const p of purchases){
   const total=Math.min(p.charged,causeAmount(p.order.transactions,'HOAN',t=>t.kind==='HOAN'));
   const delta=total-p.refunded;if(delta<=0)continue;
   await tx.shopWalletEntry.create({data:{accountId,key:'refund:'+p.orderId+':'+total,kind:'REFUND',amount:delta,orderId:p.orderId,note:'Hoàn tiền đơn hàng '+p.orderId}});
   await tx.shopAccount.update({where:{id:accountId},data:{balance:{increment:delta}}});
   await tx.shopPurchase.update({where:{orderId:p.orderId},data:{refunded:total}});
  }
 });
}
export async function shopState(accountId:string){
 await reconcileWallet(accountId);
 const u=await db.shopAccount.findUniqueOrThrow({where:{id:accountId}});
 const purchases=await db.shopPurchase.findMany({where:{accountId},orderBy:{createdAt:'desc'},include:{order:{include:{lines:true,shipments:true,transactions:true,returns:true}}}});
 const refs=purchases.map(p=>({orderId:p.orderId,token:orderToken(p.orderId)}));
 const states:Awaited<ReturnType<typeof statuses>>['orders']=[];
 for(let i=0;i<refs.length;i+=100)states.push(...(await statuses(refs.slice(i,i+100))).orders);
 const orders=purchases.map(p=>{
  const s=states.find(s=>s.orderId===p.orderId)!,o=p.order,paid=p.payment==='wallet'||s.paid===true,at=o.createdAt.toISOString();
  const a=(u.addresses as unknown as z.infer<typeof address>[]).find(a=>a.phone===o.phone&&o.address.includes(a.detail));
  return {id:o.id,code:o.id,userId:u.id,server:true,shopId:'oms',shopName:'EZMART',items:o.lines.map(l=>({productId:'oms-'+l.skuId,name:l.nameSnapshot,image:'',emoji:'📦',variant:'',price:Number(l.priceSnapshot),originalPrice:Number(l.priceSnapshot),qty:l.quantity})),
   address:{name:o.recipient,phone:o.phone,province:a?.province??(o.region.startsWith('HN')?'Hà Nội':o.region.startsWith('DN')?'Đà Nẵng':'TP. Hồ Chí Minh'),ward:a?.ward??'',detail:a?.detail??o.address},
   shipping:{id:'oms',name:'Giao từ kho EZMART',fee:Number(o.shippingFee),etaFrom:at,etaTo:o.deadline?.toISOString()??at},note:'',payment:{method:p.payment,label:p.payment==='wallet'?'Ví ShopVuiPay':p.payment==='bank'?'Chuyển khoản ngân hàng (SePay)':'Thanh toán khi nhận hàng (COD)',paid},
   amounts:{subtotal:o.lines.reduce((n,l)=>n+Number(l.priceSnapshot)*l.quantity,0),shopDiscount:0,platformDiscount:0,shipping:Number(o.shippingFee),shipDiscount:0,total:p.charged},vouchers:{},
   status:s.status==='CANCELLED'?'CANCELLED':s.rma?'RETURN':p.payment==='bank'&&!paid?'UNPAID':s.status,confirmed:s.stage!=='confirmed',reviewed:false,
   history:[{code:'PLACED',text:'Đơn đã chuyển tới EZMART',at},...(paid?[{code:'PAID',text:p.payment==='wallet'?'Đã thanh toán qua Ví ShopVuiPay':'SePay đã xác nhận chuyển khoản',at:o.transactions.find(t=>t.kind==='THU'&&t.status==='THANH_CONG')?.confirmedAt?.toISOString()??at}]:[]),...(o.confirmedAt?[{code:'CONFIRMED',text:'EZMART đã xác nhận và giữ hàng',at:o.confirmedAt.toISOString()}]:[]),...(s.handedOverAt?[{code:'SHIPPED',text:'Đã bàn giao vận chuyển',at:s.handedOverAt}]:[]),...(s.deliveredAt?[{code:'DELIVERED',text:'Giao hàng thành công',at:s.deliveredAt}]:[])],
   tracking:s.tracking.join(', '),cancelReason:s.status==='CANCELLED'?s.note:undefined,refunded:s.rma?.stage==='closed',createdAt:at,
   oms:{token:orderToken(o.id),stage:s.stage,refunded:s.refunded,paidAmount:paid?p.charged:0,...(s.qr?{qr:s.qr}:{}),...(s.rma?{rma:s.rma}:{}),rtsOpen:s.rtsOpen,rtsRefunded:s.rtsRefunded}};
 });
 return {user:{id:u.id,username:u.username,email:u.email??'',phone:u.phone??'',name:u.name,gender:u.gender,birthday:u.birthday,createdAt:u.createdAt,server:true},balance:u.balance,
  addresses:(u.addresses as unknown as z.infer<typeof address>[]).map(a=>({...a,userId:u.id})),orders,
  wallet:(await db.shopWalletEntry.findMany({where:{accountId},orderBy:{createdAt:'desc'}})).map(e=>({id:e.id,userId:accountId,type:e.kind,amount:e.amount,orderId:e.orderId,note:e.note,at:e.createdAt}))};
}

import {DomainError,type Tx} from '@/server/commands';
import {isPublicDeployment,isClassroomMode} from '@/domain/demo-mode';
import {causeAmount} from '@/domain/payments/balances';
export const OPENING_BALANCE=6_000_000;
export type Buyer={id:string;payment:'cod'|'wallet'|'bank';realBankAcknowledged?:boolean};
/** Called INSIDE the checkout transaction: order, stock hold, simulated receipt and wallet debit commit or roll back together. */
export async function chargeBuyer(tx:Tx,buyer:Buyer,orderId:string,total:number){
 if(!Number.isSafeInteger(total)||total<=0)throw new DomainError('Tổng thanh toán không hợp lệ.',422);
 await tx.$queryRaw`SELECT id FROM "SHOP_TAI_KHOAN" WHERE id=${buyer.id} FOR UPDATE`;
 const account=await tx.shopAccount.findUnique({where:{id:buyer.id}});
 if(!account?.active)throw new DomainError('Bạn cần đăng nhập ShopVui.',401);
 if(isPublicDeployment()){
  if(buyer.payment==='bank'&&!buyer.realBankAcknowledged)throw new DomainError('Cần xác nhận SePay chuyển tiền thật, không giao hàng thật trong web demo.',422);
  const today=await tx.shopPurchase.count({where:{accountId:buyer.id,createdAt:{gte:new Date(Date.now()-86400000)}}});
  const holding=await tx.shopPurchase.count({where:{accountId:buyer.id,order:{status:'DA_XAC_NHAN',shipments:{some:{status:{in:['DANG_GIU','CHO_BAN_GIAO']}}}}}});
  const cls=isClassroomMode();
  if(today>=(cls?50:20)||holding>=(cls?10:3))throw new DomainError('Giới hạn demo: '+(cls?'50 đơn/24 giờ và tối đa 10':'20 đơn/24 giờ và tối đa 3')+' đơn đang chờ xuất. Hủy hoặc hoàn tất đơn cũ rồi thử lại.',429);
 }
 if(buyer.payment==='wallet'){
  const purchases=await tx.shopPurchase.findMany({where:{accountId:buyer.id,payment:'wallet'},include:{order:{include:{transactions:true}}}});
  let pendingCredit=0;
  for(const p of purchases){
   const refundedTotal=Math.min(p.charged,causeAmount(p.order.transactions,'HOAN',t=>t.kind==='HOAN'));
   const delta=refundedTotal-p.refunded;if(delta<=0)continue;
   await tx.shopWalletEntry.create({data:{accountId:buyer.id,key:'refund:'+p.orderId+':'+refundedTotal,kind:'REFUND',amount:delta,orderId:p.orderId,note:'Hoàn tiền đơn hàng '+p.orderId}});
   await tx.shopPurchase.update({where:{orderId:p.orderId},data:{refunded:refundedTotal}});
   pendingCredit+=delta;
  }
  if(pendingCredit>0)await tx.shopAccount.update({where:{id:buyer.id},data:{balance:{increment:pendingCredit}}});
  if(account.balance+pendingCredit<total)throw new DomainError('Số dư Ví ShopVuiPay không đủ. Vui lòng chọn phương thức thanh toán khác.',409);
  await tx.shopAccount.update({where:{id:buyer.id},data:{balance:{decrement:total}}});
  await tx.shopWalletEntry.create({data:{accountId:buyer.id,key:'pay:'+orderId,kind:'PAY',amount:-total,orderId,note:'Thanh toán đơn hàng '+orderId+' qua Ví ShopVuiPay'}});
 }
 await tx.shopPurchase.create({data:{accountId:buyer.id,orderId,payment:buyer.payment,realBankConsentAt:buyer.payment==='bank'&&buyer.realBankAcknowledged?new Date():null,charged:total}});
}

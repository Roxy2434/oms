import {NextResponse} from 'next/server';
import {currentAccount} from '@/server/auth';
import {db} from '@/server/db';
import {sepayConfig,pollSepayOnDemand} from '@/domain/payments/sepay';
import {expireUnpaidTransfers} from '@/domain/integrations/shopvui';
/** Cheap change stamp for live screens: changes whenever an order, parcel, money record, return case or stock row changes (incl. ShopVui intake). */
export async function GET(){
 const account=await currentAccount();if(!account)return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});
 if(process.env.VERCEL==='1'&&sepayConfig()){
  const waiting=await db.order.count({where:{status:'DA_XAC_NHAN',paymentMethod:'TRA_TRUOC',shopPurchase:{payment:'bank'},transactions:{none:{kind:'THU',status:'THANH_CONG'}}}});
  if(waiting>0)await Promise.all([expireUnpaidTransfers().catch(()=>null),pollSepayOnDemand(5000)]);
 }
 const [o,s,m,r,i]=await Promise.all([db.order.aggregate({_max:{updatedAt:true},_count:true}),db.shipment.aggregate({_max:{updatedAt:true},_count:true}),db.moneyTransaction.aggregate({_sum:{version:true},_count:true}),db.returnCase.aggregate({_sum:{version:true},_count:true}),db.inventory.aggregate({_max:{updatedAt:true}})]);
 return NextResponse.json({stamp:[o._max.updatedAt?.getTime()??0,o._count,s._max.updatedAt?.getTime()??0,s._count,m._count,m._sum.version??0,r._count,r._sum.version??0,i._max.updatedAt?.getTime()??0].join('.')},{headers:{'Cache-Control':'no-store'}});
}

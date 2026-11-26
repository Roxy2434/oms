import {moneyPosition,caseEntitlement,causeAmount,missingShippingFee,rootedMoney,returnDeductions,returnRefundCapacity,codRefundPool,type Money,type RefundCase} from './balances';
import {resolveOrderId} from '@/domain/orders/identifiers';
import {z} from 'zod';
import {command,DomainError,type Tx} from '@/server/commands';
import {effectiveValue} from '@/domain/dashboard/queries';
import {isPublicDeployment} from '@/domain/demo-mode';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('record'),kind:z.enum(['THU','HOAN']),reason:z.enum(['THU_TRA_TRUOC','THU_COD','THU_PHI_CON_THIEU','HOAN_HUY','HOAN_RMA','HOAN_BU_THU_SAI','THU_BU_HOAN_SAI']),amount:z.number().int().positive().max(999999999999),source:z.enum(['TIEN_MAT','CHUYEN_KHOAN','COD_MO_PHONG','VI_MO_PHONG']),reference:z.string().trim().min(3).max(120),note:z.string().trim().min(3).max(300),status:z.enum(['CHO_XAC_NHAN','THANH_CONG','THAT_BAI','CHUA_RO']),returnId:z.string().min(1).optional(),shipmentId:z.string().min(1).optional(),originalId:z.string().min(1).optional(),bankEvidenceConfirmed:z.boolean().optional()}),
 z.object({action:z.literal('resolve'),transactionId:z.string(),bankEvidenceConfirmed:z.boolean().optional(),status:z.enum(['THANH_CONG','THAT_BAI','CHUA_RO']),note:z.string().trim().min(3).max(300)})
]);
export async function reconcileReturns(tx:Tx,o:{paymentMethod:string;shipments:{id:string;codAmount:unknown}[];returns:(RefundCase&{status:string})[]},rows:Money[]){
 if(o.paymentMethod==='COD'&&!codRefundPool(rows,o.returns,o.shipments).feasible)throw new DomainError('Thay đổi tiền làm vượt hạn mức hoàn của kiện nguồn. Kiểm tra các chứng từ thu/hoàn và bù liên quan.');
 for(const r of o.returns.filter(r=>r.status==='DA_DONG')){
  const pending=rootedMoney(rows).some(x=>x.root.returnId===r.id&&['CHO_XAC_NHAN','CHUA_RO'].includes(x.transaction.status));
  const refunded=causeAmount(rows,'HOAN',t=>t.reason==='HOAN_RMA'&&t.returnId===r.id);
  const unpaid=o.paymentMethod==='COD'?codRefundPool(rows,o.returns,o.shipments,r.id).remaining>0:caseEntitlement(r)>refunded;
  if(pending||unpaid)await tx.returnCase.update({where:{id:r.id},data:{status:'CHO_HOAN_TIEN',closedAt:null,version:{increment:1}}});
 }
}
export async function paymentCommand(actorId:string,key:string,orderId:string,raw:unknown){
 orderId=resolveOrderId(orderId);const p=input.parse(raw);
 return command(actorId,key,'MONEY_'+p.action,'DON_HANG',orderId,p,async tx=>{
  await tx.$queryRaw`SELECT id FROM "DON_HANG" WHERE id=${orderId} FOR UPDATE`;
  const o=await tx.order.findUnique({where:{id:orderId},include:{shopPurchase:true,lines:true,shipments:{include:{lines:true}},transactions:true,returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}});
  if(!o)throw new DomainError('Không có đơn.',404);const at=new Date();
  if(isPublicDeployment()&&o.shopPurchase?.payment==='bank'){
   if((await tx.account.findUniqueOrThrow({where:{id:actorId}})).role!=='QUAN_LY')throw new DomainError('Chỉ Quản lý được đối soát/ghi hoàn ngân hàng thật.',403);
   if(p.action==='record'&&p.source!=='CHUYEN_KHOAN')throw new DomainError('Không dùng nguồn mô phỏng cho khoản ngân hàng thật.',422);
   if(p.status==='THANH_CONG'&&!p.bankEvidenceConfirmed)throw new DomainError('Cần xác nhận đã đối chiếu chứng từ ngân hàng thật. Hệ thống không tự chuyển hoàn.',422);
  }
  if(p.action==='resolve'){
   const t=o.transactions.find(t=>t.id===p.transactionId);if(!t||!['CHO_XAC_NHAN','CHUA_RO'].includes(t.status))throw new DomainError('Chỉ tra soát tiền còn chờ/chưa rõ.');
   await tx.moneyTransaction.update({where:{id:t.id},data:{status:p.status,note:t.note+'; '+p.note,confirmedAt:p.status==='THANH_CONG'?at:null,approvedById:actorId,version:{increment:1}}});
   await reconcileReturns(tx,o,o.transactions.map(x=>x.id===t.id?{...x,status:p.status}:x));return {id:orderId,transactionId:t.id};
  }
  if(o.shopPurchase?.payment==='bank'&&p.kind==='THU'&&p.reason==='THU_TRA_TRUOC')throw new DomainError('Đơn chuyển khoản ShopVui chỉ nhận chứng từ thu tự động từ SePay.',403);
  if(p.shipmentId&&!o.shipments.some(s=>s.id===p.shipmentId)||p.returnId&&!o.returns.some(r=>r.id===p.returnId)||p.originalId&&!o.transactions.some(t=>t.id===p.originalId))throw new DomainError('Tham chiếu không thuộc đơn.',422);
  const compensating=['HOAN_BU_THU_SAI','THU_BU_HOAN_SAI'].includes(p.reason);
  if(!compensating&&p.originalId!==undefined)throw new DomainError('Chỉ chứng từ bù sai sót mới được gắn giao dịch gốc.',422);
  if(compensating&&!p.originalId)throw new DomainError('Chứng từ bù cần giao dịch gốc.',422);
  if(!compensating&&(p.returnId!==undefined&&p.reason!=='HOAN_RMA'||p.shipmentId!==undefined&&p.reason!=='THU_COD'))throw new DomainError('Hồ sơ trả/kiện không phù hợp nguyên nhân chứng từ.',422);
  if(compensating){const root=rootedMoney(o.transactions).find(x=>x.transaction.id===p.originalId)?.root;if(p.returnId!==undefined&&p.returnId!==root?.returnId||p.shipmentId!==undefined&&p.shipmentId!==root?.shipmentId)throw new DomainError('Chứng từ bù phải giữ đúng nguồn của giao dịch gốc.',422);}
  if((p.reason.startsWith('HOAN')?'HOAN':'THU')!==p.kind)throw new DomainError('Loại và nguyên nhân không khớp.',422);
  if(p.source==='COD_MO_PHONG'&&p.reason!=='THU_COD')throw new DomainError('Nguồn COD phải là thu COD gắn kiện.',422);
  const occupied=o.transactions.filter(t=>t.status!=='THAT_BAI'),balance=moneyPosition(o.transactions);
  const collected=o.transactions.filter(t=>t.kind==='THU'&&t.status==='THANH_CONG').reduce((sum,t)=>sum+Number(t.amount),0);
  const heldCollect=balance.net+balance.pendingCollect,effective=Math.max(0,Number(effectiveValue(o))-returnDeductions(o.returns));let bound=0;
  switch(p.reason){
   case 'HOAN_RMA':{const r=o.returns.find(r=>r.id===p.returnId);if(!r||!['CHO_HOAN_TIEN','DA_DONG'].includes(r.status)||r.lines.some(l=>!l.qcAt))throw new DomainError('RMA chưa chốt hàng.');bound=returnRefundCapacity(r,o.paymentMethod,o.transactions,o.returns,o.shipments);break;}
   case 'HOAN_HUY':{const canceledGoods=o.shipments.filter(s=>s.status==='HUY').reduce((sum,s)=>sum+s.lines.reduce((value,l)=>value+l.quantity*Number(o.lines.find(x=>x.id===l.orderLineId)!.priceSnapshot),0),0);const cancelLimit=o.status==='DA_HUY'?collected:Math.min(canceledGoods,Math.max(0,collected-effective));bound=Math.min(cancelLimit-causeAmount(o.transactions,'HOAN',t=>t.reason==='HOAN_HUY',true),Math.max(0,balance.available-effective));break;}
   case 'HOAN_BU_THU_SAI':case 'THU_BU_HOAN_SAI':{const original=o.transactions.find(t=>t.id===p.originalId);if(!original||original.status!=='THANH_CONG'||original.kind===p.kind)throw new DomainError('Cần giao dịch gốc thành công đúng loại bù.');bound=Number(original.amount)-occupied.filter(t=>t.originalId===original.id).reduce((sum,t)=>sum+Number(t.amount),0);break;}
   case 'THU_TRA_TRUOC':if(o.paymentMethod!=='TRA_TRUOC'||o.status!=='DA_XAC_NHAN')throw new DomainError('Chỉ ghi thu trả trước cho đơn đã xác nhận, chưa hủy.');bound=effective-heldCollect;break;
   case 'THU_COD':{const shipment=o.shipments.find(s=>s.id===p.shipmentId);if(o.paymentMethod!=='COD'||!shipment||shipment.status!=='DA_GIAO'||p.source!=='COD_MO_PHONG')throw new DomainError('Thu COD cần kiện đã giao và nguồn COD.');bound=Math.min(effective-heldCollect,Number(shipment.codAmount)-causeAmount(o.transactions,'THU',t=>t.reason==='THU_COD'&&t.shipmentId===shipment.id,true));break;}
   case 'THU_PHI_CON_THIEU':if(o.paymentMethod!=='COD')throw new DomainError('Phí bổ sung chỉ cho COD.');bound=Math.min(effective-heldCollect,missingShippingFee(o));break;
  }
  if(p.amount>bound||p.kind==='HOAN'&&p.amount>balance.available)throw new DomainError('Vượt hạn mức theo nguyên nhân hoặc tiền thu; đã tính khoản chờ/chưa rõ.');
  const root=p.originalId?rootedMoney(o.transactions).find(x=>x.transaction.id===p.originalId)?.root:undefined;
  const t=await tx.moneyTransaction.create({data:{orderId,shipmentId:root?.shipmentId??p.shipmentId,returnId:root?.returnId??p.returnId,originalId:p.originalId,kind:p.kind,reason:p.reason,amount:p.amount,source:p.source,reference:p.reference,note:p.note,status:p.status,idempotencyKey:key,recordedById:actorId,approvedById:actorId,confirmedAt:p.status==='THANH_CONG'?at:null}});
  await reconcileReturns(tx,o,[...o.transactions,t]);return {id:orderId,transactionId:t.id};
 });
}

import {caseEntitlement,causeAmount,causeHasPending,codRefundPool,returnRefundCapacity} from '@/domain/payments/balances';
import {resolveOrderId,issueDocumentCode} from '@/domain/orders/identifiers';
import {z} from 'zod';
import {causeFromReason} from './labels';
import {canTransitionClaim} from './claims';
import {command,DomainError,type Tx} from '@/server/commands';
import {moveStock} from '@/domain/inventory/service';
const text=z.string().trim().min(3).max(300);
// Who caused the damage decides liability (Amazon-style grading): only carrier damage becomes a 3PL claim.
const cause=z.enum(['VAN_CHUYEN','KHACH_HANG','SAN_XUAT','SHOP_GIAO_SAI']).optional();
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),orderId:z.string(),warehouseId:z.string(),kind:z.enum(['KHACH_TRA','CHUYEN_HOAN']),reason:text,lateReason:z.string().trim().max(300).optional(),autoApprove:z.boolean().optional(),note:z.string().trim().max(500).optional(),lines:z.array(z.object({shipmentLineId:z.string(),quantity:z.number().int().positive().max(5)})).min(1).max(10)}),
 z.object({action:z.literal('approve')}),z.object({action:z.literal('reject'),reason:text}),
 z.object({action:z.literal('receive'),lineId:z.string(),quantity:z.number().int().min(0).max(5),conclusion:z.string().trim().max(300).optional()}),
 z.object({action:z.literal('qc'),lineId:z.string(),passed:z.number().int().min(0).max(5),failed:z.number().int().min(0).max(5),refundQuantity:z.number().int().min(0).max(5),reason:text,damageCause:cause,autoSettle:z.boolean().optional()}),
 // Receiving station: receive + QC one line in one step; autoSettle refunds via the simulated gateway and closes when possible.
 z.object({action:z.literal('inspect'),lineId:z.string(),received:z.number().int().min(0).max(5),passed:z.number().int().min(0).max(5),failed:z.number().int().min(0).max(5),refundQuantity:z.number().int().min(0).max(5),reason:text,damageCause:cause,conclusion:z.string().trim().max(300).optional(),autoSettle:z.boolean().optional()}),
 z.object({action:z.literal('claim'),claimId:z.string(),status:z.enum(['CHO_GUI','DA_GUI','DUOC_BOI_THUONG','TU_CHOI','KHONG_YEU_CAU']),note:text}),
 z.object({action:z.literal('close'),reason:text})
]);
type CreateInput={orderId:string;warehouseId:string;kind:'KHACH_TRA'|'CHUYEN_HOAN';reason:string;lateReason?:string;autoApprove?:boolean;note?:string;lines:{shipmentLineId:string;quantity:number}[]};
const pad=(n:number)=>String(n).padStart(4,'0');
async function nextRmaCode(tx:Tx){const [row]=await tx.$queryRaw<{n:bigint}[]>`SELECT nextval('rma_code_seq') AS n`;return 'RMA-'+pad(Number(row.n));}
async function nextClaimCode(tx:Tx){const [row]=await tx.$queryRaw<{n:bigint}[]>`SELECT nextval('carrier_claim_code_seq') AS n`;return 'BB-'+pad(Number(row.n));}
async function raiseClaim(tx:Tx,returnId:string,line:Line,kind:'HU_HONG'|'THAT_LAC',quantity:number,reason:string){await tx.carrierClaim.create({data:{code:await nextClaimCode(tx),returnId,kind,skuName:line.shipmentLine.orderLine.nameSnapshot,quantity,amount:quantity*Number(line.shipmentLine.orderLine.priceSnapshot),reason}});}

/** Opens a return case (RMA). Shared by the RMA API and by sender-returns raised from the order lifecycle. */
export async function openReturnCase(tx:Tx,actorId:string,p:CreateInput,at=new Date()){
 const orderId=resolveOrderId(p.orderId);
 if(new Set(p.lines.map(l=>l.shipmentLineId)).size!==p.lines.length)throw new DomainError('Trùng dòng nguồn.',422);
 const sources=await tx.shipmentLine.findMany({where:{id:{in:p.lines.map(l=>l.shipmentLineId)}},include:{shipment:true,returnLines:{include:{returnCase:true}}}});
 if(sources.length!==p.lines.length)throw new DomainError('Dòng kiện không hợp lệ.',422);
 let late=false;
 for(const line of p.lines){
  const source=sources.find(s=>s.id===line.shipmentLineId)!;
  if(source.shipment.orderId!==orderId||source.shipment.status!==(p.kind==='KHACH_TRA'?'DA_GIAO':'CHUYEN_HOAN'))throw new DomainError('Kiện chưa đủ điều kiện trả.');
  if(source.shipment.warehouseId!==p.warehouseId)throw new DomainError('Hàng trả phải nhận về đúng kho nguồn của kiện.');
  const used=source.returnLines.filter(l=>l.returnCase.status!=='TU_CHOI').reduce((sum,l)=>sum+Math.max(l.requested,l.approved),0);
  if(used+line.quantity>source.quantity)throw new DomainError('Vượt lượng nguồn còn được trả.');
  if(p.kind==='KHACH_TRA'&&source.shipment.deliveredAt&&at.getTime()-source.shipment.deliveredAt.getTime()>7*86400000){if(!p.lateReason)throw new DomainError('Quá 7 ngày. Cần quyết định có lý do.');late=true;}
 }
 // Policy auto-approval: sender returns always, customer returns only inside the 7-day window.
 const approve=p.autoApprove===true&&!late;
 const r=await tx.returnCase.create({data:{orderId,warehouseId:p.warehouseId,kind:p.kind,reason:p.reason,customerNote:p.note||null,code:await nextRmaCode(tx),trackingCode:issueDocumentCode('VDH',at),createdById:actorId,resolution:p.lateReason?{lateReason:p.lateReason}:{},...(approve?{status:'CHO_NHAN' as const,approvedById:actorId,approvedAt:at}:{}),lines:{create:p.lines.map(l=>({shipmentLineId:l.shipmentLineId,requested:l.quantity,approved:approve?l.quantity:0}))}}});
 return {id:r.id,code:r.code,status:r.status};
}

type Loaded=Awaited<ReturnType<typeof load>>;
async function load(tx:Tx,id:string){return tx.returnCase.findUniqueOrThrow({where:{id},include:{lines:{include:{shipmentLine:{include:{orderLine:true,shipment:true}}}},transactions:true,order:true}});}
type Line=Loaded['lines'][number];

async function receiveLine(tx:Tx,r:Loaded,line:Line,quantity:number,conclusion:string|undefined,actorId:string,key:string,at:Date){
 if(line.receivedAt||quantity>line.approved)throw new DomainError('Dòng đã nhận hoặc vượt lượng duyệt.');
 if(quantity<line.approved&&!conclusion)throw new DomainError('Thiếu/sai hàng phải ghi kết luận.');
 await moveStock(tx,{warehouseId:r.warehouseId,skuId:line.shipmentLine.orderLine.skuId,kind:'NHAN_HOAN',deltas:{sellable:0,reserved:0,qc:quantity,quarantined:0},documentType:'HO_SO_TRA',documentId:r.id,reason:conclusion||r.reason,actorId,key:key+':receive',at});
 await tx.returnLine.update({where:{id:line.id},data:{received:quantity,receivedAt:at,conclusion:conclusion??null}});
 // Sender return: the carrier held the goods the whole way, so a shortfall is a carrier loss claim.
 if(r.kind==='CHUYEN_HOAN'&&quantity<line.approved)await raiseClaim(tx,r.id,line,'THAT_LAC',line.approved-quantity,conclusion||'Hãng hoàn về thiếu hàng');
 await tx.returnCase.update({where:{id:r.id},data:{status:'CHO_QC',version:{increment:1}}});
}

async function qcLine(tx:Tx,r:Loaded,line:Line,q:{passed:number;failed:number;refundQuantity:number;reason:string;damageCause?:'VAN_CHUYEN'|'KHACH_HANG'|'SAN_XUAT'|'SHOP_GIAO_SAI'},actorId:string,key:string,at:Date){
 if(!line.receivedAt||line.qcAt||q.passed+q.failed!==line.received||q.refundQuantity>line.received)throw new DomainError('QC phải đúng thực nhận và chỉ được chốt một lần.');
 await moveStock(tx,{warehouseId:r.warehouseId,skuId:line.shipmentLine.orderLine.skuId,kind:'QC',deltas:{sellable:q.passed,reserved:0,qc:-line.received,quarantined:q.failed},documentType:'HO_SO_TRA',documentId:r.id,reason:q.reason,actorId,key:key+':qc',at});
 const damageCause=q.failed>0?q.damageCause??causeFromReason(r.reason,r.kind==='CHUYEN_HOAN'):null;
 await tx.returnLine.update({where:{id:line.id},data:{passed:q.passed,failed:q.failed,refundQuantity:q.refundQuantity,damageCause,qcAt:at,qcById:actorId,conclusion:[line.conclusion,q.reason].filter(Boolean).join('; ')}});
 if(damageCause==='VAN_CHUYEN')await raiseClaim(tx,r.id,line,'HU_HONG',q.failed,q.reason);
 const all=await tx.returnLine.findMany({where:{returnId:r.id},include:{shipmentLine:{include:{orderLine:true}}}});
 if(all.every(l=>l.qcAt)){const waived=r.kind==='CHUYEN_HOAN'&&r.order.paymentMethod==='COD'?all.reduce((sum,l)=>sum+l.approved*Number(l.shipmentLine.orderLine.priceSnapshot),0):0;await tx.returnCase.update({where:{id:r.id},data:{status:'CHO_HOAN_TIEN',waivedAmount:waived,resolution:{...(r.resolution&&typeof r.resolution==='object'&&!Array.isArray(r.resolution)?r.resolution:{}),waivedReason:waived?'Hàng chuyển hoàn đã có kết luận; miễn thu hàng, không miễn phí':'Không miễn thu'},version:{increment:1}}});}
}

async function closeCase(tx:Tx,id:string,reason:string,actorId:string,at:Date){
 const r=await load(tx,id);const orderId=r.orderId;
 if(r.status!=='CHO_HOAN_TIEN'||r.lines.some(l=>!l.qcAt))throw new DomainError('Còn dòng chưa nhận/QC hoặc thiếu kết luận.');
 let bound=caseEntitlement(r);
 const allMoney=await tx.moneyTransaction.findMany({where:{orderId}});
 const collected=allMoney.filter(t=>t.kind==='THU'&&t.status==='THANH_CONG').reduce((sum,t)=>sum+Number(t.amount),0);
 const refunded=causeAmount(allMoney,'HOAN',t=>t.reason==='HOAN_RMA'&&t.returnId===id);
 if(causeHasPending(allMoney,t=>t.returnId===id))throw new DomainError('Tiền còn chờ/chưa rõ, chưa được đóng.');
 if(r.order.paymentMethod==='COD'){const cases=await tx.returnCase.findMany({where:{orderId},include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}});const parcels=await tx.shipment.findMany({where:{orderId},select:{id:true,codAmount:true}});const pool=codRefundPool(allMoney,cases,parcels,id);if(!pool.feasible)throw new DomainError('Hạn mức hoàn của kiện nguồn cần đối soát.');bound=refunded+pool.remaining;}
 if(collected>0&&refunded<bound)throw new DomainError('Còn nghĩa vụ hoàn tiền.');
 await tx.returnCase.update({where:{id},data:{status:'DA_DONG',closedAt:at,conclusion:reason,version:{increment:1}}});
 if(r.kind==='CHUYEN_HOAN'){const shipmentIds=[...new Set(r.lines.map(l=>l.shipmentLine.shipmentId))];for(const shipmentId of shipmentIds){const sources=await tx.shipmentLine.findMany({where:{shipmentId},include:{returnLines:{include:{returnCase:true}}}});if(sources.every(s=>s.returnLines.filter(l=>l.returnCase.status==='DA_DONG'||l.returnId===id).reduce((sum,l)=>sum+l.approved,0)>=s.quantity))await tx.shipment.update({where:{id:shipmentId},data:{status:'DA_NHAN_HOAN',updatedById:actorId,version:{increment:1}}});}}
}

/** After QC: refund what is still owed through the simulated payment gateway, then close if nothing is pending. */
async function settle(tx:Tx,id:string,actorId:string,key:string,at:Date){
 const r=await tx.returnCase.findUniqueOrThrow({where:{id}});if(r.status!=='CHO_HOAN_TIEN')return {refunded:0,closed:false};
 const o=await tx.order.findUniqueOrThrow({where:{id:r.orderId},include:{shopPurchase:true,transactions:true,shipments:{select:{id:true,codAmount:true}},returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}});
 const target=o.returns.find(x=>x.id===id)!;
 const amount=causeHasPending(o.transactions,t=>t.returnId===id)?0:returnRefundCapacity(target,o.paymentMethod,o.transactions,o.returns,o.shipments);
 // A real bank refund is never executed by SePay's incoming-transfer poller or this simulated gateway.
 if(amount>0&&(o.shopPurchase?.payment==='bank'||o.transactions.some(t=>t.reference.startsWith('SEPAY-'))))return {refunded:0,closed:false};
 if(amount>0)await tx.moneyTransaction.create({data:{orderId:o.id,returnId:id,kind:'HOAN',reason:'HOAN_RMA',note:o.transactions.some(t=>t.source==='VI_MO_PHONG')?'Hoàn tự động về Ví ShopVuiPay của khách sau kiểm định (mô phỏng)':'Chứng từ hoàn mô phỏng sau kiểm định; không thực hiện chuyển tiền ngân hàng',amount,source:o.transactions.some(t=>t.source==='VI_MO_PHONG')?'VI_MO_PHONG':'CHUYEN_KHOAN',reference:'HT-'+(r.code??id),status:'THANH_CONG',idempotencyKey:key+':refund',recordedById:actorId,approvedById:actorId,confirmedAt:at}});
 try{await closeCase(tx,id,'Tự đóng: hàng đã kiểm định, tiền đã hoàn/miễn thu đúng hạn mức',actorId,at);return {refunded:amount,closed:true};}
 catch(e){if(e instanceof DomainError)return {refunded:amount,closed:false};throw e;}
}

export async function returnCommand(actorId:string,key:string,id:string,raw:unknown){const p=input.parse(raw);return command(actorId,key,'RMA_'+p.action,'HO_SO_TRA',id,p,async tx=>{
 const existing=p.action==='create'?null:await tx.returnCase.findUnique({where:{id}});
 const orderId=p.action==='create'?resolveOrderId(p.orderId):existing?.orderId;if(!orderId)throw new DomainError('Không tìm thấy hồ sơ.',404);
 await tx.$queryRaw`SELECT id FROM "DON_HANG" WHERE id=${orderId} FOR UPDATE`;const at=new Date();
 if(p.action==='create')return openReturnCase(tx,actorId,p,at);
 const r=await load(tx,id);
 if(p.action==='approve'){
  if(r.status!=='CHO_DUYET')throw new DomainError('Hồ sơ đã duyệt hoặc từ chối.');
  for(const line of r.lines){const other=await tx.returnLine.aggregate({where:{shipmentLineId:line.shipmentLineId,returnId:{not:id},returnCase:{status:{not:'TU_CHOI'}}},_sum:{approved:true}});if((other._sum.approved??0)+line.requested>line.shipmentLine.quantity)throw new DomainError('Vượt lượng đã xuất.');await tx.returnLine.update({where:{id:line.id},data:{approved:line.requested}});}
  await tx.returnCase.update({where:{id},data:{status:'CHO_NHAN',approvedById:actorId,approvedAt:at,version:{increment:1}}});return {id};
 }
 if(p.action==='reject'){if(r.status!=='CHO_DUYET')throw new DomainError('Chỉ từ chối hồ sơ chưa duyệt.');await tx.returnCase.update({where:{id},data:{status:'TU_CHOI',conclusion:p.reason,approvedById:actorId,version:{increment:1}}});return {id};}
 if(p.action==='claim'){const claim=await tx.carrierClaim.findUnique({where:{id:p.claimId}});if(!claim||claim.returnId!==id)throw new DomainError('Không có biên bản này trong hồ sơ.',404);if(!canTransitionClaim(claim.status,p.status))throw new DomainError('Trạng thái biên bản không hợp lệ: phải ghi đã gửi trước khi kết luận bồi thường, không mở lại kết luận đã chốt.');await tx.carrierClaim.update({where:{id:claim.id},data:{status:p.status,note:[claim.note,p.note].filter(Boolean).join('; ')}});return {id};}
 if(p.action==='receive'||p.action==='qc'||p.action==='inspect'){
  if(!['CHO_NHAN','CHO_QC'].includes(r.status))throw new DomainError('Hồ sơ không ở bước nhận/QC.');
  const line=r.lines.find(l=>l.id===p.lineId);if(!line)throw new DomainError('Không có dòng trả này.',404);
  if(p.action==='receive'){await receiveLine(tx,r,line,p.quantity,p.conclusion,actorId,key,at);return {id};}
  if(p.action==='qc'){await qcLine(tx,r,line,p,actorId,key,at);return {id,...(p.autoSettle?await settle(tx,id,actorId,key,at):{})};}
  await receiveLine(tx,r,line,p.received,p.conclusion,actorId,key,at);
  await qcLine(tx,r,{...line,received:p.received,receivedAt:at,conclusion:p.conclusion??null},p,actorId,key,at);
  return {id,...(p.autoSettle?await settle(tx,id,actorId,key,at):{})};
 }
 await closeCase(tx,id,p.reason,actorId,at);return {id};
});}

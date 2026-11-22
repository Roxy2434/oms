// Regression for the role-based workflow: paid-online checkout, parcel batches, auto RMA, receive+inspect, carrier claims,
// auto refund/close. Writes only oms_test.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const {checkoutQuote,createCheckout}=await import('../src/domain/orders/checkout');
const {shipmentBatch}=await import('../src/domain/orders/batch');
const {orderCommand}=await import('../src/domain/orders/lifecycle');
const {returnCommand}=await import('../src/domain/returns/service');
const ns='flow-'+randomUUID().slice(0,8),key=()=>randomUUID();
try{
 const actor=await db.account.create({data:{username:ns,name:ns,role:'QUAN_LY',passwordHash:'not-a-login-hash'}});
 const customer=await db.customer.create({data:{name:ns,phone:'0900000000',address:'12 Workflow test address',city:'DN'}});
 await db.warehouse.createMany({data:[{id:ns+'HCM',name:ns+' HCM',region:'HCM',address:'Test only'},{id:ns+'DN',name:ns+' DN',region:'DN',address:'Test only'}]});
 await db.sku.createMany({data:[{id:ns+'a',name:ns+' A',category:'QA',price:250000,weightGrams:500},{id:ns+'b',name:ns+' B',category:'QA',price:90000,weightGrams:400}]});
 await db.inventory.createMany({data:[{warehouseId:ns+'HCM',skuId:ns+'a',sellable:10},{warehouseId:ns+'DN',skuId:ns+'b',sellable:10}]});
 async function checkout(paymentMethod:'COD'|'TRA_TRUOC',lines:{skuId:string;quantity:number}[],paidOnline=false){
  const base={city:'DN' as const,address:customer.address,lines};const q=await checkoutQuote(base);assert(q.quote,'quote');
  return createCheckout(actor.id,key(),{...base,customerId:customer.id,recipient:ns,phone:customer.phone,channel:'SHOPEE',paymentMethod,quote:q.quote,paidOnline});
 }
 // 1. Paid online, split order: receipt recorded with the order; whole warehouse batch runs without a manual collection step.
 const split=await checkout('TRA_TRUOC',[{skuId:ns+'a',quantity:1},{skuId:ns+'b',quantity:1}],true);
 const pay=await db.moneyTransaction.findMany({where:{orderId:split.id}});assert.equal(pay.length,1);assert.equal(Number(pay[0].amount),340000+split.shippingFee);assert.equal(pay[0].status,'THANH_CONG');
 const parcels=(await db.shipment.findMany({where:{orderId:split.id}})).map(s=>s.id);assert.equal(parcels.length,2);
 const packKey=key();for(const action of ['pack','handover','deliver'] as const){const r=await shipmentBatch(actor.id,action==='pack'?packKey:key(),{action,shipmentIds:parcels});assert(r.results.every(x=>x.ok),JSON.stringify(r));if(action==='handover')assert(r.results.every(x=>x.trackingCode?.startsWith('VD-')));}
 const replay=await shipmentBatch(actor.id,packKey,{action:'pack',shipmentIds:parcels});assert(replay.results.every(x=>x.ok),'same batch key replays');
 assert.equal(await db.inventoryMovement.count({where:{documentId:{in:parcels},kind:'XUAT'}}),2,'issued exactly once per parcel');
 // 2. Unpaid prepaid parcel is blocked per item, others in the batch still go through.
 const unpaid=await checkout('TRA_TRUOC',[{skuId:ns+'b',quantity:1}]);const cod=await checkout('COD',[{skuId:ns+'b',quantity:2}]);
 const p2=[...(await db.shipment.findMany({where:{orderId:{in:[unpaid.id,cod.id]}}}))].map(s=>s.id);
 await shipmentBatch(actor.id,key(),{action:'pack',shipmentIds:p2});const h=await shipmentBatch(actor.id,key(),{action:'handover',shipmentIds:p2});
 assert.equal(h.results.filter(r=>r.ok).length,1);assert.match(h.results.find(r=>!r.ok)!.error!,/thu đủ/);
 // 3. Carrier failure -> sender return opens an approved RMA with code + return waybill.
 const codParcel=(await db.shipment.findFirstOrThrow({where:{orderId:cod.id}})).id;
 assert((await shipmentBatch(actor.id,key(),{action:'fail',shipmentIds:[codParcel],reason:'Khách không nhận'})).results[0].ok);
 const rts=await orderCommand(actor.id,key(),cod.id,{action:'returnToSender',shipmentId:codParcel,reason:'Hãng trả hàng',openReturn:true}) as {returnId:string};
 const rma=await db.returnCase.findUniqueOrThrow({where:{id:rts.returnId},include:{lines:true}});
 assert.match(rma.code!,/^RMA-\d{4}$/);assert.match(rma.trackingCode!,/^VDH-/);assert.equal(rma.status,'CHO_NHAN');assert.equal(rma.kind,'CHUYEN_HOAN');assert.equal(rma.lines[0].approved,2);
 // 4. Receive + inspect in one step: 1 sealed back to stock, 1 damaged -> quarantine + carrier claim; COD unpaid -> waived, auto closed.
 const r4=await returnCommand(actor.id,key(),rma.id,{action:'inspect',lineId:rma.lines[0].id,received:2,passed:1,failed:1,refundQuantity:0,reason:'1 móp do vận chuyển',autoSettle:true}) as {refunded:number;closed:boolean};
 assert.deepEqual(r4,{id:rma.id,refunded:0,closed:true});
 const claim=await db.carrierClaim.findFirstOrThrow({where:{returnId:rma.id}});assert.match(claim.code,/^BB-\d{4}$/);assert.equal(claim.quantity,1);assert.equal(Number(claim.amount),90000);
 assert.equal((await db.shipment.findUniqueOrThrow({where:{id:codParcel}})).status,'DA_NHAN_HOAN');
 await returnCommand(actor.id,key(),rma.id,{action:'claim',claimId:claim.id,status:'DA_GUI',note:'Đã gửi hồ sơ cho hãng'});assert.equal((await db.carrierClaim.findUniqueOrThrow({where:{id:claim.id}})).status,'DA_GUI');
 const stock=await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:ns+'DN',skuId:ns+'b'}}});assert.equal(stock.quarantined,1);assert.equal(stock.qc,0);
 // 5. Customer return within 7 days is auto-approved; inspection auto-refunds the goods price through the gateway and closes.
 const deliveredB=(await db.shipment.findFirstOrThrow({where:{orderId:split.id,warehouseId:ns+'DN'},include:{lines:true}}));
 const ret=await returnCommand(actor.id,key(),'new',{action:'create',autoApprove:true,orderId:split.id,warehouseId:ns+'DN',kind:'KHACH_TRA',reason:'Khách đổi ý',lines:[{shipmentLineId:deliveredB.lines[0].id,quantity:1}]}) as {id:string;status:string};
 assert.equal(ret.status,'CHO_NHAN');const line=await db.returnLine.findFirstOrThrow({where:{returnId:ret.id}});
 const r5=await returnCommand(actor.id,key(),ret.id,{action:'inspect',lineId:line.id,received:1,passed:1,failed:0,refundQuantity:1,reason:'Nguyên seal',autoSettle:true}) as {refunded:number;closed:boolean};
 assert.equal(r5.refunded,90000);assert.equal(r5.closed,true);
 const refund=await db.moneyTransaction.findFirstOrThrow({where:{returnId:ret.id}});assert.equal(refund.status,'THANH_CONG');assert.equal(Number(refund.amount),90000);
 // Without the flag the old explicit approval flow still applies.
 const manual=await returnCommand(actor.id,key(),'new',{action:'create',orderId:split.id,warehouseId:ns+'HCM',kind:'KHACH_TRA',reason:'Không tự duyệt',lines:[{shipmentLineId:(await db.shipmentLine.findFirstOrThrow({where:{shipment:{orderId:split.id,warehouseId:ns+'HCM'}}})).id,quantity:1}]}) as {status:string};
 assert.equal(manual.status,'CHO_DUYET');
 // 6. Damage cause decides 3PL liability: customer damage is quarantined without a carrier claim (staff can run the whole flow).
 const staff=await db.account.create({data:{username:ns+'nv',name:ns+'nv',role:'NHAN_VIEN',passwordHash:'not-a-login-hash'}});
 const manualId=(manual as unknown as {id:string}).id;
 await returnCommand(staff.id,key(),manualId,{action:'approve'});
 const mLine=await db.returnLine.findFirstOrThrow({where:{returnId:manualId}});
 // Received earlier (old two-step flow) then QC'd from the same form: qc+autoSettle must settle like inspect does.
 await returnCommand(staff.id,key(),manualId,{action:'receive',lineId:mLine.id,quantity:1});
 const r6=await returnCommand(staff.id,key(),manualId,{action:'qc',lineId:mLine.id,passed:0,failed:1,refundQuantity:0,reason:'Khách làm vỡ hộp',damageCause:'KHACH_HANG',autoSettle:true}) as {closed?:boolean};
 assert.equal(typeof r6.closed,'boolean','qc with autoSettle runs settle');assert.equal((await db.returnCase.findUniqueOrThrow({where:{id:manualId}})).status,'DA_DONG');
 assert.equal(await db.carrierClaim.count({where:{returnId:manualId}}),0,'customer damage is not a carrier claim');
 assert.equal((await db.returnLine.findUniqueOrThrow({where:{id:mLine.id}})).damageCause,'KHACH_HANG');
 // 7. Sender return arriving short: the carrier held the goods, so the shortfall becomes a loss (THAT_LAC) claim.
 const cod2=await checkout('COD',[{skuId:ns+'b',quantity:2}]);const c2=(await db.shipment.findFirstOrThrow({where:{orderId:cod2.id}})).id;
 for(const action of ['pack','handover'] as const)assert((await shipmentBatch(actor.id,key(),{action,shipmentIds:[c2]})).results[0].ok);
 await shipmentBatch(actor.id,key(),{action:'fail',shipmentIds:[c2],reason:'Khách không nhận'});
 const rts2=await orderCommand(actor.id,key(),cod2.id,{action:'returnToSender',shipmentId:c2,reason:'Hãng trả hàng',openReturn:true}) as {returnId:string};
 const l2=await db.returnLine.findFirstOrThrow({where:{returnId:rts2.returnId}});
 await returnCommand(staff.id,key(),rts2.returnId,{action:'inspect',lineId:l2.id,received:1,passed:1,failed:0,refundQuantity:0,reason:'Món còn lại nguyên seal',conclusion:'Hãng hoàn về thiếu 1 món',autoSettle:true});
 const lost=await db.carrierClaim.findFirstOrThrow({where:{returnId:rts2.returnId}});assert.equal(lost.kind,'THAT_LAC');assert.equal(lost.quantity,1);assert.equal(Number(lost.amount),90000);
 console.log('PASS paid-online checkout, parcel batches + replay + per-item block, auto RMA code/waybill, receive+inspect, carrier claim, auto refund/close, damage cause liability, sender-return loss claim; oms_test only');
}finally{await db.$disconnect();}

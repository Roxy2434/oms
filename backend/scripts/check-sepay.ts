// Real bank transfers via SePay (fake SePay API) + the two audit money fixes: wallet refund on ShopVui cancel,
// cancelled-with-money queue, and paying a prepaid split order after one parcel was cancelled. Writes only oms_test.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,process.env.OMS_DB_PORT||'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;delete process.env.SHOPVUI_DEMO_PAY;
const {db}=await import('../src/server/db');
const sv=await import('../src/domain/integrations/shopvui');
const sepay=await import('../src/domain/payments/sepay');
const {orderCommand}=await import('../src/domain/orders/lifecycle');
const {cancelledWithMoney}=await import('../src/domain/dashboard/work-queries');
const ref=(orderId:string)=>({orderId,token:sv.orderToken(orderId)});
const ns='sp-'+randomUUID().slice(0,8);
const dh=(tag:string)=>'DH-'+new Date(Date.now()+7*3600000).toISOString().slice(2,10).replaceAll('-','')+'-'+createHash('sha256').update(ns+tag).digest('hex').slice(0,6).toUpperCase();// ShopVui order code = OMS order id (DH-YYMMDD-XXXXXX)
const money=(orderId:string)=>db.moneyTransaction.findMany({where:{orderId},orderBy:{createdAt:'asc'}});
const status=async(ext:string)=>(await sv.statuses([ref(ext)])).orders[0];
try{
 // Transfer notes as banks deliver them: separators stripped or kept, extra text around.
 assert.equal(sepay.orderIdFromNote('MBVCB.1234.DH261112A1B2C3.CT tu 0123'),'DH-261112-A1B2C3');
 assert.equal(sepay.orderIdFromNote('dh-261112-a1b2c3 thanh toan'),'DH-261112-A1B2C3');
 assert.equal(sepay.orderIdFromNote('TT DH000123'),'DH-000123');
 assert.equal(sepay.orderIdFromNote('chuyen tien an trua'),null);
 assert.equal(sepay.payCode('DH-261112-A1B2C3'),'DH261112A1B2C3');

 const actor=await db.account.create({data:{username:ns,name:ns,role:'QUAN_LY',passwordHash:'not-a-login-hash'}});
 await db.warehouse.createMany({data:[{id:ns+'A',name:ns+' A',region:'HN',address:'Test only'},{id:ns+'B',name:ns+' B',region:'HN',address:'Test only'}]});
 await db.sku.create({data:{id:ns+'x',name:ns+' X',category:'QA',price:100000,weightGrams:500}});
 await db.sku.create({data:{id:ns+'y',name:ns+' Y',category:'QA',price:100000,weightGrams:500}});
 await db.inventory.createMany({data:[{warehouseId:ns+'A',skuId:ns+'x',sellable:20},{warehouseId:ns+'A',skuId:ns+'y',sellable:1},{warehouseId:ns+'B',skuId:ns+'y',sellable:1}]});
 const address={province:'Hà Nội',ward:'',detail:'1 Test'};
 const order=(ext:string,qty:number,payment:'cod'|'wallet'|'bank',sku=ns+'x')=>sv.placeOrder({orderId:dh(ext),name:'Khách',phone:'0900000001',address,items:[{sku,qty}],payment});

 // Fix 1: ShopVui cancel of a wallet-paid order refunds the wallet; replaying the cancel does not refund twice.
 const w=await order('-w',1,'wallet');
 await sv.cancel({...ref(dh('-w')),reason:'đổi ý'});await sv.cancel({...ref(dh('-w')),reason:'đổi ý'});
 const wm=await money(w.orderId);
 assert.deepEqual(wm.map(t=>[t.kind,t.reason,t.status]),[['THU','THU_TRA_TRUOC','THANH_CONG'],['HOAN','HOAN_HUY','THANH_CONG']]);
 assert.equal(Number(wm[1].amount),Number(wm[0].amount));
 assert(!(await cancelledWithMoney()).some(o=>o.id===w.orderId));

 // Fix 1: a paid order cancelled by staff (no automatic refund) shows up in "Đơn hủy còn tiền phải hoàn".
 const s=await order('-s',1,'bank');const so=await db.order.findUniqueOrThrow({where:{id:s.orderId},include:{lines:true,shipments:{include:{lines:true}},transactions:true}});await sepay.recordTransfer({id:ns+'-staff-cancel',amount:sepay.prepaidDue(so),content:sepay.payCode(s.orderId),reference:ns+'-staff-cancel'});
 await orderCommand(actor.id,randomUUID(),s.orderId,{action:'cancel',reason:'Kho báo hỏng'});
 const owed=(await cancelledWithMoney()).find(o=>o.id===s.orderId);assert(owed&&owed.owed>0,'cancelled paid order must be in the refund queue');

 // Fix 2: prepaid order split over two warehouses; one parcel cancelled; the buyer can still pay the remaining value.
 const b=await order('-b',2,'bank',ns+'y');// one unit per warehouse forces a split
 const parcels=await db.shipment.findMany({where:{orderId:b.orderId},orderBy:{warehouseId:'asc'}});assert.equal(parcels.length,2);
 await orderCommand(actor.id,randomUUID(),b.orderId,{action:'cancelShipment',shipmentId:parcels[1].id,reason:'Hết hàng'});
 assert.equal((await status(dh('-b'))).paid,false);
 const remaining=await db.order.findUniqueOrThrow({where:{id:b.orderId},include:{lines:true,shipments:{include:{lines:true}},transactions:true}});const paid={paid:sepay.prepaidDue(remaining)};
 await sepay.recordTransfer({id:ns+'-split',amount:paid.paid,content:sepay.payCode(b.orderId),reference:ns+'-split'});assert(paid.paid>0&&paid.paid<200000+Number(remaining.shippingFee),JSON.stringify(paid));
 assert.equal((await status(dh('-b'))).paid,true);
 await orderCommand(actor.id,randomUUID(),b.orderId,{action:'pack',shipmentId:parcels[0].id});
 await orderCommand(actor.id,randomUUID(),b.orderId,{action:'handover',shipmentId:parcels[0].id});

 // SePay on: bank orders get a VietQR for what is due; the simulated /pay is closed.
 process.env.SEPAY_API_TOKEN='test-token';process.env.SEPAY_ACCOUNT='0123456789';
 const q=await order('-q',1,'bank');
 assert(q.qr&&q.qr.amount>0&&q.qr.note===sepay.payCode(q.orderId),JSON.stringify(q));assert.match(q.qr.url,/acc=0123456789&bank=970422&amount=\d+&des=DH/);
 assert.equal(q.paid,false);
 await assert.rejects(sv.pay(ref(dh('-q'))),/SePay/);
 const o2=await order('-o',1,'bank');const over={orderId:o2.orderId,qr:o2.qr!};
 // Fake SePay transaction list: exact payment, over-payment, a transfer with no order code, and an outgoing transfer.
 const rows=[{id:ns+'1',amount_in:q.qr.amount.toFixed(2),amount_out:'0.00',transaction_content:`MBVCB.99.${q.qr.note}.CT`,reference_number:'FT'+ns},
  {id:ns+'2',amount_in:(over.qr.amount+50000).toFixed(2),amount_out:'0.00',transaction_content:sepay.payCode(over.orderId),reference_number:'FT2'+ns},
  {id:ns+'3',amount_in:'70000.00',amount_out:'0.00',transaction_content:'chuyen tien an trua',reference_number:'FT3'+ns},
  {id:ns+'4',amount_in:'0.00',amount_out:'10000.00',transaction_content:sepay.payCode(q.orderId),reference_number:'FT4'+ns}];
 let calls=0;
 const fake=(async(input:string|URL|Request,init?:RequestInit)=>{calls++;assert.match(String(input),/userapi\/transactions\/list\?account_number=0123456789/);assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-token');return new Response(JSON.stringify({status:200,error:null,messages:{success:true},transactions:rows}));}) as typeof fetch;
 assert.equal((await sepay.pollSepay(fake)).recorded,2);
 assert.equal((await sepay.pollSepay(fake)).recorded,0,'a second poll must not record the same transfers again');assert.equal(calls,2);
 const qm=await money(q.orderId);assert.deepEqual(qm.map(t=>[t.status,Number(t.amount),t.reference]),[['THANH_CONG',q.qr.amount,'SEPAY-FT'+ns]]);
 const qs=await status(dh('-q'));assert.equal(qs.paid,true);assert.equal('qr' in qs,false);
 const om=await money(over.orderId);assert.deepEqual(om.map(t=>t.status),['CHUA_RO']);assert.match(om[0].note,/cần tra soát/);
 assert.equal((await status(dh('-o'))).paid,false);
 // A stale SHOPVUI_DEMO_PAY=1 MUST NOT reopen the browser payment bypass.
 process.env.SHOPVUI_DEMO_PAY='1';
 const d=await order('-d',1,'bank');assert.equal(d.qr?.demo,false);
 await assert.rejects(sv.pay(ref(dh('-d'))),/SePay/);
 assert.equal((await money(d.orderId)).length,0);
 assert.equal((await status(dh('-d'))).paid,false);
 await sv.cancel({...ref(dh('-d')),reason:'Đóng fixture kiểm chặn thanh toán demo trước ca expiry'});
 const r2=await order('-r',1,'bank');
 assert.equal((await sepay.recordTransfer({id:ns+'-real',amount:r2.qr!.amount,content:'MBVCB.'+r2.qr!.note,reference:'FTR'+ns}))?.status,'THANH_CONG','real transfer still recorded with demo on');
 delete process.env.SHOPVUI_DEMO_PAY;
 assert.equal((await order('-d2',1,'bank')).qr?.demo,false);await sv.cancel({...ref(dh('-d2')),reason:'chỉ để kiểm tra cờ demo'});// keep it out of the expiry count below
 // Per-order token: the public storefront key alone cannot act on or read someone else's order.
 const qToken=(q as {token?:string}).token;assert.equal(qToken,sv.orderToken(dh('-q')));
 await assert.rejects(sv.cancel({orderId:dh('-o'),token:'wrong-token',reason:'phá đơn người khác'}),(e:{status?:number})=>e.status===403);
 await assert.rejects(sv.cancel({orderId:dh('-o'),reason:'không có token'}),(e:{status?:number})=>e.status===403);
 await assert.rejects(sv.requestReturn({orderId:dh('-o'),token:'x'.repeat(32),reason:'trả hàng giả'}),(e:{status?:number})=>e.status===403);
 assert.equal((await sv.statuses([{orderId:dh('-o'),token:'x'.repeat(32)}])).orders.length,0,'status must not leak with a wrong token');
 // Security regression: order facts alone cannot recover a token, even when they match exactly.
 await assert.rejects(sv.placeOrder({replayOnly:true,orderId:dh('-ghost'),name:'Khách',phone:'0900000001',address,items:[{sku:ns+'x',qty:1}],payment:'bank'}),(e:{status?:number})=>e.status===404);
 assert.equal(await db.order.count({where:{id:dh('-ghost')}}),0);
 await assert.rejects(sv.placeOrder({replayOnly:true,orderId:dh('-q'),name:'Khách',phone:'0900000001',address,items:[{sku:ns+'x',qty:1}],payment:'bank'}),(e:{status?:number})=>e.status===403);
 assert.equal((await sv.placeOrder({replayOnly:true,token:qToken,orderId:dh('-q'),name:'Khách',phone:'0900000001',address,items:[{sku:ns+'x',qty:1}],payment:'bank'})).token,qToken);

 // Payment window: an unpaid bank order is cancelled after 30 minutes and its stock released; paid / "chưa rõ" ones are kept.
 const e1=await order('-e1',2,'bank');const qr=(e1 as {qr?:{payBy:string|null}}).qr;assert(qr?.payBy,'QR must carry its deadline');
 const placedAt=(await db.order.findUniqueOrThrow({where:{id:e1.orderId}})).confirmedAt!;assert.equal(new Date(qr.payBy!).getTime()-placedAt.getTime(),sv.PAY_MINUTES*60000);
 const reserved=async()=>(await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:ns+'A',skuId:ns+'x'}}})).reserved;
 const before=await reserved();
 assert.equal((await sv.expireUnpaidTransfers(new Date(placedAt.getTime()+(sv.PAY_MINUTES-1)*60000))).expired.includes(e1.orderId),false,'not expired before the window ends');
 const later=new Date(placedAt.getTime()+(sv.PAY_MINUTES+1)*60000);
 const swept={expired:[] as string[]};for(let i=0;i<20&&!swept.expired.includes(e1.orderId);i++){const r=await sv.expireUnpaidTransfers(later);if(!r.expired.length)break;swept.expired.push(...r.expired);}// oms_test may hold old unpaid orders from earlier runs
 assert(swept.expired.includes(e1.orderId),JSON.stringify(swept));
 assert.equal((await db.order.findUniqueOrThrow({where:{id:e1.orderId}})).status,'DA_HUY');assert.equal(await reserved(),before-2,'stock must be released');
 const es=await status(dh('-e1'));assert.equal(es.status,'CANCELLED');assert.match(es.note,/quá hạn thanh toán/);
 assert.equal((await sv.expireUnpaidTransfers(later)).expired.includes(e1.orderId),false,'a second sweep does nothing');
 // q (paid) and o (over-paid, "chưa rõ") are never auto-cancelled.
 assert(!swept.expired.includes(q.orderId)&&!swept.expired.includes(over.orderId));
 assert.equal((await db.order.findUniqueOrThrow({where:{id:over.orderId}})).status,'DA_XAC_NHAN');
 // Guard inside the lock: a cancel with unpaidOnly refuses once money is there.
 await assert.rejects(orderCommand(actor.id,randomUUID(),over.orderId,{action:'cancel',reason:'thử tự hủy',unpaidOnly:true}),/đã có tiền về/);
 console.log(JSON.stringify({ok:true,walletRefund:Number(wm[1].amount),refundQueue:owed.owed,splitPaid:paid.paid,sepayRecorded:2}));
}finally{delete process.env.SEPAY_API_TOKEN;await db.$disconnect();}

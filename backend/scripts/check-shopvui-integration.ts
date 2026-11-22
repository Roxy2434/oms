// ShopVui storefront integration at service level: catalog, quote, idempotent order intake, province -> city,
// bank-transfer payment, cancel, and OMS fulfillment status mapped back. Writes only oms_test.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const sv=await import('../src/domain/integrations/shopvui');
const {shipmentBatch}=await import('../src/domain/orders/batch');
const ref=(orderId:string)=>({orderId,token:sv.orderToken(orderId)});
const ns='sv-'+randomUUID().slice(0,8),key=()=>randomUUID();
const dh=(tag:string)=>'DH-'+new Date(Date.now()+7*3600000).toISOString().slice(2,10).replaceAll('-','')+'-'+createHash('sha256').update(ns+tag).digest('hex').slice(0,6).toUpperCase();// ShopVui order code = OMS order id (DH-YYMMDD-XXXXXX)
try{
 assert.equal(sv.cityOf('Hải Phòng'),'HN');assert.equal(sv.cityOf('Huế'),'DN');assert.equal(sv.cityOf('Cần Thơ'),'HCM');
 const actor=await db.account.create({data:{username:ns,name:ns,role:'QUAN_LY',passwordHash:'not-a-login-hash'}});
 await db.warehouse.createMany({data:[{id:ns+'HN',name:ns+' HN',region:'HN',address:'Test only'}]});
 await db.sku.create({data:{id:ns+'x',name:ns+' X',category:'QA',price:100000,weightGrams:500}});
 await db.sku.create({data:{id:ns+'y',name:ns+' Y (no stock)',category:'QA',price:50000,weightGrams:300}});
 await db.inventory.create({data:{warehouseId:ns+'HN',skuId:ns+'x',sellable:5}});
 const cat=await sv.catalog();assert.equal(cat.products.find(p=>p.sku===ns+'x')?.available,5);
 const address={province:'Hải Phòng',ward:'Phường Lê Chân',detail:'12 Trần Phú'};
 const q=await sv.quote({address,items:[{sku:ns+'x',qty:2}]});assert(q.ok&&q.shippingFee!>0,JSON.stringify(q));
 // COD order: lands in OMS as channel SHOPVUI, customer created by phone; resending the same order code does not duplicate.
 const body={recoveryKey:randomUUID()+randomUUID(),orderId:dh('-o1'),name:'Khách ShopVui',phone:'0912345678',address,items:[{sku:ns+'x',qty:2}],payment:'cod' as const};
 const o1=await sv.placeOrder(body);await assert.rejects(sv.placeOrder({...body,recoveryKey:undefined,replayOnly:true}),(e:{status?:number})=>e.status===403,'order facts alone cannot recover a token');const again=await sv.placeOrder(body);assert.equal(again.orderId,o1.orderId);assert.equal(again.replay,true);
 await assert.rejects(sv.placeOrder({...body,phone:'0987654321'}),/đã được dùng/);
 const order=await db.order.findUniqueOrThrow({where:{id:o1.orderId},include:{shipments:true,customer:true}});
 assert.equal(order.channel,'SHOPVUI');assert.equal(order.id,dh('-o1'));assert.equal(order.paymentMethod,'COD');assert.equal(order.region,'HN-NOITHANH');assert.match(order.address,/Hải Phòng/);assert.equal(order.customer.phone,'0912345678');
 assert.equal(Number(order.shippingFee),q.shippingFee);
 // Status flows back as the warehouse works the parcel.
 const st=async()=>(await sv.statuses([ref(dh('-o1'))])).orders[0];
 assert.equal((await st()).stage,'confirmed');
 const parcels=order.shipments.map(s=>s.id);
 await shipmentBatch(actor.id,key(),{action:'pack',shipmentIds:parcels});assert.equal((await st()).stage,'packed');
 await shipmentBatch(actor.id,key(),{action:'handover',shipmentIds:parcels});const shipping=await st();assert.equal(shipping.status,'SHIPPING');assert.match(shipping.tracking[0],/^VD-/);
 await shipmentBatch(actor.id,key(),{action:'deliver',shipmentIds:parcels});const done=await st();assert.equal(done.status,'COMPLETED');assert(done.deliveredAt);
 // Return from ShopVui (inside 7 days): OMS opens an auto-approved RMA with code + return waybill; same request replays.
 const {orderCommand}=await import('../src/domain/orders/lifecycle');const {returnCommand}=await import('../src/domain/returns/service');
 await orderCommand(actor.id,key(),o1.orderId,{action:'collect',shipmentId:parcels[0]});
 const ret=await sv.requestReturn({...ref(dh('-o1')),reason:'Hàng bị lỗi, hư hỏng'});const ret2=await sv.requestReturn({...ref(dh('-o1')),reason:'Hàng bị lỗi, hư hỏng'});
 assert.equal(ret.returns.length,1);assert.match(ret.returns[0].code!,/^RMA-\d{4}$/);assert.match(ret.returns[0].trackingCode!,/^VDH-/);assert.equal(ret.returns[0].status,'CHO_NHAN');assert.deepEqual(ret2.returns,ret.returns);
 const rmaOf=async()=>(await sv.statuses([ref(dh('-o1'))])).orders[0].rma!;assert.equal((await rmaOf()).stage,'approved');
 // Warehouse receives + inspects; refund goes out automatically and the storefront sees the amount.
 const rc=await db.returnCase.findFirstOrThrow({where:{orderId:o1.orderId},include:{lines:true}});
 await returnCommand(actor.id,key(),rc.id,{action:'inspect',lineId:rc.lines[0].id,received:2,passed:2,failed:0,refundQuantity:2,reason:'Nguyên seal',autoSettle:true});
 const closed=await rmaOf();assert.equal(closed.stage,'closed');assert.equal(closed.refunded,200000);
 // Bank transfer: prepaid, unpaid until ShopVui reports the payment; then exactly the due amount is recorded once.
 const o2=await sv.placeOrder({...body,orderId:dh('-o2'),items:[{sku:ns+'x',qty:1}],payment:'bank'});
 const p1=await sv.pay(ref(dh('-o2')));const p2=await sv.pay(ref(dh('-o2')));assert(p1.paid>0);assert.equal(p2.paid,0);
 const receipts=await db.moneyTransaction.findMany({where:{orderId:o2.orderId,kind:'THU',status:'THANH_CONG'}});assert.equal(receipts.length,1);assert.equal(Number(receipts[0].amount),100000+Number((await db.order.findUniqueOrThrow({where:{id:o2.orderId}})).shippingFee));
 // Buyer cancels before handover: OMS cancels and releases the hold; status maps to CANCELLED.
 await sv.cancel({...ref(dh('-o2')),reason:'Khách đổi ý'});assert.equal((await sv.statuses([ref(dh('-o2'))])).orders[0].status,'CANCELLED');
 const inv=await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:ns+'HN',skuId:ns+'x'}}});assert.equal(inv.reserved,0);assert.equal(inv.sellable,5,'5 - 2 shipped + 2 returned sealed back to stock');
 // Split order, one parcel delivered and the other sent back: the storefront order is NOT cancelled; refund only for the returned parcel.
 await db.warehouse.create({data:{id:ns+'DN',name:ns+' DN',region:'DN',address:'Test only'}});await db.sku.create({data:{id:ns+'z',name:ns+' Z',category:'QA',price:70000,weightGrams:300}});
 await db.inventory.create({data:{warehouseId:ns+'DN',skuId:ns+'z',sellable:3}});
 const sp=await sv.placeOrder({...body,orderId:dh('-o4'),items:[{sku:ns+'x',qty:1},{sku:ns+'z',qty:1}],payment:'wallet'});
 const sParcels=await db.shipment.findMany({where:{orderId:sp.orderId},include:{lines:{include:{orderLine:true}}}});assert.equal(sParcels.length,2,'split over 2 warehouses');
 const pz=sParcels.find(x=>x.warehouseId===ns+'DN')!,px=sParcels.find(x=>x.warehouseId!==ns+'DN')!;
 for(const action of ['pack','handover'] as const)await shipmentBatch(actor.id,key(),{action,shipmentIds:[px.id,pz.id]});
 await shipmentBatch(actor.id,key(),{action:'deliver',shipmentIds:[px.id]});await shipmentBatch(actor.id,key(),{action:'fail',shipmentIds:[pz.id],reason:'Khách không nhận'});
 await orderCommand(actor.id,key(),sp.orderId,{action:'returnToSender',shipmentId:pz.id,openReturn:true});
 let ss=(await sv.statuses([ref(dh('-o4'))])).orders[0];assert.equal(ss.status,'COMPLETED');assert.equal(ss.returnedParcels,1);assert.match(ss.note,/1\/2 kiện/);assert.equal(ss.rtsOpen,true);assert.equal(ss.rtsRefunded,0);
 const rts=await db.returnCase.findFirstOrThrow({where:{orderId:sp.orderId,kind:'CHUYEN_HOAN'},include:{lines:true}});
 await returnCommand(actor.id,key(),rts.id,{action:'inspect',lineId:rts.lines[0].id,received:1,passed:1,failed:0,refundQuantity:1,reason:'Nguyên seal',autoSettle:true});
 ss=(await sv.statuses([ref(dh('-o4'))])).orders[0];assert.equal(ss.rtsOpen,false);assert.equal(ss.rtsRefunded,70000,'refund only the returned parcel goods');
 // Partial return with evidence: buyer picks 1 of 2 units, writes a note and attaches a photo; photo bytes are type-checked.
 await db.sku.create({data:{id:ns+'r',name:ns+' R',category:'QA',price:80000,weightGrams:400}});await db.inventory.create({data:{warehouseId:ns+'HN',skuId:ns+'r',sellable:5}});
 const o5=await sv.placeOrder({...body,orderId:dh('-o5'),items:[{sku:ns+'r',qty:2}]});const p5=(await db.shipment.findMany({where:{orderId:o5.orderId}})).map(s=>s.id);
 for(const action of ['pack','handover','deliver'] as const)await shipmentBatch(actor.id,key(),{action,shipmentIds:p5});
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
 await assert.rejects(sv.requestReturn({...ref(dh('-o5')),reason:'Hàng bị lỗi, hư hỏng',items:[{sku:ns+'r',qty:1}],photos:['data:image/png;base64,'+Buffer.from('not really a png').toString('base64')]}),/định dạng/);
 await assert.rejects(sv.requestReturn({...ref(dh('-o5')),reason:'Hàng bị lỗi, hư hỏng',items:[{sku:ns+'r',qty:3}]}),/vượt/);
 assert.equal(await db.returnCase.count({where:{orderId:o5.orderId}}),0,'rejected requests create nothing');
 const partial={...ref(dh('-o5')),reason:'Hàng bị lỗi, hư hỏng',note:'Móp góc hộp',items:[{sku:ns+'r',qty:1}],photos:[png]};
 const pr=await sv.requestReturn(partial);const pr2=await sv.requestReturn(partial);assert.deepEqual(pr2.returns,pr.returns,'same request replays');
 const pc=await db.returnCase.findFirstOrThrow({where:{orderId:o5.orderId},include:{lines:true,photos:true}});
 assert.equal(pc.lines.length,1);assert.equal(pc.lines[0].requested,1);assert.equal(pc.customerNote,'Móp góc hộp');assert.equal(pc.photos.length,1,'replay does not duplicate photos');assert.equal(pc.photos[0].mime,'image/png');
 const rest=await sv.requestReturn({...ref(dh('-o5')),reason:'Hàng khác với mô tả',items:[{sku:ns+'r',qty:1}]});assert.notEqual(rest.returns[0].code,pr.returns[0].code,'a later partial request is its own RMA');
 await assert.rejects(sv.requestReturn({...ref(dh('-o5')),reason:'Hàng bị lỗi, hư hỏng',items:[{sku:ns+'r',qty:1}],note:'lần 3'}),/Vượt lượng/,'cannot return more than delivered in total');
 // Orders the storefront owns (valid token) but OMS does not have are reported as missing; existing ones are not.
 const ms=await sv.statuses([ref(dh('-o1')),ref(dh('-ghost')),{orderId:dh('-forged'),token:'x'}]);assert.deepEqual(ms.missing,[dh('-ghost')],'only proven-owned unknown refs are reported');assert.equal(ms.orders.length,1);
 // Not enough stock: refused before anything is created.
 await assert.rejects(sv.placeOrder({...body,orderId:dh('-o3'),items:[{sku:ns+'y',qty:1}]}),/thiếu|kho/i);
 assert.equal(await db.order.count({where:{id:dh('-o3')}}),0);
 console.log('PASS ShopVui integration: catalog/ATP, quote, idempotent intake, province->city, status mapping, bank pay once, cancel releases hold, out-of-stock refused, return -> RMA -> inspect -> refund seen by storefront, partial sender-return not cancelled + exact refund, partial customer return with note + type-checked photo; oms_test only');
}finally{await db.$disconnect();}

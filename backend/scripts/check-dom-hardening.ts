// Independent DOM/RMA security regressions. Writes local oms_test fixtures only; no bank or carrier calls.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const {checkoutQuote,createCheckout}=await import('../src/domain/orders/checkout');
const {orderCommand}=await import('../src/domain/orders/lifecycle');
const {returnCommand}=await import('../src/domain/returns/service');
const {saveCatalog}=await import('../src/domain/foundation/service');
const {placeOrder}=await import('../src/domain/integrations/shopvui');
const ns='dom2-'+randomUUID().slice(0,8),key=()=>randomUUID();
try{
 const actor=await db.account.create({data:{username:ns,name:ns,role:'QUAN_LY',passwordHash:'not-a-login-hash'}});
 const customer=await db.customer.create({data:{name:ns,phone:'0900000023',address:'12 DOM test address'}});
 for(const [id,fee]of [[ns+'near',9000],[ns+'far',0]] as const)await saveCatalog(actor.id,key(),{kind:'warehouse',id,name:id,address:'Test only',region:'HN',active:true,packingFee:fee,handlingHours:2,queueHours:0});
 await db.sku.createMany({data:[ns+'a',ns+'z'].map(id=>({id,name:id,category:'QA',price:100000,weightGrams:500}))});
 await db.inventory.createMany({data:[{warehouseId:ns+'near',skuId:ns+'a',sellable:20},{warehouseId:ns+'far',skuId:ns+'a',sellable:20},{warehouseId:ns+'near',skuId:ns+'z',sellable:20}],skipDuplicates:true});
 // saveCatalog creates zero stock rows before the SKU exists; createMany above supplies these fresh rows.
 const input={city:'HN',address:customer.address!,lines:[{skuId:ns+'a',quantity:1}],customerId:customer.id,recipient:ns,phone:customer.phone,channel:'NHAP_TAY',paymentMethod:'COD'};
 const q=await checkoutQuote(input);assert.equal(q.plan!.parcels[0].warehouseId,ns+'far');assert.equal(q.plan!.policy,'DOM-REGION-V3');assert(!('distanceKm' in q.plan!.parcels[0].route));
 assert.deepEqual((await checkoutQuote({...input,latitude:90,longitude:180})).plan,q.plan,'retired coordinates cannot change allocation');
 await db.warehouse.update({where:{id:ns+'far'},data:{packingFee:10000}});
 await assert.rejects(createCheckout(actor.id,key(),{...input,quote:q.quote}),/phương án|báo phí/,'warehouse profile change invalidates quote');
 const fresh=await checkoutQuote(input);const order=await createCheckout(actor.id,key(),{...input,quote:fresh.quote});
 const shipment=await db.shipment.findFirstOrThrow({where:{orderId:order.id}});
 await db.order.update({where:{id:order.id},data:{deadline:new Date(Date.now()+3*3600000)}});
 const held=await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:shipment.warehouseId,skuId:ns+'a'}}});
 await assert.rejects(orderCommand(actor.id,key(),order.id,{action:'pack',shipmentId:shipment.id}),/SLA/);
 assert.equal(await db.inventoryMovement.count({where:{documentId:shipment.id,kind:'XUAT'}}),0);
 assert.equal((await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:shipment.warehouseId,skuId:ns+'a'}}})).reserved,held.reserved);
 const draft=await createCheckout(actor.id,key(),{...input,mode:'draft'});await db.order.update({where:{id:draft.id},data:{deadline:new Date(Date.now()-1000)}});
 assert.equal((await checkoutQuote({...input,draftId:draft.id})).plan,null,'a draft cannot reset its 24h deadline');
 // Hold an unrelated SKU from an independent connection: confirming A must not wait on Z.
 const lock=new Client({connectionString:url.toString()});await lock.connect();let checkout:Promise<unknown>|undefined;
 try{
  await lock.query('BEGIN');await lock.query('SELECT kho_id FROM "TON_KHO" WHERE sku_id=$1 FOR UPDATE',[ns+'z']);
  const q2=await checkoutQuote(input);checkout=createCheckout(actor.id,key(),{...input,quote:q2.quote});
  let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([checkout,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Unrelated SKU lock blocked checkout')),4000);})]);}finally{if(timer)clearTimeout(timer);}
 }finally{await lock.query('ROLLBACK');await lock.end();if(checkout)await checkout;}
 // Buyer recovery requires a saved secret; knowing every public order field is insufficient.
 const secret=key()+key(),body={orderId:'DH-'+new Date(Date.now()+7*3600000).toISOString().slice(2,10).replaceAll('-','')+'-'+randomUUID().replaceAll('-','').slice(0,6).toUpperCase(),name:ns,phone:customer.phone,address:{province:'Hà Nội',detail:'12 Test'},items:[{sku:ns+'a',qty:1}],payment:'cod',recoveryKey:secret};
 const placed=await placeOrder(body);assert.equal((await placeOrder({...body,replayOnly:true})).token,placed.token);
 await assert.rejects(placeOrder({...body,replayOnly:true,recoveryKey:undefined}),(e:{status?:number})=>e.status===403);
 await assert.rejects(placeOrder({...body,replayOnly:true,recoveryKey:key()+key()}),(e:{status?:number})=>e.status===403);
 // Carrier claim remains INTERNAL and cannot jump straight to a reimbursement conclusion.
 const rqo=await checkoutQuote(input),ro=await createCheckout(actor.id,key(),{...input,quote:rqo.quote});
 const parcel=await db.shipment.findFirstOrThrow({where:{orderId:ro.id},include:{lines:true}});
 for(const action of ['pack','handover','fail']as const)await orderCommand(actor.id,key(),ro.id,{action,shipmentId:parcel.id,...(action==='fail'?{reason:'Fixture delivery failed'}:{})});
 const r=await orderCommand(actor.id,key(),ro.id,{action:'returnToSender',shipmentId:parcel.id,openReturn:true}) as {returnId:string};
 const line=await db.returnLine.findFirstOrThrow({where:{returnId:r.returnId}}),inspectKey=key();
 const inspect={action:'inspect',lineId:line.id,received:1,passed:0,failed:1,refundQuantity:0,damageCause:'VAN_CHUYEN',reason:'Fixture transit damage'};
 await returnCommand(actor.id,inspectKey,r.returnId,inspect);await returnCommand(actor.id,inspectKey,r.returnId,inspect);
 const claims=await db.carrierClaim.findMany({where:{returnId:r.returnId}});assert.equal(claims.length,1);
 await assert.rejects(returnCommand(actor.id,key(),r.returnId,{action:'claim',claimId:claims[0].id,status:'DUOC_BOI_THUONG',note:'Skip sent'}),/Trạng thái/);
 for(const status of ['DA_GUI','DUOC_BOI_THUONG'])await returnCommand(actor.id,key(),r.returnId,{action:'claim',claimId:claims[0].id,status,note:'Recorded externally, fixture only'});
 await assert.rejects(returnCommand(actor.id,key(),r.returnId,{action:'claim',claimId:claims[0].id,status:'CHO_GUI',note:'Rewind'}),/Trạng thái/);
 assert.equal(await db.moneyTransaction.count({where:{orderId:ro.id}}),0,'claim state never creates a money transaction');
 console.log('PASS regional DOM cost priority (no coordinates), quote invalidation, SLA delay/stock preservation, draft deadline, independent unrelated-SKU lock, secret-based recovery, RMA/claim replay and lifecycle; oms_test only');
}finally{await db.$disconnect();}

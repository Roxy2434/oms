// Demo data on the MAIN DB (user-requested): one COD order split over two warehouses,
// parcel 1 delivered (COD not yet recorded), parcel 2 still in delivery — to try the parcel/COD buttons by hand.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const {db}=await import('../src/server/db');
const {checkoutQuote,createCheckout}=await import('../src/domain/orders/checkout');
const {shipmentBatch}=await import('../src/domain/orders/batch');
try{
 const actor=await db.account.findUniqueOrThrow({where:{username:'quanly'}});
 const customer=await db.customer.findFirstOrThrow({where:{city:'DN'},orderBy:{createdAt:'asc'}});
 const lines=[{skuId:'HT-1200',quantity:1},{skuId:'BT-750-XANH',quantity:1}];
 const base={city:'DN' as const,address:customer.address,lines};
 const q=await checkoutQuote(base);assert(q.quote,'Không xếp được kho: '+q.reasons.join(' '));
 assert.equal(q.plan!.parcels.length,2,'Cần đơn tách 2 kho');
 const order=await createCheckout(actor.id,randomUUID(),{...base,customerId:customer.id,recipient:customer.name,phone:customer.phone,channel:'NHAP_TAY',paymentMethod:'COD',quote:q.quote});
 const parcels=await db.shipment.findMany({where:{orderId:order.id},orderBy:{createdAt:'asc'},include:{warehouse:true}});
 for(const action of ['pack','handover'] as const)assert((await shipmentBatch(actor.id,randomUUID(),{action,shipmentIds:parcels.map(p=>p.id)})).results.every(r=>r.ok));
 assert((await shipmentBatch(actor.id,randomUUID(),{action:'deliver',shipmentIds:[parcels[0].id]})).results[0].ok);
 console.log(JSON.stringify({order:order.id,customer:customer.name,parcel1:parcels[0].warehouse.name+' (đã giao)',parcel2:parcels[1].warehouse.name+' (đang giao)'}));
}finally{await db.$disconnect();}

import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {db} from '../src/server/db';
import {resolveOrderId} from '../src/domain/orders/identifiers';
import {customers,warehouses,shippingAddress} from '../prisma/presentation-fixtures';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,process.env.OMS_DB_PORT||'55432');assert.equal(url.pathname,'/oms','Only the owned local sample DB may be normalized');
const key='presentation-fixtures-v1';
try{const result=await db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM "DON_HANG" ORDER BY id FOR UPDATE`;
 const previous=await tx.auditLog.findUnique({where:{commandKey:key}});if(previous)return previous.result;
 const [orders,stock,money,shipments,returns,movements]=await Promise.all([tx.order.findMany({include:{lines:true}}),tx.inventory.findMany({orderBy:[{warehouseId:'asc'},{skuId:'asc'}]}),tx.moneyTransaction.findMany({orderBy:{id:'asc'}}),tx.shipment.findMany(),tx.returnCase.findMany(),tx.inventoryMovement.findMany()]);
 const stockProof=JSON.stringify(stock);const moneyProof=JSON.stringify(money.map(t=>({id:t.id,amount:t.amount.toFixed(0),kind:t.kind,status:t.status,confirmedAt:t.confirmedAt})));
 const mapping=orders.filter(o=>resolveOrderId(o.id)!==o.id).map(o=>({from:o.id,to:resolveOrderId(o.id)}));
 for(const m of mapping)assert(!orders.some(o=>o.id===m.to),'Target code already used');
 for(const [i,c]of customers.entries()){const old=await tx.customer.findUnique({where:{id:c.id}});if(!old)continue;const after={name:c.name,phone:c.phone,email:c.email,address:shippingAddress(i,['HN-NOITHANH','DN-NOITHANH','HCM-NOITHANH'][i%3])};await tx.customer.update({where:{id:c.id},data:after});await tx.auditLog.create({data:{actorId:'QL-01',entity:'KHACH_HANG',entityId:c.id,action:'CHUAN_HOA_THONG_TIN',reason:'Thay thông tin hư cấu của bộ dữ liệu khởi tạo theo yêu cầu người dùng; không phải cập nhật khách hàng thực.',before:{name:old.name,phone:old.phone,address:old.address},after}});}
 for(const w of warehouses)await tx.warehouse.update({where:{id:w.id},data:{address:w.address}});
 for(const [id,name]of [['QL-01','Nguyễn Quang Minh'],['NV-01','Trần Hoài An'],['NV-02','Phạm Thanh Bình']])await tx.account.update({where:{id},data:{name}});
 for(const o of orders){const c=customers.find(c=>c.id===o.customerId);if(!c)continue;const i=customers.findIndex(c=>c.id===o.customerId);const target=resolveOrderId(o.id);const after={recipient:c.name,phone:c.phone,address:shippingAddress(i,o.region)};
  // This explicit sample-data correction is recorded, rather than silently rewriting snapshots.
  await tx.order.update({where:{id:o.id},data:{id:target,...after,reason:o.reason?.replace(/\s*[—–-]\s*dữ liệu demo/gi,'').replace(/demo/gi,'')??null}});
  await tx.auditLog.create({data:{actorId:'QL-01',entity:'DON_HANG',entityId:target,action:'CHUAN_HOA_THONG_TIN',reason:'Chuẩn hóa bộ dữ liệu hư cấu theo yêu cầu; giữ nguyên giá chụp, lượng hàng, trạng thái và giao dịch tiền.',before:{id:o.id,recipient:o.recipient,phone:o.phone,address:o.address},after:{id:target,...after}}});
 }
 // Keep old immutable ledger/audit references intact. Their original labels remain forensic history.
 // Current document references and tracking codes are changed with separate audit evidence.
 // Existing money references, shipment evidence, return decisions and stock ledger are immutable.
 // Friendly labels are derived by the presentation layer, not written over those documents.
 assert.equal(JSON.stringify(await tx.inventory.findMany({orderBy:[{warehouseId:'asc'},{skuId:'asc'}]})),stockProof);
 const afterMoney=await tx.moneyTransaction.findMany({orderBy:{id:'asc'}});assert.equal(JSON.stringify(afterMoney.map(t=>({id:t.id,amount:t.amount.toFixed(0),kind:t.kind,status:t.status,confirmedAt:t.confirmedAt}))),moneyProof);
 assert.equal(await tx.order.count(),orders.length);assert.equal(await tx.shipment.count(),shipments.length);assert.equal(await tx.returnCase.count(),returns.length);assert.equal(await tx.inventoryMovement.count(),movements.length);
 for(const o of orders){const n=await tx.order.findUniqueOrThrow({where:{id:resolveOrderId(o.id)},include:{lines:true}});assert.equal(n.status,o.status);assert.equal(n.shippingFee.toFixed(0),o.shippingFee.toFixed(0));assert.deepEqual(n.lines.map(l=>({id:l.id,q:l.quantity,p:l.priceSnapshot.toFixed(0)})).sort((a,b)=>a.id.localeCompare(b.id)),o.lines.map(l=>({id:l.id,q:l.quantity,p:l.priceSnapshot.toFixed(0)})).sort((a,b)=>a.id.localeCompare(b.id)));}
 const result={mapping,orders:orders.length,stockUnchanged:true,moneyAmountsAndStatusesUnchanged:true,orderLinesAndStatusesUnchanged:true,shipmentReturnMovementCountsUnchanged:true,originalAuditAndStockLedgerPreserved:true};
 await tx.auditLog.create({data:{actorId:'QL-01',entity:'SYSTEM',entityId:'presentation-fixtures',action:'CHUAN_HOA_THONG_TIN',commandKey:key,result,reason:'Bộ dữ liệu hư cấu có cách trình bày như vận hành thực; không liên hệ thông tin này ngoài ứng dụng.'}});return result;
 },{isolationLevel:'Serializable',timeout:60000});await mkdir('artifacts/qa',{recursive:true});await writeFile('artifacts/qa/presentation-normalization.json',JSON.stringify(result,null,2));console.log('PASS presentation normalization; stock, money, quantities, statuses and historical records preserved.');}finally{await db.$disconnect();}

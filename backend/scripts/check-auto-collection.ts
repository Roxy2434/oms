// Regression for automatic receipt amounts/references. Never writes the main database.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import {SignJWT} from 'jose';
const url=new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const {createDraft}=await import('../src/domain/orders/service');
const {allocationPreview}=await import('../src/domain/allocation/preview');
const {orderCommand}=await import('../src/domain/orders/lifecycle');
const {paymentCommand}=await import('../src/domain/payments/service');
const {DomainError}=await import('../src/server/commands');
const ns='autocol-'+randomUUID().slice(0,8),key=()=>randomUUID(),results:{name:string;pass:boolean;error?:string}[]=[];
const origin='http://127.0.0.1:3002';let server:ChildProcess|undefined;
async function check(name:string,run:()=>Promise<void>){try{await run();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e instanceof Error?e.message:String(e)});}}
const domain409=(e:unknown)=>e instanceof DomainError&&e.status===409;
try{
 const actor=await db.account.create({data:{username:ns,name:ns,role:'QUAN_LY',passwordHash:'not-a-login-hash'}});
 const customer=await db.customer.create({data:{name:ns,phone:'0900000000',address:'12 Regression test address',city:'DN'}});
 await db.warehouse.createMany({data:[{id:ns+'HN',name:ns+' HN',region:'HN',address:'Test only'},{id:ns+'DN',name:ns+' DN',region:'DN',address:'Test only'}]});
 await db.sku.createMany({data:[{id:ns+'a',name:ns+' A',category:'QA',price:100000,weightGrams:100},{id:ns+'b',name:ns+' B',category:'QA',price:90000,weightGrams:100}]});
 await db.inventory.createMany({data:[{warehouseId:ns+'HN',skuId:ns+'a',sellable:100},{warehouseId:ns+'DN',skuId:ns+'b',sellable:100}]});
 async function setup(method:'COD'|'TRA_TRUOC',split=false){
  const o=await createDraft(actor.id,key(),{customerId:customer.id,channel:'NHAP_TAY',recipient:ns,phone:customer.phone,address:customer.address,region:'DN-NOITHANH',paymentMethod:method,shippingFee:30000,lines:[{skuId:ns+'a',quantity:1},...(split?[{skuId:ns+'b',quantity:1}]:[])]});
  const preview=await allocationPreview(o.id);await orderCommand(actor.id,key(),o.id,{action:'confirm',version:preview.version,plan:preview.plan});
  const shipments=await db.shipment.findMany({where:{orderId:o.id},orderBy:{warehouseId:'asc'}});
  return {id:o.id,shipments};
 }
 async function deliver(o:Awaited<ReturnType<typeof setup>>){for(const s of o.shipments)for(const action of ['pack','handover','deliver'])await orderCommand(actor.id,key(),o.id,{action,shipmentId:s.id});}
 async function pending(orderId:string,amount:number,shipmentId?:string){return paymentCommand(actor.id,key(),orderId,{action:'record',kind:'THU',reason:shipmentId?'THU_COD':'THU_TRA_TRUOC',shipmentId,amount,source:shipmentId?'COD_MO_PHONG':'CHUYEN_KHOAN',reference:ns+'-'+key(),note:'QA pending collection reserves capacity',status:'CHUA_RO'});}
 await check('COD auto amount is selected-parcel remainder, reserves pending, replays exactly',async()=>{
  const o=await setup('COD',true);assert.equal(o.shipments.length,2);await deliver(o);const s=o.shipments[0];await pending(o.id,20000,s.id);
  await assert.rejects(()=>orderCommand(actor.id,key(),o.id,{action:'collect',shipmentId:s.id,amount:Number(s.codAmount)-19999}),domain409);
  const k=key(),body={action:'collect',shipmentId:s.id};const a=await orderCommand(actor.id,k,o.id,body),b=await orderCommand(actor.id,k,o.id,body);assert.deepEqual(a,b);
  const rows=await db.moneyTransaction.findMany({where:{orderId:o.id,shipmentId:s.id}});assert.equal(rows.length,2);assert.equal(Number(rows.find(t=>t.id===a.transactionId)!.amount),Number(s.codAmount)-20000);
  await assert.rejects(()=>orderCommand(actor.id,key(),o.id,body),domain409);await assert.rejects(()=>orderCommand(actor.id,key(),o.id,{action:'collect',shipmentId:'not-this-order'}),domain409);
  await orderCommand(actor.id,key(),o.id,{action:'collect',shipmentId:o.shipments[1].id});assert.equal(await db.moneyTransaction.count({where:{orderId:o.id}}),3);
 });
 await check('prepaid fully paid or fully pending returns domain409 without zero receipts',async()=>{
  const o=await setup('TRA_TRUOC');const k=key(),body={action:'collect'};const a=await orderCommand(actor.id,k,o.id,body);assert.deepEqual(await orderCommand(actor.id,k,o.id,body),a);
  await assert.rejects(()=>orderCommand(actor.id,key(),o.id,body),domain409);assert.equal(await db.moneyTransaction.count({where:{orderId:o.id}}),1);
  const held=await setup('TRA_TRUOC');await pending(held.id,130000);await assert.rejects(()=>orderCommand(actor.id,key(),held.id,body),domain409);assert.equal(await db.moneyTransaction.count({where:{orderId:held.id}}),1);
 });
 await check('distinct keys with same24char prefix produce distinct stable receipt references',async()=>{
  const o=await setup('TRA_TRUOC'),prefix=ns+'-identical-long-key-prefix-';const body={action:'collect',amount:10000};
  const a=await orderCommand(actor.id,prefix+'one',o.id,body),b=await orderCommand(actor.id,prefix+'two',o.id,body);assert.notEqual(a.transactionId,b.transactionId);assert.deepEqual(await orderCommand(actor.id,prefix+'one',o.id,body),a);
  const rows=await db.moneyTransaction.findMany({where:{orderId:o.id}});assert.equal(rows.length,2);assert.equal(new Set(rows.map(t=>t.reference)).size,2);
 });
 await check('fee receipts use full keys, auto remainder, and domain409 at zero',async()=>{
  const o=await setup('COD'),s=o.shipments[0];for(const action of ['pack','handover'])await orderCommand(actor.id,key(),o.id,{action,shipmentId:s.id});
  await orderCommand(actor.id,key(),o.id,{action:'fail',shipmentId:s.id,reason:'QA delivery failed'});await orderCommand(actor.id,key(),o.id,{action:'returnToSender',shipmentId:s.id,reason:'QA source returning'});
  const prefix=ns+'-same-fee-reference-prefix-';await orderCommand(actor.id,prefix+'one',o.id,{action:'collectFee',amount:10000});await orderCommand(actor.id,prefix+'two',o.id,{action:'collectFee',amount:10000});
  const k=key(),body={action:'collectFee'};const receipt=await orderCommand(actor.id,k,o.id,body);assert.deepEqual(await orderCommand(actor.id,k,o.id,body),receipt);
  const rows=await db.moneyTransaction.findMany({where:{orderId:o.id}});assert.equal(rows.length,3);assert.equal(new Set(rows.map(t=>t.reference)).size,3);assert.equal(rows.reduce((n,t)=>n+Number(t.amount),0),30000);
  await assert.rejects(()=>orderCommand(actor.id,key(),o.id,body),domain409);assert.equal(await db.moneyTransaction.count({where:{orderId:o.id}}),3);
  const covered=await setup('COD');await assert.rejects(()=>orderCommand(actor.id,key(),covered.id,body),domain409);assert.equal(await db.moneyTransaction.count({where:{orderId:covered.id}}),0);
 });
 await check('concurrent full automatic receipts commit once',async()=>{
  const o=await setup('TRA_TRUOC');const race=await Promise.allSettled([orderCommand(actor.id,key(),o.id,{action:'collect'}),orderCommand(actor.id,key(),o.id,{action:'collect'})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);const failed=race.find(r=>r.status==='rejected') as PromiseRejectedResult;assert(domain409(failed.reason));assert.equal(await db.moneyTransaction.count({where:{orderId:o.id}}),1);
 });
 if(process.argv.includes('--http'))await check('actual commands HTTP route: COD omitted amount200, replay200, settled409 not503, prefixes200',async()=>{
  await new Promise<void>((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(3002,'127.0.0.1',()=>s.close(()=>resolve()));});
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,APP_ORIGIN:origin},stdio:'ignore'});
  let ready=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Owned HTTP test server exited');try{const r=await fetch(origin+'/api/health');if(r.ok){ready=true;break;}}catch{}await delay(100);}assert(ready);
  const token=await new SignJWT({sv:1}).setProtectedHeader({alg:'HS256'}).setSubject(actor.id).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  async function post(id:string,k:string,body:unknown,expected:number){const r=await fetch(origin+'/api/orders/'+id+'/commands',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:'oms_session='+token,'Idempotency-Key':k},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
  const cod=await setup('COD',true);await deliver(cod);const k=key(),body={action:'collect',shipmentId:cod.shipments[0].id};const first=await post(cod.id,k,body,200);assert.deepEqual(await post(cod.id,k,body,200),first);await post(cod.id,key(),body,409);await post(cod.id,key(),{action:'collect',shipmentId:cod.shipments[1].id},200);assert.equal(await db.moneyTransaction.count({where:{orderId:cod.id}}),2);
  const pre=await setup('TRA_TRUOC'),prefix=ns+'-http-identical-key-prefix-';await post(pre.id,prefix+'one',{action:'collect',amount:10000},200);await post(pre.id,prefix+'two',{action:'collect',amount:10000},200);await post(pre.id,key(),{action:'collect'},200);await post(pre.id,key(),{action:'collect'},409);assert.equal(await db.moneyTransaction.count({where:{orderId:pre.id}}),3);
 });
 await mkdir('artifacts/qa/auto-collection',{recursive:true});await writeFile('artifacts/qa/auto-collection/'+(process.argv.includes('--http')?'http':'services')+'.json',JSON.stringify({at:new Date().toISOString(),database:'oms_test',namespace:ns,results},null,2));console.log(JSON.stringify(results,null,2));assert(results.every(r=>r.pass),'Automatic collection regression failed');
}finally{if(server&&server.exitCode===null){const stopped=new Promise<void>(resolve=>server!.once('exit',()=>resolve()));server.kill();await stopped;}await db.$disconnect();}

// Isolated database only; all bank provider responses are injected, NEVER real transfers/API calls.
import 'dotenv/config';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,process.env.OMS_DB_PORT||'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();process.env.OMS_PUBLIC_DEPLOYMENT='1';process.env.OMS_DEMO_MODE='1';process.env.OMS_DEMO_REAL_BANK='1';process.env.SEPAY_POLL='off';
const ns='pub'+randomUUID().replaceAll('-','').slice(0,10);process.env.SEPAY_ACCOUNT=ns;process.env.SEPAY_API_TOKEN='fake-provider-only';process.env.SEPAY_START_ID='0';
const {db}=await import('../src/server/db');const {durableLimit,clientIdentity}=await import('../src/server/public-security');const {registerShop,shopState}=await import('../src/domain/storefront/accounts');const sv=await import('../src/domain/integrations/shopvui');const {recordTransfer}=await import('../src/domain/payments/sepay');const {syncSepay,bankSyncReady}=await import('../src/domain/payments/sepay-sync');
const {paymentCommand}=await import('../src/domain/payments/service');
const key=createHash('sha256').update('sepay:'+ns).digest('hex');const address={province:'TP. Hồ Chí Minh',ward:'Phường QA',detail:'12 Đường QA'};const code=(n:number)=>'DH-'+new Date(Date.now()+7*3600000).toISOString().slice(2,10).replaceAll('-','')+'-'+createHash('sha256').update(ns+n).digest('hex').slice(0,6).toUpperCase();
try{
 const limits=await Promise.allSettled(Array.from({length:20},()=>durableLimit(ns,7,60000)));assert.equal(limits.filter(x=>x.status==='fulfilled').length,7);assert.equal((await db.publicRateLimit.findUniqueOrThrow({where:{key:ns}})).count,7);await assert.rejects(durableLimit(ns,7,60000),e=>(e as {status:number}).status===429);
 assert.throws(()=>clientIdentity(new Request('https://shop.test')),/Proxy/);const hash=clientIdentity(new Request('https://shop.test',{headers:{'X-Real-IP':'203.0.113.1'}}));assert.equal(hash.length,64);assert(!hash.includes('203.0'));
 const buyer=await registerShop({username:ns,contact:ns+'@example.test',password:'QaDemo1234'});assert.equal((await shopState(buyer.id)).balance,6000000);
 await db.sku.create({data:{id:ns,name:ns,price:100,weightGrams:100,category:'QA'}});await db.warehouse.create({data:{id:ns,name:ns,region:'HCM',address:'QA'}});await db.inventory.create({data:{warehouseId:ns,skuId:ns,sellable:200}});
 await db.sepayCursor.create({data:{id:key,lastId:'0',syncedAt:new Date()}});assert(await bankSyncReady());
 const make=(n:number,payment:'wallet'|'cod'|'bank',ack=false)=>sv.placeOrder({orderId:code(n),recoveryKey:randomUUID()+randomUUID(),name:'Khách public QA',phone:'0900000001',address,items:[{sku:ns,qty:1}],payment,realBankAcknowledged:ack},buyer.id);
 await make(1,'wallet');await make(2,'cod');await assert.rejects(make(3,'bank'),/Xác nhận/);assert.equal(await db.order.count({where:{id:code(3)}}),0);
 const bank=await make(3,'bank',true);assert((await db.shopPurchase.findUniqueOrThrow({where:{orderId:bank.orderId}})).realBankConsentAt);
 const before=(await shopState(buyer.id)).balance;const stock=await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:ns,skuId:ns}}});
 await assert.rejects(make(4,'wallet'),/Giới hạn demo/);assert.equal(await db.order.count({where:{id:code(4)}}),0);assert.equal((await shopState(buyer.id)).balance,before);assert.deepEqual(await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:ns,skuId:ns}}}),stock);
 const amount=bank.qr!.amount;await recordTransfer({id:ns+'real',amount,content:bank.orderId,reference:ns+'real'});assert.equal((await shopState(buyer.id)).balance,before);const cancel=await sv.cancel({orderId:bank.orderId,token:bank.token,reason:'QA kiểm hoàn ngân hàng'});assert.equal(cancel.refunded,false);assert.equal(cancel.refundPending,true);assert.equal((await shopState(buyer.id)).balance,before);
 const manager=await db.account.findFirstOrThrow({where:{role:'QUAN_LY',active:true}}),staff=await db.account.findFirstOrThrow({where:{role:'NHAN_VIEN',active:true}});
 const refund={action:'record',kind:'HOAN',reason:'HOAN_HUY',amount,source:'CHUYEN_KHOAN',reference:'QA-proof-'+ns,note:'QA chỉ kiểm chặn, không chuyển tiền',status:'THANH_CONG'};
 await assert.rejects(paymentCommand(staff.id,randomUUID(),bank.orderId,{...refund,bankEvidenceConfirmed:true}),/Quản lý/);
 await assert.rejects(paymentCommand(manager.id,randomUUID(),bank.orderId,refund),/chứng từ ngân hàng/);
 await assert.rejects(paymentCommand(manager.id,randomUUID(),bank.orderId,{...refund,source:'VI_MO_PHONG',bankEvidenceConfirmed:true}),/mô phỏng/);
 assert.equal((await sv.statuses([{orderId:code(1),token:sv.orderToken(code(1))}])).orders[0].qr,undefined);
 const base=BigInt(Date.now())*100n;await db.sepayCursor.update({where:{id:key},data:{lastId:String(base)}});
 const rows=[3,1,2].map(n=>({id:String(base+BigInt(n)),amount_in:'100',transaction_content:'unmatched QA',reference_number:ns+n}));
 const fetcher=async()=>Response.json({transactions:rows});let fail=true;
 const record=async(t:{id:string})=>{if(fail&&t.id===String(base+2n))throw Error('provider/database transient');return null;};
 await assert.rejects(syncSepay({account:ns,token:'fake'},record,fetcher),/transient/);assert.equal((await db.sepayCursor.findUniqueOrThrow({where:{id:key}})).lastId,String(base+1n));assert.equal(await bankSyncReady(),false);
 fail=false;await syncSepay({account:ns,token:'fake'},record,fetcher);assert.equal((await db.sepayCursor.findUniqueOrThrow({where:{id:key}})).lastId,String(base+3n));assert(await bankSyncReady());
 await assert.rejects(syncSepay({account:ns,token:'fake'},record,async()=>Response.json({transactions:Array(5000).fill(rows[0])})),/backlog/);assert.equal((await db.sepayCursor.findUniqueOrThrow({where:{id:key}})).lastId,String(base+3n));assert.equal(await bankSyncReady(),false);
 await assert.rejects(make(5,'bank',true),/Đối soát ngân hàng chưa sẵn sàng/);
 console.log('PASS public durable concurrency/IP privacy; wallet grant once; 3-hold quota atomic rollback; bank consent; real receipt never credits fake wallet; bank cancellation pending real refund; no bank QR for wallet; durable ordered SePay restart/retry/overflow fail-closed. oms_test only.');
}finally{await db.$disconnect();}

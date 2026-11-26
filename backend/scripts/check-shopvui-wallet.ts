// E2E: ShopVuiPay wallet. Top up, pay an OMS order from the wallet, cancel it (OMS refunds → wallet credited back),
// pay again, ship, return and inspect in OMS (auto refund → wallet credited). Isolated OMS on 3002 + oms_test, storefront on 8001.
import 'dotenv/config';
import {setupShopBuyer} from './helpers/shop-buyer';
import {spawn,type ChildProcess} from 'node:child_process';
import {createServer as netServer} from 'node:net';
import {createServer,type Server} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,extname,normalize} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import {chromium,expect,type Page} from '@playwright/test';
import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,process.env.OMS_DB_PORT||'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');const {shipmentBatch}=await import('../src/domain/orders/batch');const {returnCommand}=await import('../src/domain/returns/service');
const oms='http://127.0.0.1:3002',shop='http://127.0.0.1:8001',ns='svw-'+randomUUID().slice(0,8),dir='artifacts/qa/shopvui-wallet';
let server:ChildProcess|undefined,files:Server|undefined;const b=await chromium.launch({channel:'msedge',headless:true});const started=new Date();
const free=(port:number)=>new Promise<void>((resolve,reject)=>{const s=netServer();s.on('error',reject);s.listen(port,'127.0.0.1',()=>s.close(()=>resolve()));});
const balance=(p:Page)=>p.evaluate(()=>(window as unknown as {SV:{wallet:{balance:()=>number}}}).SV.wallet.balance());
/** Waits until the storefront's wallet shows `want` (it syncs with OMS on load / every 10 s; reload nudges it). */
async function walletBecomes(p:Page,want:number){for(let n=0;n<30;n++){if(await balance(p)===want)return;if(n%6===5)await p.reload();await delay(500);}assert.equal(await balance(p),want,'wallet balance');}
async function buyWithWallet(p:Page){
 await p.goto(shop+'/#/product/oms-HT-1200');await expect(p.getByText(/sản phẩm có sẵn/)).toContainText(/\d/);
 await p.getByRole('button',{name:'Mua Ngay'}).click();await expect(p).toHaveURL(/#\/checkout/);
 await expect(p.locator('.co-group').filter({hasText:'EZMART'}).locator('.co-ship')).toContainText('Giao từ kho EZMART',{timeout:10000});
 await p.locator('[data-pay=wallet]').click();await expect(p.locator('.co-pay-desc')).toContainText('Số dư ví');
 await p.locator('[data-act=place]').click();await expect(p.getByRole('heading',{name:'Đặt hàng thành công!'})).toBeVisible({timeout:10000});
 const order=await db.order.findFirstOrThrow({where:{channel:'SHOPVUI',createdAt:{gte:started}},orderBy:{createdAt:'desc'},include:{shipments:true,transactions:true,lines:true}});
 assert.equal(order.paymentMethod,'TRA_TRUOC');assert(order.transactions.some(t=>t.kind==='THU'&&t.status==='THANH_CONG'),'wallet payment recorded in OMS');
 return {order,total:order.lines.reduce((s,l)=>s+Number(l.priceSnapshot)*l.quantity,0)+Number(order.shippingFee)};
}
try{
 await mkdir(dir,{recursive:true});await free(3002);await free(8001);
 const root=join(process.cwd(),'..','frontend'),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 files=createServer(async(req,res)=>{const path=normalize(decodeURIComponent((req.url??'/').split('?')[0])).replace(/^([/\\])+/,'')||'index.html';const full=join(root,path);if(!full.startsWith(root)){res.writeHead(403).end();return;}try{res.writeHead(200,{'Content-Type':types[extname(full)]??'application/octet-stream'}).end(await readFile(full));}catch{res.writeHead(404).end();}}).listen(8001,'127.0.0.1');
 await db.sku.upsert({where:{id:'HT-1200'},update:{active:true},create:{id:'HT-1200',name:'Hộp thực phẩm 1.200ml',variant:'Trong suốt',category:'Đồ bếp',price:90000,weightGrams:300}});
 await db.warehouse.create({data:{id:ns+'HCM',name:ns+' HCM',region:'HCM',address:'QA'}});await db.inventory.create({data:{warehouseId:ns+'HCM',skuId:'HT-1200',sellable:20}});
 const actor=await db.account.create({data:{username:ns,name:'Wallet QA',role:'NHAN_VIEN',passwordHash:'no-login-password'}});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,APP_ORIGIN:oms,SHOPVUI_ORIGIN:shop},stdio:'ignore'});
 let ready=false;for(let n=0;n<80;n++){try{if((await fetch(oms+'/api/health')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready);
 const c=await b.newContext({viewport:{width:1366,height:900}});await c.addInitScript(`window.SV_OMS={base:'${oms}/api/integrations/shopvui',key:'shopvui-local-demo',shopId:'oms'}`);
 const p=await c.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 const buyer=await setupShopBuyer(c,oms,shop,ns);await p.goto(shop+'/#/login');await p.locator('input[name=account]').fill(buyer.username);await p.locator('input[type=password]').first().fill(buyer.password);await p.getByRole('button',{name:'ĐĂNG NHẬP',exact:true}).click();await expect(p).not.toHaveURL(/#\/login/);

 // 1. Wallet page: every account starts with 6,000,000 and there is no top-up.
 const START=6000000;
 await p.goto(shop+'/#/user/wallet');await expect(p.locator('.wallet-card')).toContainText('6.000.000');
 assert.equal(await p.getByRole('button',{name:'Nạp tiền'}).count(),0,'no top-up');assert.equal(await balance(p),START);
 await p.reload();await expect.poll(()=>balance(p)).toBe(START);

 // 2. Pay an OMS order from the wallet, then cancel it: OMS refunds to the wallet and the storefront credits it back.
 const first=await buyWithWallet(p);assert.equal(await balance(p),START-first.total,'wallet debited by the order total');
 const id1=await p.evaluate(async(omsId)=>{const S=(window as unknown as {SV:{orders:{list:(f:object)=>{id:string;code:string;oms?:object}[];cancel:(id:string,r:string)=>Promise<{ok:boolean}>}}}).SV;const o=S.orders.list({}).find(x=>x.oms&&x.code===omsId)!;return (await S.orders.cancel(o.id,'Muốn thay đổi sản phẩm')).ok;},first.order.id);
 assert(id1,'buyer cancel accepted');
 await walletBecomes(p,START);
 const cancelled=await db.order.findUniqueOrThrow({where:{id:first.order.id},include:{transactions:true}});assert.equal(cancelled.status,'DA_HUY');assert(cancelled.transactions.some(t=>t.kind==='HOAN'&&t.status==='THANH_CONG'),'OMS recorded the refund');

 // 3. Pay again, ship, return; OMS inspects and auto-refunds the goods (not the shipping fee): wallet credited once.
 const second=await buyWithWallet(p);const afterPay=START-second.total;assert.equal(await balance(p),afterPay);
 const parcels=second.order.shipments.map(s=>s.id);for(const action of ['pack','handover','deliver'] as const)assert((await shipmentBatch(actor.id,randomUUID(),{action,shipmentIds:parcels})).results.every(r=>r.ok));
 await p.goto(shop+'/#/user/purchase?type=completed');await p.reload();
 const card=p.locator('.order').filter({hasText:'EZMART'}).filter({has:p.getByRole('button',{name:'Trả Hàng/Hoàn Tiền'})}).first();
 await expect(card).toBeVisible({timeout:15000});
 // OMS packed, handed over and delivered between two syncs: the skipped milestones are back-filled and the stepper shows them done.
 const svId=await p.evaluate((omsId)=>{const S=(window as unknown as {SV:{orders:{list:(f:object)=>{id:string;history:{code:string}[];code:string;oms?:object}[]}}}).SV;const o=S.orders.list({}).find(x=>x.oms&&x.code===omsId)!;return {id:o.id,codes:o.history.map(h=>h.code)};},second.order.id);
 for(const code of ['PLACED','CONFIRMED','SHIPPED','DELIVERED'])assert(svId.codes.includes(code),'history has '+code);
 await p.goto(shop+'/#/user/order/'+svId.id);await expect(p.locator('.stepper .step.done')).toHaveCount(4);await p.screenshot({path:dir+'/order-stepper.png'});
 await p.goto(shop+'/#/user/purchase?type=completed');await expect(card).toBeVisible({timeout:15000});await card.getByRole('button',{name:'Trả Hàng/Hoàn Tiền'}).click();
 const dlg=p.locator('.modal, [role=dialog]').filter({hasText:'Yêu Cầu Trả Hàng'}).first();await dlg.locator('input[name=reason]').first().check();await dlg.getByRole('button',{name:'Gửi Yêu Cầu'}).click();
 await expect(p.getByText('Đã gửi yêu cầu trả hàng/hoàn tiền')).toBeVisible({timeout:10000});
 const rma=await db.returnCase.findFirstOrThrow({where:{orderId:second.order.id},include:{lines:true}});
 for(const l of rma.lines)await returnCommand(actor.id,randomUUID(),rma.id,{action:'inspect',lineId:l.id,received:l.approved,passed:l.approved,failed:0,refundQuantity:l.approved,reason:'Nguyên seal',autoSettle:true});
 const refund=(await db.moneyTransaction.findFirstOrThrow({where:{orderId:second.order.id,kind:'HOAN',reason:'HOAN_RMA',status:'THANH_CONG'}}));assert.match(refund.note??'',/Ví ShopVuiPay/);
 await p.goto(shop+'/#/user/purchase?type=return');await walletBecomes(p,afterPay+Number(refund.amount));
 await p.reload();await delay(2500);assert.equal(await balance(p),afterPay+Number(refund.amount),'no double credit on later syncs');

 // 4. Wallet page lists the movements; screenshots at desktop and phone width.
 await p.goto(shop+'/#/user/wallet');await expect(p.locator('.wallet-tx li')).toHaveCount(5);await expect(p.locator('.wallet-tx')).toContainText('Hoàn tiền');await expect(p.locator('.wallet-tx')).toContainText('Số dư ban đầu');
 await p.screenshot({path:dir+'/wallet-1366.png',fullPage:true});await p.setViewportSize({width:390,height:844});await p.reload();await expect(p.locator('.wallet-card')).toBeVisible();
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at 390');await p.screenshot({path:dir+'/wallet-390.png',fullPage:true});
 // 5. Browser-ledger tampering cannot alter the server-owned wallet. Insufficient/concurrent spending is covered by check-shop-accounts.ts.
 const trusted=await balance(p);
 await p.evaluate(()=>{const S=(window as unknown as {SV:{db:{data:()=>{walletTx:object[];session:string};save:()=>void}}}).SV;const d=S.db.data();d.walletTx.push({id:'w-test',userId:d.session,type:'OPEN',amount:999999999,note:'Forged local credit',at:new Date().toISOString()});S.db.save();});
 assert.equal(await balance(p),trusted,'local ledger is not payment authority');
 await p.reload();await expect.poll(()=>balance(p)).toBe(trusted);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',paid:[first.total,second.total],refundedRma:Number(refund.amount),balance:await balance(p),scope:'ShopVui wallet ↔ OMS refunds; oms_test only'}));
}finally{server?.kill();files?.close();await b.close();await db.$disconnect();}

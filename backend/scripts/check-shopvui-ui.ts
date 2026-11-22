// E2E: a buyer orders from the "OMS Gia Dụng" shop on the ShopVui storefront; the order appears in OMS (channel ShopVui),
// the warehouse ships it, and the buyer's ShopVui order follows. Isolated OMS on 3002 + oms_test, storefront served on 8001.
import 'dotenv/config';
import {spawn,type ChildProcess} from 'node:child_process';import {createServer as netServer} from 'node:net';import {createServer,type Server} from 'node:http';import {readFile} from 'node:fs/promises';import {join,extname,normalize} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {randomUUID} from 'node:crypto';import {mkdir} from 'node:fs/promises';import {SignJWT} from 'jose';import {chromium,expect} from '@playwright/test';import {settle} from './helpers/motion'
import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const {shipmentBatch}=await import('../src/domain/orders/batch');
const oms='http://127.0.0.1:3002',shop='http://127.0.0.1:8001',ns='svui-'+randomUUID().slice(0,8),dir='artifacts/qa/shopvui';
let server:ChildProcess|undefined,files:Server|undefined;const b=await chromium.launch({channel:'msedge',headless:true});
const started=new Date();
const free=(port:number)=>new Promise<void>((resolve,reject)=>{const s=netServer();s.on('error',reject);s.listen(port,'127.0.0.1',()=>s.close(()=>resolve()));});
try{
 await mkdir(dir,{recursive:true});await free(3002);await free(8001);
 // Storefront static files (what `python -m http.server` does), rooted at shopvui/.
 const root=join(process.cwd(),'..','frontend'),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 files=createServer(async(req,res)=>{const path=normalize(decodeURIComponent((req.url??'/').split('?')[0])).replace(/^([/\\])+/,'')||'index.html';const full=join(root,path);if(!full.startsWith(root)){res.writeHead(403).end();return;}try{const data=await readFile(full);res.writeHead(200,{'Content-Type':types[extname(full)]??'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}}).listen(8001,'127.0.0.1');
 // The storefront sells HT-1200; give oms_test a warehouse in the buyer's city (demo address is TP.HCM) with stock.
 await db.sku.upsert({where:{id:'HT-1200'},update:{active:true},create:{id:'HT-1200',name:'Hộp thực phẩm 1.200ml',variant:'Trong suốt',category:'Đồ bếp',price:90000,weightGrams:300}});
 await db.warehouse.create({data:{id:ns+'HCM',name:ns+' HCM',region:'HCM',address:'QA'}});await db.inventory.create({data:{warehouseId:ns+'HCM',skuId:'HT-1200',sellable:20}});
 const actor=await db.account.create({data:{username:ns,name:'ShopVui QA',role:'NHAN_VIEN',passwordHash:'no-login-password'}});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,APP_ORIGIN:oms,SHOPVUI_ORIGIN:shop},stdio:'ignore'});let ready=false;for(let n=0;n<80;n++){try{if((await fetch(oms+'/api/health')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready);
 // Wrong key / foreign origin are refused.
 assert.equal((await fetch(oms+'/api/integrations/shopvui/catalog',{headers:{'X-ShopVui-Key':'wrong'}})).status,401);
 const pre=await fetch(oms+'/api/integrations/shopvui/catalog',{method:'OPTIONS',headers:{Origin:'http://evil.test'}});assert.equal(pre.headers.get('access-control-allow-origin'),null);
 const c=await b.newContext({viewport:{width:1366,height:900}});
 await c.addInitScript(`window.SV_OMS={base:'${oms}/api/integrations/shopvui',key:'shopvui-local-demo',shopId:'oms'}`);
 const p=await c.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(shop+'/#/login');await p.locator('input[name=account]').fill('demo');await p.locator('input[type=password]').first().fill('Demo1234');await p.getByRole('button',{name:'ĐĂNG NHẬP',exact:true}).click();await expect(p).not.toHaveURL(/#\/login/);
 // Product page shows the live OMS stock, then buy now -> checkout gets the OMS-computed shipping fee.
 await p.goto(shop+'/#/product/oms-HT-1200');await expect(p.getByText(/sản phẩm có sẵn/)).toContainText(/\d/);await expect(p.locator('body')).toContainText('EZMART');
 await p.getByRole('button',{name:'Mua Ngay'}).click();await expect(p).toHaveURL(/#\/checkout/);// Mua Ngay skips the cart
 const group=p.locator('.co-group').filter({hasText:'EZMART'});await expect(group.locator('.co-ship')).toContainText('Giao từ kho EZMART',{timeout:10000});
 await p.screenshot({path:dir+'/checkout.png',fullPage:true});
 // Staff already has the OMS order list open (no reload later): the new order must appear on its own.
 const token=await new SignJWT({sv:1}).setProtectedHeader({alg:'HS256'}).setSubject(actor.id).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 const staff=await b.newContext({viewport:{width:1366,height:900}});await staff.addCookies([{name:'oms_session',value:token,url:oms}]);const sp=await staff.newPage();
 await sp.goto(oms+'/orders');await expect(sp.locator('.live-updates')).toBeVisible();await sp.waitForTimeout(1500);
 const dash=await staff.newPage();await dash.goto(oms+'/dashboard');await dash.waitForTimeout(2500);
 const dashRefreshed=dash.waitForRequest(r=>r.url().includes('/dashboard')&&!!r.headers()['rsc'],{timeout:12000});
 await p.locator('[data-act=place]').click();await expect(p).toHaveURL(/#\/order-success\//,{timeout:10000});await expect(p.getByRole('heading',{name:'Đặt hàng thành công!'})).toBeVisible();await expect(p.locator('.os-items li')).toHaveCount(1);await expect(p.locator('canvas.confetti')).toHaveCount(1);await p.waitForTimeout(700);await p.screenshot({path:dir+'/order-success-confetti.png'});await expect(p.locator('canvas.confetti')).toHaveCount(0,{timeout:8000});await p.screenshot({path:dir+'/order-success.png',fullPage:true});
 const placedAt=Date.now();
 const order=await db.order.findFirstOrThrow({where:{channel:'SHOPVUI',createdAt:{gte:started}},include:{shipments:true},orderBy:{createdAt:'desc'}});
 assert.equal(order.paymentMethod,'COD');assert.equal(order.status,'DA_XAC_NHAN');assert.match(order.address,/TP\. Hồ Chí Minh/);
 const row=sp.locator('tbody tr').filter({hasText:order.id});await expect(row).toBeVisible({timeout:10000});const appearedMs=Date.now()-placedAt;
 await expect(row).toHaveClass(/row-fresh/);await sp.screenshot({path:dir+'/oms-list-live.png'});
 console.log('order appeared in open OMS list after',appearedMs,'ms without reload');
 await dashRefreshed;console.log('dashboard refreshed itself after the new order');await dash.close();
 await sp.goto(oms+'/orders/'+order.id);await expect(sp.locator('body')).toContainText('ShopVui');await sp.screenshot({path:dir+'/oms-order.png'});
 // Warehouse ships it; the buyer's ShopVui order follows (sync on page load).
 const parcels=order.shipments.map(s=>s.id);for(const action of ['pack','handover'] as const)assert((await shipmentBatch(actor.id,randomUUID(),{action,shipmentIds:parcels})).results.every(r=>r.ok));
 const tracking=(await db.shipment.findFirstOrThrow({where:{id:parcels[0]}})).trackingCode!;
 await p.goto(shop+'/#/user/purchase?type=shipping');await expect(p.locator('body')).toContainText(tracking,{timeout:10000});await p.screenshot({path:dir+'/buyer-shipping.png',fullPage:true});
 await shipmentBatch(actor.id,randomUUID(),{action:'deliver',shipmentIds:parcels});
 await p.goto(shop+'/#/user/purchase?type=completed');await p.reload();await expect(p.locator('body')).toContainText('EZMART',{timeout:10000});
 // Bài 5 from the storefront: buyer asks to return the delivered order -> OMS opens the RMA; warehouse inspects; refund shows on ShopVui.
 const {orderCommand}=await import('../src/domain/orders/lifecycle');const {returnCommand}=await import('../src/domain/returns/service');
 for(const s of parcels)await orderCommand(actor.id,randomUUID(),order.id,{action:'collect',shipmentId:s});
 await p.goto(shop+'/#/user/purchase?type=completed');await p.reload();
 const card=p.locator('.order').filter({hasText:'EZMART'}).filter({has:p.getByRole('button',{name:'Trả Hàng/Hoàn Tiền'})}).first();
 await card.getByRole('button',{name:'Trả Hàng/Hoàn Tiền'}).click();
 const dlg=p.locator('.modal, [role=dialog]').filter({hasText:'Yêu Cầu Trả Hàng'}).first();await expect(dlg).toContainText('7 ngày');
 await dlg.locator('input[name=reason]').first().check();await dlg.locator('input[type=file][name=photo]').setInputFiles({name:'hop-mop.png',mimeType:'image/png',buffer:await p.screenshot({clip:{x:0,y:0,width:240,height:160}})});await expect(dlg.locator('[data-rm]')).toHaveCount(1,{timeout:5000});
 await dlg.getByRole('button',{name:'Gửi Yêu Cầu'}).click();
 await expect(p.getByText('Đã gửi yêu cầu trả hàng/hoàn tiền')).toBeVisible({timeout:10000});
 const rma=await db.returnCase.findFirstOrThrow({where:{orderId:order.id},include:{lines:true}});
 // The buyer's photo reaches OMS and shows on the return case for staff (served only to signed-in staff).
 assert.equal(await db.returnPhoto.count({where:{returnId:rma.id}}),1);await sp.goto(oms+'/returns/'+rma.id);const photo=sp.locator('.return-photos img');await expect(photo).toHaveCount(1);await expect.poll(()=>photo.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);await settle(sp);await sp.screenshot({path:dir+'/oms-return-photo.png',fullPage:true});assert.equal((await fetch(oms+'/api/returns/'+rma.id+'/photos/'+(await db.returnPhoto.findFirstOrThrow({where:{returnId:rma.id}})).id)).status,401,'photo not public');assert.equal(rma.status,'CHO_NHAN');assert.match(rma.code!,/^RMA-/);
 await p.goto(shop+'/#/user/purchase?type=return');await expect(p.locator('body')).toContainText(rma.trackingCode!,{timeout:10000});await p.screenshot({path:dir+'/buyer-return.png',fullPage:true});
 for(const l of rma.lines)await returnCommand(actor.id,randomUUID(),rma.id,{action:'inspect',lineId:l.id,received:l.approved,passed:l.approved,failed:0,refundQuantity:l.approved,reason:'Nguyên seal',autoSettle:true});
 await p.reload();await expect(p.locator('body')).toContainText('Đã hoàn tất trả hàng/hoàn tiền',{timeout:10000});await p.screenshot({path:dir+'/buyer-refunded.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',order:order.id,tracking,screens:dir,scope:'ShopVui buy -> OMS order (SHOPVUI) -> ship -> buyer status; oms_test only'}));
}finally{server?.kill();files?.close();await b.close();await db.$disconnect();}

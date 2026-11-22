// Live browser/HTTP verification of new DOM fields and non-payment hardening. All fixtures in oms_test.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir} from 'node:fs/promises';
import {SignJWT} from 'jose';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const origin='http://127.0.0.1:3002',ns='domui-'+randomUUID().slice(0,8),dir='artifacts/qa/dom-hardening';
let server:ChildProcess|undefined;const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 await mkdir(dir,{recursive:true});await new Promise<void>((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(3002,'127.0.0.1',()=>s.close(()=>resolve()));});
 const actor=await db.account.create({data:{username:ns,name:ns,role:'QUAN_LY',passwordHash:'not-a-login-hash'}});
 const staff=await db.account.create({data:{username:ns+'s',name:ns,role:'NHAN_VIEN',passwordHash:'not-a-login-hash'}});
 const customer=await db.customer.create({data:{name:ns,phone:'0900000023',address:'12 Test address',city:'HN'}});
 await db.sku.create({data:{id:ns,name:'Sản phẩm '+ns,category:'QA',price:100000,weightGrams:500}});
 await db.warehouse.createMany({data:[{id:ns+'near',name:'Kho phí cao '+ns,address:'Test',region:'HN',packingFee:9000},{id:ns+'far',name:'Kho phí thấp '+ns,address:'Test',region:'HN',packingFee:0}]});
 await db.inventory.createMany({data:[{warehouseId:ns+'near',skuId:ns,sellable:5},{warehouseId:ns+'far',skuId:ns,sellable:5}]});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,APP_ORIGIN:origin,SHOPVUI_ORIGIN:'http://127.0.0.1:8001',SHOPVUI_DEMO_PAY:'0',SEPAY_API_TOKEN:'',SEPAY_ACCOUNT:'',SEPAY_POLL:'off'},stdio:'ignore'});
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready,'isolated server ready');
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 const sign=(id:string)=>new SignJWT({sv:1}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
 await context.addCookies([{name:'oms_session',value:await sign(actor.id),url:origin}]);
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/orders/new');await page.getByLabel('Khách hàng',{exact:true}).selectOption(customer.id);await page.getByLabel('Mặt hàng 1',{exact:true}).selectOption(ns);await page.locator('[name=paymentMethod]').selectOption('COD');
 await expect(page.locator('input[name=latitude],input[name=longitude]')).toHaveCount(0);
 await expect(page.locator('.checkout-parcel')).toContainText('Kho phí thấp '+ns);await expect(page.locator('.checkout-parcel')).toContainText('Theo bảng thời gian vùng');
 await expect(page.getByRole('button',{name:'Tạo đơn và xác nhận',exact:true})).toBeEnabled();
 for(const width of [1366,390]){await page.setViewportSize({width,height:850});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),{timeout:3000,message:'no document overflow after viewport/layout transition'}).toBe(true);const axe=await new AxeBuilder({page}).analyze();assert.equal(axe.violations.filter(v=>['serious','critical'].includes(v.impact??'')).length,0,JSON.stringify(axe.violations));await page.screenshot({path:dir+'/checkout-'+width+'.png',fullPage:true});}
 await page.getByRole('button',{name:'Tạo đơn và xác nhận',exact:true}).click();await page.waitForURL(u=>/^\/orders\/[^/]+$/.test(u.pathname)&&!u.pathname.endsWith('/new'));
 const id=page.url().split('/').pop()!,order=await db.order.findUniqueOrThrow({where:{id},include:{shipments:true}});assert.equal(order.latitude,null);assert.equal(order.longitude,null);assert.equal(order.shipments[0].warehouseId,ns+'far');
 await db.order.update({where:{id},data:{deadline:new Date(Date.now()+3600000)}});await page.goto(origin+'/orders/'+id+'?tab=shipments');await page.getByRole('tabpanel').getByRole('button',{name:'Xác nhận đã đóng gói',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'SLA'})).toBeVisible();assert.equal(await db.inventoryMovement.count({where:{documentId:order.shipments[0].id,kind:'XUAT'}}),0);
 await page.goto(origin+'/admin/catalog');await page.getByRole('button',{name:'Sửa '+ns+'near',exact:true}).click();await expect(page.getByRole('dialog').locator('input[name=latitude],input[name=longitude]')).toHaveCount(0);await page.keyboard.press('Escape');
 const health=await context.request.get(origin+'/api/health');assert.equal(health.headers()['x-content-type-options'],'nosniff');assert.equal(health.headers()['x-frame-options'],'DENY');assert.match(health.headers()['content-security-policy'],/frame-ancestors 'none'/);
 const oversized=await context.request.post(origin+'/api/orders/quote',{headers:{Origin:origin,'Content-Type':'application/json'},data:JSON.stringify({padding:'x'.repeat(140000)})});assert.equal(oversized.status(),413);
 const staffContext=await browser.newContext();await staffContext.addCookies([{name:'oms_session',value:await sign(staff.id),url:origin}]);
 const denied=await staffContext.request.post(origin+'/api/foundation/catalog',{headers:{Origin:origin,'Idempotency-Key':randomUUID()},data:{kind:'warehouse',id:ns+'near',name:'Not allowed',address:'Test',region:'HN',active:true}});assert.equal(denied.status(),403);await staffContext.close();
 const blocked=await context.request.post(origin+'/api/integrations/shopvui/orders',{headers:{Origin:'https://not-allowed.invalid','X-ShopVui-Key':'shopvui-local-demo'},data:{}});assert.equal(blocked.status(),403);
 for(let i=0;i<31;i++){const response=await context.request.post(origin+'/api/integrations/shopvui/orders',{headers:{Origin:'http://127.0.0.1:8001','X-ShopVui-Key':'shopvui-local-demo'},data:{}});assert.equal(response.status(),i<30?422:429);}
 assert.equal(errors.length,0,errors.join('\n'));await context.close();
 console.log('PASS browser regional DOM (no coordinate inputs), cost/ETA, 1366+390 axe/overflow, delayed SLA blocks stock issue, HTTP role/origin/body/quota/security headers; oms_test only');
}finally{if(server&&server.exitCode===null){server.kill();await Promise.race([new Promise<void>(r=>server!.once('exit',()=>r())),delay(5000)]);}await browser.close();await db.$disconnect();}

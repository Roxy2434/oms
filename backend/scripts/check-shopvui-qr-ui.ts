// E2E: real bank transfer flow on the storefront with SePay on (bank simulated by recording the transfer as SePay would):
// QR modal waits, then turns into "Thanh toán thành công" in place; a payment arriving after the modal was closed shows
// its own success notice. Isolated OMS on 3002 + oms_test, storefront on 8001; the QR image and SePay are never called.
import 'dotenv/config';
import {spawn,type ChildProcess} from 'node:child_process';import {createServer as netServer} from 'node:net';import {createServer,type Server} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {join,extname,normalize} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {randomUUID} from 'node:crypto';import {chromium,expect,type Page} from '@playwright/test';import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const {recordTransfer,payCode}=await import('../src/domain/payments/sepay');
const {expireUnpaidTransfers,PAY_MINUTES}=await import('../src/domain/integrations/shopvui');
const oms='http://127.0.0.1:3002',shop='http://127.0.0.1:8001',ns='svqr-'+randomUUID().slice(0,8),dir='artifacts/qa/shopvui-qr';
let server:ChildProcess|undefined,files:Server|undefined;const b=await chromium.launch({channel:'msedge',headless:true});
const started=new Date();
const free=(port:number)=>new Promise<void>((resolve,reject)=>{const s=netServer();s.on('error',reject);s.listen(port,'127.0.0.1',()=>s.close(()=>resolve()));});
// A tiny stand-in for the VietQR image so the test never calls the real QR service.
const fakeQr='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><rect width="29" height="29" fill="#fff"/><path d="M1 1h7v7H1zM21 1h7v7h-7zM1 21h7v7H1zM11 11h7v7h-7z" fill="#000"/></svg>';
try{
 await mkdir(dir,{recursive:true});await free(3002);await free(8001);
 const root=join(process.cwd(),'..','frontend'),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 files=createServer(async(req,res)=>{const path=normalize(decodeURIComponent((req.url??'/').split('?')[0])).replace(/^([/\\])+/,'')||'index.html';const full=join(root,path);if(!full.startsWith(root)){res.writeHead(403).end();return;}try{const data=await readFile(full);res.writeHead(200,{'Content-Type':types[extname(full)]??'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}}).listen(8001,'127.0.0.1');
 await db.sku.upsert({where:{id:'HT-1200'},update:{active:true},create:{id:'HT-1200',name:'Hộp thực phẩm 1.200ml',variant:'Trong suốt',category:'Đồ bếp',price:90000,weightGrams:300}});
 await db.warehouse.create({data:{id:ns+'HCM',name:ns+' HCM',region:'HCM',address:'QA'}});await db.inventory.create({data:{warehouseId:ns+'HCM',skuId:'HT-1200',sellable:20}});
 // SePay on (fake token + account) so OMS hands out QR codes; polling off, the test plays the bank.
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,APP_ORIGIN:oms,SHOPVUI_ORIGIN:shop,SEPAY_API_TOKEN:'qa-fake-token',SEPAY_ACCOUNT:'0123456789',SEPAY_POLL:'off',SHOPVUI_DEMO_PAY:'1'},stdio:'ignore'});let ready=false;for(let n=0;n<80;n++){try{if((await fetch(oms+'/api/health')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready);
 const c=await b.newContext({viewport:{width:1366,height:900}});
 await c.addInitScript(`window.SV_OMS={base:'${oms}/api/integrations/shopvui',key:'shopvui-local-demo',shopId:'oms'}`);
 await c.route('https://vietqr.app/**',r=>r.fulfill({contentType:'image/svg+xml',body:fakeQr}));
 const p=await c.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(shop+'/#/login');await p.locator('input[name=account]').fill('demo');await p.locator('input[type=password]').first().fill('Demo1234');await p.getByRole('button',{name:'ĐĂNG NHẬP',exact:true}).click();await expect(p).not.toHaveURL(/#\/login/);
 async function buyByBank(page:Page){
  await page.goto(shop+'/#/product/oms-HT-1200');await expect(page.getByText(/sản phẩm có sẵn/)).toContainText(/\d/);
  await page.getByRole('button',{name:'Mua Ngay'}).click();await expect(page).toHaveURL(/#\/checkout/);// Mua Ngay skips the cart
  await expect(page.locator('.co-group').filter({hasText:'EZMART'}).locator('.co-ship')).toContainText('Giao từ kho EZMART',{timeout:10000});
  await page.locator('[data-pay=bank]').click();await page.locator('[data-act=place]').click();
  await expect(page).toHaveURL(/#\/payment\//,{timeout:10000});const card=page.locator('.pay-card');await expect(card).toBeVisible();
  const order=await db.order.findFirstOrThrow({where:{channel:'SHOPVUI',paymentMethod:'TRA_TRUOC',createdAt:{gte:started}},orderBy:{createdAt:'desc'},include:{lines:true}});
  return {card,order};
 }
 const bank=(order:{id:string},amount:number)=>recordTransfer({id:'qa-'+randomUUID(),amount,content:'MBVCB.123.'+payCode(order.id)+'.CT',reference:'FT'+randomUUID().slice(0,12)});

 // 1) Checkout -> payment page: VietQR + manual transfer details; it waits, then the same page becomes the receipt.
 const {card,order}=await buyByBank(p);
 await expect(card.locator('.pay-qr-frame img')).toHaveAttribute('src',new RegExp('acc=0123456789&bank=970422&amount=[0-9]+&des='+payCode(order.id)));
 for(const t of ['MB Bank','0123456789',payCode(order.id),'Đang chờ thanh toán'])await expect(card).toContainText(t);
 await expect(card.locator('[data-copy]')).toHaveCount(3);
 await p.waitForTimeout(400);await p.screenshot({path:dir+'/payment-waiting.png',fullPage:true});
 await card.getByRole('button',{name:'Kiểm tra thanh toán'}).click();await expect(p.locator('.toast')).toContainText('Chưa nhận được tiền',{timeout:8000});await expect(card).toContainText('Đang chờ thanh toán');
 const due=Number(order.shippingFee)+order.lines.reduce((n,l)=>n+Number(l.priceSnapshot)*l.quantity,0);
 // An order placed before per-order tokens existed: drop its token; the storefront must recover it (replayOnly) and keep syncing.
 const dropToken=(id:string)=>p.evaluate(id=>{const sv=(window as unknown as {SV:{db:{data():{orders:{code:string;oms?:{token?:string}}[]};save():void}}}).SV;const o=sv.db.data().orders.find(x=>x.oms&&x.code===id)!;delete o.oms!.token;sv.db.save();},id);
 const tokenOf=(id:string)=>p.evaluate(id=>(window as unknown as {SV:{db:{data():{orders:{code:string;oms?:{token?:string}}[]}}}}).SV.db.data().orders.find(x=>x.oms&&x.code===id)!.oms!.token??null,id);
 assert((await tokenOf(order.id))?.length===32,'order placed now must carry its token');await dropToken(order.id);assert.equal(await tokenOf(order.id),null);
 const t0=Date.now();assert.equal((await bank(order,due))?.status,'THANH_CONG');
 const receipt=p.locator('.pay-success');await expect(receipt).toContainText('Thanh toán thành công',{timeout:8000});const inPlaceMs=Date.now()-t0;
 assert.equal((await tokenOf(order.id))?.length,32,'token must be recovered for an order placed without one');
 await p.evaluate(()=>document.querySelector('.pay-success')!.setAttribute('data-first','1'));
 for(const t of ['Shop đã nhận được tiền','Chuyển khoản ngân hàng (MB Bank)','Chờ xác nhận'])await expect(receipt).toContainText(t);
 await expect(p).toHaveURL(new RegExp('#/payment/'));await expect(p.locator('.modal')).toHaveCount(0);// on the payment page itself: no extra notice
 await expect(p.locator('canvas.confetti')).toHaveCount(1);await p.waitForTimeout(700);await p.screenshot({path:dir+'/payment-success-confetti.png'});await expect(p.locator('canvas.confetti')).toHaveCount(0,{timeout:8000});await p.screenshot({path:dir+'/payment-success.png',fullPage:true});
 // The receipt must appear once: no second redraw (which replays the entrance animation) on the following status syncs.
 await p.waitForTimeout(4000);assert.equal(await p.locator('.pay-success[data-first]').count(),1,'payment receipt was redrawn after it appeared');
 await receipt.getByRole('link',{name:'Xem đơn hàng'}).click();await expect(p).toHaveURL(/#\/user\/order\//);

 // 2) Phone width: "Thanh toán sau", money arrives later -> a notice pops up wherever the buyer is, leading to the receipt page.
 await p.setViewportSize({width:390,height:844});
 const second=await buyByBank(p);await p.waitForTimeout(400);await p.screenshot({path:dir+'/payment-waiting-mobile.png',fullPage:true});
 const width=await p.evaluate(()=>document.documentElement.scrollWidth);assert(width<=390,'payment page must not scroll sideways on a phone, got '+width);
 await second.card.getByRole('link',{name:'Thanh toán sau'}).click();await expect(p).toHaveURL(/type=unpaid/);
 const due2=Number(second.order.shippingFee)+second.order.lines.reduce((n,l)=>n+Number(l.priceSnapshot)*l.quantity,0);
 const t1=Date.now();await bank(second.order,due2);
 const notice=p.locator('.modal').filter({hasText:'Thanh toán thành công!'});await expect(notice).toBeVisible({timeout:15000});const noticeMs=Date.now()-t1;
 await p.waitForTimeout(400);await p.screenshot({path:dir+'/paid-notice-mobile.png'});
 await notice.getByRole('button',{name:'Xem chi tiết'}).click();await expect(p.locator('.pay-success')).toContainText('Thanh toán thành công');
 await p.waitForTimeout(500);await p.screenshot({path:dir+'/payment-success-mobile.png',fullPage:true});
 // 3) Payment window: the QR page counts down; once OMS cancels the unpaid order (30 min) the page turns into "Đơn hàng đã bị hủy".
 await p.setViewportSize({width:1366,height:900});
 const third=await buyByBank(p);await expect(third.card.locator('[data-deadline]')).toHaveText(/Còn (09|10):[0-9][0-9] để thanh toán/);
 await p.waitForTimeout(400);await p.screenshot({path:dir+'/payment-countdown.png'});
 const later=new Date(third.order.confirmedAt!.getTime()+(PAY_MINUTES+1)*60000);let gone=false;for(let i=0;i<20&&!gone;i++){const r=await expireUnpaidTransfers(later);gone=r.expired.includes(third.order.id);if(!r.expired.length)break;}assert(gone,'unpaid order must expire');
 await expect(p.locator('.pay-cancelled')).toContainText('Đơn hàng đã bị hủy',{timeout:10000});await expect(p.locator('.pay-cancelled')).toContainText('quá hạn thanh toán');
 await p.waitForTimeout(400);await p.screenshot({path:dir+'/payment-expired.png'});
 // 4) Presentation: "Đã thanh toán (demo)" turns the QR page into the payment success page without a real transfer.
 const fourth=await buyByBank(p);const demoBtn=fourth.card.getByRole('button',{name:'Đã thanh toán (demo)'});await expect(demoBtn).toBeVisible();
 await p.waitForTimeout(300);await p.screenshot({path:dir+'/payment-demo-button.png'});
 await demoBtn.click();await expect(p.locator('.pay-success')).toContainText('Thanh toán thành công',{timeout:10000});
 const demoMoney=await db.moneyTransaction.findMany({where:{orderId:fourth.order.id}});assert.equal(demoMoney.length,1);assert(demoMoney[0].reference.startsWith('DEMO-'),demoMoney[0].reference);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',orders:[order.id,second.order.id],inPlaceMs,noticeMs,screens:dir,scope:'ShopVui QR -> bank transfer recorded -> success screen; oms_test only'}));
}finally{server?.kill();files?.close();await b.close();await db.$disconnect();}

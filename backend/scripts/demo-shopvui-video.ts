// Demo video: a buyer orders on ShopVui (COD -> order success page), then pays by bank transfer (QR page -> money arrives ->
// payment success page). Isolated OMS on 3002 + oms_test, storefront on 8001; the bank is simulated by recording the
// transfer exactly as the SePay poller would. Output: artifacts/qa/demo/shopvui-dat-hang-thanh-toan.mp4 (+ .webm).
import 'dotenv/config';
import {spawn,spawnSync,type ChildProcess} from 'node:child_process';import {createServer as netServer} from 'node:net';import {createServer,type Server} from 'node:http';import {readFile,mkdir,rename,rm} from 'node:fs/promises';import {join,extname,normalize} from 'node:path';import {setTimeout as delay} from 'node:timers/promises';import {randomUUID} from 'node:crypto';import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');
const {recordTransfer,payCode}=await import('../src/domain/payments/sepay');
const oms='http://127.0.0.1:3002',shop='http://127.0.0.1:8001',ns='demo-'+randomUUID().slice(0,8),dir='artifacts/qa/demo',name='shopvui-dat-hang-thanh-toan';
let server:ChildProcess|undefined,files:Server|undefined;const b=await chromium.launch({channel:'msedge',headless:true,slowMo:120});
const started=new Date();
const free=(port:number)=>new Promise<void>((resolve,reject)=>{const s=netServer();s.on('error',reject);s.listen(port,'127.0.0.1',()=>s.close(()=>resolve()));});
// Stand-in QR picture (the real one comes from the VietQR service; the demo never calls it).
const cells=Array.from({length:25*25},(_,i)=>((i*7919)%13<6)?`<rect x="${i%25}" y="${Math.floor(i/25)}" width="1" height="1"/>`:'').join('');
const finder=(x:number,y:number)=>`<rect x="${x}" y="${y}" width="7" height="7" fill="#000"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="#000"/>`;
const fakeQr=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 27 27" shape-rendering="crispEdges"><rect x="-1" y="-1" width="27" height="27" fill="#fff"/><g fill="#000">${cells}</g><rect x="0" y="0" width="8" height="8" fill="#fff"/><rect x="17" y="0" width="8" height="8" fill="#fff"/><rect x="0" y="17" width="8" height="8" fill="#fff"/>${finder(0,0)}${finder(18,0)}${finder(0,18)}</svg>`;
try{
 await mkdir(dir,{recursive:true});await free(3002);await free(8001);
 const root=join(process.cwd(),'..','frontend'),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
 files=createServer(async(req,res)=>{const path=normalize(decodeURIComponent((req.url??'/').split('?')[0])).replace(/^([/\\])+/,'')||'index.html';const full=join(root,path);if(!full.startsWith(root)){res.writeHead(403).end();return;}try{const data=await readFile(full);res.writeHead(200,{'Content-Type':types[extname(full)]??'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}}).listen(8001,'127.0.0.1');
 await db.sku.upsert({where:{id:'HT-1200'},update:{active:true},create:{id:'HT-1200',name:'Hộp thực phẩm 1.200ml',variant:'Trong suốt',category:'Đồ bếp',price:90000,weightGrams:300}});
 await db.warehouse.create({data:{id:ns+'HCM',name:ns+' HCM',region:'HCM',address:'Demo'}});await db.inventory.create({data:{warehouseId:ns+'HCM',skuId:'HT-1200',sellable:20}});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,APP_ORIGIN:oms,SHOPVUI_ORIGIN:shop,SEPAY_API_TOKEN:'demo-token',SEPAY_ACCOUNT:'0123456789',SEPAY_HOLDER:'OMS GIA DUNG',SEPAY_POLL:'off'},stdio:'ignore'});let ready=false;for(let n=0;n<80;n++){try{if((await fetch(oms+'/api/health')).ok){ready=true;break;}}catch{}await delay(100);}assert(ready);
 const c=await b.newContext({viewport:{width:1366,height:768},recordVideo:{dir,size:{width:1366,height:768}}});
 await c.addInitScript(`window.SV_OMS={base:'${oms}/api/integrations/shopvui',key:'shopvui-local-demo',shopId:'oms'}`);
 await c.route('https://vietqr.app/**',r=>r.fulfill({contentType:'image/svg+xml',body:fakeQr}));
 const p=await c.newPage();const video=p.video()!;
 const smooth=(y:number)=>p.evaluate(y=>window.scrollTo({top:y,behavior:'smooth'}),y);
 await p.goto(shop+'/#/login');await p.waitForTimeout(800);
 await p.locator('input[name=account]').pressSequentially('demo',{delay:70});await p.locator('input[type=password]').first().pressSequentially('Demo1234',{delay:70});
 await p.getByRole('button',{name:'ĐĂNG NHẬP',exact:true}).click();await expect(p).not.toHaveURL(/#\/login/);await p.waitForTimeout(1200);
 async function buy(method:'cod'|'bank'){
  await p.goto(shop+'/#/product/oms-HT-1200');await expect(p.getByText(/sản phẩm có sẵn/)).toContainText(/\d/);await p.waitForTimeout(1500);
  await p.getByRole('button',{name:'Mua Ngay'}).click();await expect(p).toHaveURL(/#\/checkout/);
  await expect(p.locator('.co-group').filter({hasText:'EZMART'}).locator('.co-ship')).toContainText('Giao từ kho EZMART',{timeout:10000});
  await p.waitForTimeout(1200);await smooth(600);await p.waitForTimeout(1200);
  if(method==='bank'){await p.locator('[data-pay=bank]').click();await p.waitForTimeout(900);}
  await p.locator('[data-act=place]').click();
 }
 // Part 1: COD -> order success page with fireworks.
 await buy('cod');await expect(p).toHaveURL(/#\/order-success\//,{timeout:10000});await p.waitForTimeout(4800);await smooth(300);await p.waitForTimeout(1500);await smooth(0);await p.waitForTimeout(800);
 // Part 2: bank transfer -> QR payment page -> bank confirms -> payment success page with fireworks.
 await buy('bank');await expect(p).toHaveURL(/#\/payment\//,{timeout:10000});await p.waitForTimeout(2500);
 await p.locator('[data-copy]').last().hover();await p.waitForTimeout(600);await p.locator('[data-copy]').last().click();await p.waitForTimeout(2200);
 const order=await db.order.findFirstOrThrow({where:{channel:'SHOPVUI',paymentMethod:'TRA_TRUOC',createdAt:{gte:started}},orderBy:{createdAt:'desc'},include:{lines:true}});
 const due=Number(order.shippingFee)+order.lines.reduce((n,l)=>n+Number(l.priceSnapshot)*l.quantity,0);
 assert.equal((await recordTransfer({id:'demo-'+randomUUID(),amount:due,content:'MBVCB.123.'+payCode(order.id)+'.CT',reference:'FT'+randomUUID().slice(0,12)}))?.status,'THANH_CONG');
 await expect(p.locator('.pay-success')).toContainText('Thanh toán thành công',{timeout:10000});await p.waitForTimeout(5000);
 await p.getByRole('link',{name:'Xem đơn hàng'}).click();await p.waitForTimeout(2500);
 await c.close();
 const webm=join(dir,name+'.webm'),mp4=join(dir,name+'.mp4');await rm(webm,{force:true});await rename(await video.path(),webm);
 const ff=spawnSync('ffmpeg',['-y','-loglevel','error','-i',webm,'-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',mp4],{encoding:'utf8'});
 console.log(JSON.stringify({result:'OK',video:ff.status===0?mp4:webm,webm,order:order.id,scope:'demo on oms_test; bank simulated'}));
}finally{server?.kill();files?.close();await b.close();await db.$disconnect();}

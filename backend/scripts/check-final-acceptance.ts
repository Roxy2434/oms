import 'dotenv/config';
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import {db} from '../src/server/db';
const origin='http://127.0.0.1:3001',dir='artifacts/qa/final-acceptance';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 await mkdir(dir,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
 assert((await context.request.post(origin+'/api/auth/login',{headers:{origin},data:{username:'quanly',password:process.env.BOOTSTRAP_PASSWORD}})).ok());
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const tasks:{start:number;duration:number}[]=[];Reflect.set(window,'acceptanceLongTasks',tasks);new PerformanceObserver(list=>{for(const entry of list.getEntries())tasks.push({start:entry.startTime,duration:entry.duration});}).observe({type:'longtask',buffered:true});});
 await page.goto(origin+'/dashboard');await page.locator('.chart-loading').waitFor({state:'hidden'});await page.waitForTimeout(1400);
 const order=await db.order.findFirst({orderBy:{createdAt:'desc'},select:{id:true}});assert(order);
 await page.goto(origin+'/orders/'+encodeURIComponent(order.id));const detailHeading=await page.locator('h1').innerText();assert(detailHeading.includes(order.id));await page.locator('.sidebar').getByRole('link',{name:'Đơn hàng',exact:true}).click();await page.waitForURL('**/orders');await page.goBack();await expect(page.locator('h1')).toHaveText(detailHeading);await page.goForward();await expect(page.locator('h1')).toHaveText('Đơn hàng');
 await page.goto(origin+'/dashboard');await page.waitForTimeout(1400);const trigger=page.getByRole('button',{name:'Đọc số liệu',exact:true});
 // Warm up before the bounded 20-interaction production profile.
 for(let i=0;i<2;i++){await trigger.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
 await page.waitForTimeout(400);
 await trigger.evaluate(button=>{const samples:number[]=[];Reflect.set(window,'acceptanceLatency',samples);button.addEventListener('click',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>samples.push(performance.now()-start)));},{capture:true});});
 const cdp=await context.newCDPSession(page);await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReturnAsStream'});
 const start=await page.evaluate(()=>{performance.mark('oms-acceptance-start');return performance.now();});
 for(let i=0;i<20;i++){await trigger.focus();if(i%2)await page.keyboard.press('Enter');else await trigger.click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(240);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert(await trigger.evaluate(e=>e===document.activeElement));}
 await page.waitForTimeout(150);const end=await page.evaluate(()=>{performance.mark('oms-acceptance-end');return performance.now();});
 const completed=new Promise<{stream?:string}>(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await completed;assert(stream,'Tracing must return an artifact stream');const chunks:Buffer[]=[];for(;;){const chunk=await cdp.send('IO.read',{handle:stream});chunks.push(Buffer.from(chunk.data,chunk.base64Encoded?'base64':'utf8'));if(chunk.eof)break;}await cdp.send('IO.close',{handle:stream});await writeFile(dir+'/performance-trace.json',Buffer.concat(chunks));
 const profile=await page.evaluate(({start,end})=>{const samples=Reflect.get(window,'acceptanceLatency') as number[];const sorted=[...samples].sort((a,b)=>a-b);const tasks=Reflect.get(window,'acceptanceLongTasks') as {start:number;duration:number}[];return{samplesMs:samples,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],longTasks:tasks.filter(t=>t.start>=start&&t.start<=end)};},{start,end});
 assert.equal(profile.samplesMs.length,20);assert(profile.p95Ms<=200,JSON.stringify(profile));assert.equal(profile.longTasks.length,0,'Long tasks occurred during motion: inspect trace before sign-off');
 // 200% equivalent CSS viewport/reflow check, not a claim of manually operating browser chrome zoom.
 await page.setViewportSize({width:683,height:384});await page.goto(origin+'/dashboard');await page.waitForTimeout(1300);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('button',{name:'Mở điều hướng'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.screenshot({path:dir+'/reflow-200-equivalent.png',fullPage:true});
 await context.close();
 const offline=await browser.newContext({viewport:{width:390,height:844}});const loginPage=await offline.newPage();await loginPage.goto(origin+'/login');await loginPage.getByLabel('Tài khoản vận hành',{exact:true}).fill('acceptance-offline-'+Date.now());await loginPage.getByLabel('Mật khẩu',{exact:true}).fill('not-a-real-account-password');await offline.setOffline(true);await loginPage.getByRole('button',{name:'Đăng nhập vào Hệ thống',exact:true}).click();await expect(loginPage.locator('#signin-error')).toContainText('Không kết nối');assert(await loginPage.getByRole('button',{name:'Đăng nhập vào Hệ thống',exact:true}).isEnabled());assert.equal(await loginPage.getByLabel('Mật khẩu',{exact:true}).inputValue(),'not-a-real-account-password');await offline.setOffline(false);await loginPage.getByRole('button',{name:'Đăng nhập vào Hệ thống',exact:true}).click();await expect(loginPage.locator('input[aria-invalid=true]')).toHaveCount(2);await offline.close();
 assert.deepEqual(errors,[]);const report={runAt:new Date().toISOString(),machine:{cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,platform:process.platform,browser:browser.version(),headless:true},deepLinkBackForward:true,keyboardFocusReturn:true,actualOfflineErrorPreservesFormAndOnlineRetry:true,reflow200Equivalent:true,manualNativeBrowserZoom:'not separately automated',profile,latencyDefinition:'Click dispatch → two requestAnimationFrame callbacks, a next-paint proxy, NOT field INP',trace:'performance-trace.json',motionScope:'20 warmed dashboard drawer interactions; login3D has its separate intentional ~30fps budget and profile',noVideo:true};await writeFile(dir+'/acceptance.json',JSON.stringify(report,null,2));console.log('PASS deep-link/back/forward, actual offline/retry, keyboard focus, 200%-equivalent reflow; 20 production interactions p95='+profile.p95Ms.toFixed(1)+'ms, zero long tasks in bounded profile; saved CDP trace. No video.');
}finally{await browser.close();await db.$disconnect();}

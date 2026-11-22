import 'dotenv/config';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { writeFile,mkdir } from 'node:fs/promises';
const origin='http://127.0.0.1:3001';
await mkdir('artifacts/qa/redesign',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [username,role]of [['quanly','manager'],['nhanvien.an','staff']]as const){
  const auth=await browser.newContext();
  const login=await auth.request.post(origin+'/api/auth/login',{headers:{origin},data:{username,password:process.env.BOOTSTRAP_PASSWORD}});
  assert(login.ok());const state=await auth.storageState();await auth.close();
  const context=await browser.newContext({storageState:state,viewport:{width:1440,height:900},recordVideo:role==='manager'?{dir:'artifacts/qa/redesign/video',size:{width:1440,height:900}}:undefined});
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/dashboard');await page.locator('.chart-loading').waitFor({state:'hidden'});await page.waitForTimeout(900);
  assert.equal(await page.locator('.overview-primary-metric').count(),role==='manager'?1:0);
  assert.equal(await page.locator('.work-ribbon').count(),1);
  const queue=page.locator('.overview-tasks');const orders=page.locator('.overview-orders');
  assert((await queue.boundingBox())!.y<(await orders.boundingBox())!.y);
  const axe=await new AxeBuilder({page}).analyze();
  await writeFile(`artifacts/qa/redesign/axe-${role}.json`,JSON.stringify(axe.violations,null,2));
  assert.equal(axe.violations.filter(v=>v.impact==='critical'||v.impact==='serious').length,0,JSON.stringify(axe.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))));
  for(const [width,height] of [[1440,900],[1366,768],[768,1024],[390,844],[360,800]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(500);
   const dims=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(dims.page<=dims.viewport,JSON.stringify({width,...dims}));
   await page.screenshot({path:`artifacts/qa/redesign/${role}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:900});
  const trigger=page.getByRole('button',{name:/Chờ xác nhận/});
  await trigger.focus();await page.keyboard.press('Enter');await page.locator('.work-preview-item').first().waitFor();await page.waitForTimeout(500);
  await page.screenshot({path:`artifacts/qa/redesign/${role}-drawer.png`});
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForTimeout(150);
  assert(await trigger.evaluate(e=>e===document.activeElement));
  if(role==='manager'){
   await page.getByLabel('Kỳ báo cáo').selectOption('7');await page.waitForURL('**period=7');await page.waitForTimeout(500);
   await page.getByLabel('Lọc kênh bán cho thống kê').selectOption('SHOPEE');await page.waitForURL('**channel=SHOPEE');await page.waitForTimeout(500);
   await page.getByLabel('Lọc kênh bán cho thống kê').selectOption('ALL');await page.waitForURL('**channel=ALL');
   const dataButton=page.getByRole('button',{name:'Đọc số liệu'});await dataButton.scrollIntoViewIfNeeded();await dataButton.click();await page.waitForTimeout(500);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await trigger.scrollIntoViewIfNeeded();await trigger.click();await page.locator('.work-preview-item').first().waitFor();assert.equal(await page.locator('.work-drawer').evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);const video=page.video();await context.close();if(video)await video.saveAs('artifacts/qa/redesign/dashboard-redesign-motion.webm');console.log('PASS',role,'5 widths, no page overflow, axe, queue, keyboard, reduced motion, no page error');
 }
}finally{await browser.close();}

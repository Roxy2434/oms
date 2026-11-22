import 'dotenv/config';
import {setMotion} from './helpers/motion';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const origin='http://127.0.0.1:3001';
const dir='artifacts/qa/navigation-counters-chart';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const report:Record<string,unknown>={};
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
 await context.addInitScript(()=>localStorage.setItem('oms.motion','full'));
 assert((await context.request.post(origin+'/api/auth/login',{headers:{origin},data:{username:'quanly',password:process.env.BOOTSTRAP_PASSWORD}})).ok());
 const p=await context.newPage();
 // Observe rendered digits and normalized SVG dash offsets, not only CSS declarations.
 await p.addInitScript(()=>{
  const samples:{time:number;value:string;target:string;offset:string}[]=[];
  Object.assign(window,{counterChartSamples:samples});
  const started=performance.now();
  const timer=setInterval(()=>{const counter=document.querySelector('.kpi:nth-child(2) [data-counter-target]');const line=document.querySelector('.recharts-area-curve');if(counter||line)samples.push({time:performance.now(),value:counter?.querySelector('[data-counter-visible]')?.textContent??'',target:counter?.getAttribute('data-counter-target')??'',offset:line?getComputedStyle(line).strokeDashoffset:''});if(performance.now()-started>12000)clearInterval(timer);},16);
 });
 await p.goto(origin+'/dashboard');
 await p.locator('.chart-data-transition[data-line-draw="settled"]').waitFor();
 await p.waitForTimeout(1100);
 const initial=await p.evaluate(()=>Reflect.get(window,'counterChartSamples') as {time:number;value:string;target:string;offset:string}[]);
 assert(initial.some(s=>Number(s.value)>0&&Number(s.value)<Number(s.target)),'initial KPI must actually count through intermediate numbers');
 assert(new Set(initial.map(s=>s.offset).filter(s=>s&&s!=='0px')).size>3,'SVG stroke offset must actually progress');
 report.initial=initial;
 const curve=p.locator('.recharts-area-curve');
 assert.equal(await curve.evaluate(e=>getComputedStyle(e).strokeDasharray),'none','remove dash mask after draw to keep final line stable');
 await p.screenshot({path:dir+'/dashboard-final.png',fullPage:true});
 // Artificial latency is only in this test. Old content must stay readable throughout it.
 let intercepted=0;
 await p.route('**/inventory*',async route=>{if(route.request().headers()['rsc']==='1'){intercepted++;await delay(1400);}await route.continue();});
 const request=p.waitForRequest(req=>new URL(req.url()).pathname==='/inventory'&&req.headers()['rsc']==='1');
 await p.locator('.sidebar').getByRole('link',{name:'Kho hàng',exact:true}).click();await request;
 const retained=await p.evaluate(()=>new Promise<{title:boolean;kpis:number}[]>(resolve=>{const samples:{title:boolean;kpis:number}[]=[];const start=performance.now();const timer=setInterval(()=>{samples.push({title:document.querySelector('h1')?.textContent==='Tổng quan kinh doanh',kpis:document.querySelectorAll('.kpi').length});if(performance.now()-start>=800){clearInterval(timer);resolve(samples);}},16);}));
 assert(intercepted>0);assert(retained.length>10);assert(retained.every(s=>s.title&&s.kpis===4),'no blank/loading placeholder during navigation wait');
 assert.equal(await p.locator('.nav-loading-hint.is-pending').count(),1);
 report.oldContentRetainedDuring1400msRequest=retained;
 await p.getByRole('heading',{name:'Kho hàng',exact:true}).waitFor();await p.unrouteAll({behavior:'wait'});
 await p.locator('.sidebar').getByRole('link',{name:'Tổng quan',exact:true}).click();await p.getByRole('heading',{name:'Tổng quan kinh doanh',exact:true}).waitFor();await p.waitForTimeout(1200);
 await p.getByLabel('Kỳ báo cáo',{exact:true}).selectOption('7');
 await p.locator('.chart-data-transition[data-points="7"]').waitFor();
 const changes=await p.locator('.kpi:nth-child(2) [data-counter-visible]').first().evaluate(e=>new Promise<string[]>(resolve=>{const values:string[]=[];const start=performance.now();const timer=setInterval(()=>{values.push(e.textContent??'');if(performance.now()-start>=1050){clearInterval(timer);resolve(values);}},16);}));
 const api=await context.request.get(origin+'/api/dashboard?period=7');assert(api.ok());const data=await api.json();
 const target=data.manager.newOrders;
 assert.equal(Number(changes.at(-1)),target);assert(new Set(changes).size>2,'filter change must interpolate to new real KPI');
 report.filterCounterValues=changes;
 await p.locator('.chart-data-transition[data-line-draw="settled"]').waitFor();
 for(const width of [768,390,1440]){await p.setViewportSize({width,height:900});await p.waitForTimeout(300);assert(await curve.evaluate(e=>(e as SVGPathElement).getTotalLength()>0));assert.equal(await curve.evaluate(e=>getComputedStyle(e).strokeDasharray),'none');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 report.resizeKeepsCompleteLine=true;
 await setMotion(p,'reduced');
 await p.getByLabel('Kỳ báo cáo',{exact:true}).selectOption('30');await p.locator('.chart-data-transition[data-points="30"]').waitFor();
 await p.locator('.chart-data-transition[data-line-draw="settled"]').waitFor();
 const reducedValue=await p.locator('.kpi:nth-child(2) [data-counter-visible]').first().textContent();const final=await p.locator('.kpi:nth-child(2) [data-counter-target]').first().getAttribute('data-counter-target');assert.equal(reducedValue,final);assert.equal(await p.locator('.chart-line-draw').count(),0);report.reducedMotionShowsExactFinalWithoutCountOrDraw=true;
 await writeFile(dir+'/check.json',JSON.stringify(report,null,2));
 await context.close();
 console.log('PASS keep old content during delayed navigation; actual count-up/down to API values; real SVG draw; complete line after resize; reduced motion immediate final values. No video recorded.');
}finally{await browser.close();}

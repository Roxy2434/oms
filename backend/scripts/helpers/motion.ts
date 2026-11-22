import type {Page} from '@playwright/test';
// Test-only setup for the retained preference provider; the visible selector was removed by request.
/** Waits until every finite CSS animation/transition has finished, so axe measures colours at rest, not mid page-enter fade. */
export async function settle(page:Page){await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'||a.effect?.getComputedTiming().iterations===Infinity),undefined,{timeout:5000});}
export async function setMotion(page:Page,value:'full'|'reduced'|'auto'){await page.evaluate(value=>{localStorage.setItem('oms.motion',value);window.dispatchEvent(new StorageEvent('storage',{key:'oms.motion',newValue:value}));},value);await page.waitForFunction(value=>document.documentElement.dataset.motion===value,value);}

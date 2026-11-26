import assert from 'node:assert/strict';
import type {BrowserContext} from '@playwright/test';
/** Dedicated server-side buyer per E2E; no local/demo credentials and no writes outside oms_test. */
export async function setupShopBuyer(context:BrowserContext,oms:string,origin:string,namespace:string){
 const username=('qa'+namespace.replace(/[^a-z0-9]/gi,'')).slice(0,20).toLowerCase(),password='QaDemo1234';
 const registered=await context.request.post(oms+'/api/storefront/register',{headers:{Origin:origin},data:{username,contact:username+'@example.test',password}});
 assert.equal(registered.status(),200,await registered.text());
 const addresses=await context.request.post(oms+'/api/storefront/addresses',{headers:{Origin:origin},data:{addresses:[{id:'home',name:'Khách QA',phone:'0900000001',province:'TP. Hồ Chí Minh',ward:'Phường Bến Thành',detail:'12 Đường QA',type:'home',isDefault:true}]}});
 assert.equal(addresses.status(),200,await addresses.text());
 const loggedOut=await context.request.post(oms+'/api/storefront/logout',{headers:{Origin:origin},data:{}});assert(loggedOut.ok());
 return {username,password};
}

import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
// Batch path for parcel steps (pack / handover / deliver / fail; the order page also has single-parcel buttons): follow the order page link there,
// tick every parcel of this order in the opened step and submit the batch.
export async function station(p:Page,origin:string,orderId:string,link:string,button:RegExp,reason?:string){
 await p.goto(origin+'/orders/'+orderId+'?tab=shipments');
 await p.getByRole('tabpanel').getByRole('link',{name:link,exact:true}).first().click();
 await p.waitForURL(/\/fulfillment\?view=/);
 const s=p.getByRole('tabpanel').locator('section.batch-section');
 const rows=s.locator('tbody tr').filter({hasText:orderId});await expect(rows.first()).toBeVisible();
 const n=await rows.count();for(let i=0;i<n;i++)await rows.nth(i).getByRole('checkbox').check();
 if(reason)await s.locator('input[placeholder^="Ví dụ"]').fill(reason);
 const [res]=await Promise.all([p.waitForResponse(r=>r.url().endsWith('/api/shipments/batch')),s.getByRole('button',{name:button}).click()]);assert(res.ok());
 await expect(s.getByRole('status')).toBeVisible();
}

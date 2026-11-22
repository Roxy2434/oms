import {test,expect} from '@playwright/test';
import {spawnSync} from 'node:child_process';
const cases=[
 ['audit fixes and four task flows: one/two warehouses, partial return and damaged sender return','check-audit-fixes-ui.ts'],
 ['isolated production UI: order/RMA/payment, lost response retry, restart and DB failure recovery','check-order-ui.ts'],
 ['single-screen checkout: quote, atomic create/hold, stale quote and lost-response retry','check-checkout-ui.ts'],
 ['role-based workflow screens: fulfillment batches, receiving station, auto RMA/refund/claim','check-workflow-ui.ts'],
 ['ShopVui storefront: buy from the OMS shop, order lands in OMS, warehouse ships, buyer status follows','check-shopvui-ui.ts'],
 ['ShopVui bank transfer: QR waits, then shows payment success in place and as a notice','check-shopvui-qr-ui.ts'],
 ['Regional DOM without coordinates, preserved SLA and non-payment HTTP hardening','check-dom-hardening-ui.ts'],
];
for(const [name,script] of cases)test(name,()=>{
 const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/'+script],{encoding:'utf8',timeout:160000,env:{...process.env,SHOPVUI_DEMO_PAY:'0',SEPAY_API_TOKEN:'',SEPAY_ACCOUNT:'',SEPAY_POLL:'off'}});
 expect(result.status,result.stdout+'\n'+result.stderr).toBe(0);console.log(result.stdout);
});

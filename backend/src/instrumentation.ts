// Runs once per server start: background jobs of this single local server.
// - ShopVui bank-transfer orders unpaid after 10 minutes (PAY_MINUTES) are cancelled and their stock released.
// - SePay polling for incoming bank transfers, when SEPAY_* is configured.
export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs')return;
 const {assertDeploymentConfig}=await import('../docker/config.mjs');assertDeploymentConfig();
 if(process.env.VERCEL==='1')return;
 const {startPaymentExpiry}=await import('./domain/integrations/shopvui');startPaymentExpiry();
 if(process.env.SEPAY_API_TOKEN){const {startSepayPoller}=await import('./domain/payments/sepay');startSepayPoller();}
}

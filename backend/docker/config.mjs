/** @param {Record<string,string|undefined>} env */
export function assertDeploymentConfig(env=process.env){
 if(env.OMS_PUBLIC_DEPLOYMENT!=='1')return;
 const fail=message=>{throw Error('Public deployment: '+message);};
 let origin;try{origin=new URL(env.APP_ORIGIN);}catch{fail('APP_ORIGIN phải là HTTPS origin.');}
 if(origin.protocol!=='https:'||origin.origin!==env.APP_ORIGIN||origin.hostname==='localhost'||origin.hostname==='127.0.0.1')fail('Cần HTTPS origin của domain, không có path.');
 if(env.SHOPVUI_ORIGIN!==env.APP_ORIGIN)fail('ShopVui và OMS phải cùng HTTPS origin.');
 if(env.OMS_DEMO_MODE!=='1')fail('COD và ví phải ở chế độ mô phỏng.');
 for(const [key,min] of [['SESSION_SECRET',48],['BOOTSTRAP_PASSWORD',20]])if(!env[key]||env[key].length<min||/change.?me|oms.demo|example/i.test(env[key]))fail('Thiếu secret riêng đủ mạnh: '+key);
 const db=new URL(env.DATABASE_URL);if(!db.password||decodeURIComponent(db.password).length<24)fail('DB password phải riêng và >=24 ký tự.');
 const test=origin.hostname.endsWith('.test');
 const skipCaptcha=env.OMS_CLASSROOM_MODE==='1'&&env.OMS_DISABLE_CAPTCHA==='1';
 if(!skipCaptcha)for(const key of ['TURNSTILE_SITEKEY','TURNSTILE_SECRET_KEY'])if(!env[key]||!test&&/^[123]x0+/.test(env[key]))fail('Cần Turnstile key thật: '+key);
 if(env.OMS_DEMO_REAL_BANK==='1'){
  for(const key of ['SEPAY_API_TOKEN','SEPAY_ACCOUNT','SEPAY_REFUND_CONTACT'])if(!env[key]?.trim())fail('Thiếu cấu hình ngân hàng: '+key);
  if(!/^\d+$/.test(env.SEPAY_START_ID||''))fail('Đặt SEPAY_START_ID đã đối chiếu trước lần chạy đầu.');
  if(env.SEPAY_POLL==='off')fail('SePay thật phải có poller để đối soát.');
 }
}

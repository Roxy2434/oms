import {NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {cookies} from 'next/headers';
import {registerShop,loginShop,shopState,saveAddresses,updateShopProfile,changeShopPassword} from '@/domain/storefront/accounts';
import {currentShopAccount,requireShopAccount,shopCookie,signShopSession} from '@/server/shop-auth';
import {DomainError} from '@/server/errors';
import {readJsonLimited,rateLimit,allowedShopOrigins} from '@/server/request-security';
import {isPublicDeployment,isClassroomMode,isCaptchaDisabled} from '@/domain/demo-mode';
import {publicLimit,durableLimit,verifyRegistrationChallenge,privateKey} from '@/server/public-security';
const allowed=(req:Request)=>allowedShopOrigins(req);
function headers(req:Request){const origin=req.headers.get('origin');return {'Cache-Control':'no-store','Vary':'Origin',...(origin&&allowed(req).has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}:{})};}
async function handle(req:Request,run:()=>Promise<unknown>){try{
 const origin=req.headers.get('origin');if(origin&&!allowed(req).has(origin)||req.method==='POST'&&(!origin||!allowed(req).has(origin)))throw new DomainError('Nguồn yêu cầu ShopVui không hợp lệ.',403);
 return NextResponse.json(await run(),{headers:headers(req)});
}catch(e){if(e instanceof ZodError)return NextResponse.json({error:e.issues.map(i=>i.message).join('; '),field:e.issues[0]?.path[0]},{status:422,headers:headers(req)});
 if(e instanceof DomainError)return NextResponse.json({error:e.message},{status:e.status,headers:headers(req)});
 if(e instanceof SyntaxError)return NextResponse.json({error:'Dữ liệu JSON không hợp lệ.'},{status:422,headers:headers(req)});
 console.error('ShopVui account operation failed',e instanceof Error?e.name:'unknown');return NextResponse.json({error:'Chưa kết nối được máy chủ. Vui lòng thử lại.'},{status:503,headers:headers(req)});}}
export async function OPTIONS(req:Request){return new NextResponse(null,{status:204,headers:headers(req)});}
export async function GET(req:Request,{params}:{params:Promise<{action:string}>}){return handle(req,async()=>{
 const {action}=await params;if(action==='security')return {captchaRequired:isPublicDeployment()&&!isCaptchaDisabled(),siteKey:isPublicDeployment()&&!isCaptchaDisabled()?process.env.TURNSTILE_SITEKEY:null};if(action!=='session')throw new DomainError('Không có thao tác này.',404);
 const u=await currentShopAccount();if(!u)return {user:null};rateLimit('shop-state:'+u.id,isClassroomMode()?600:120,60000);return shopState(u.id);
});}
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){return handle(req,async()=>{
 const {action}=await params;const cls=isClassroomMode();if(isPublicDeployment())await publicLimit(req,'shop-auth',cls?600:60);else rateLimit('shop-auth:all',cls?600:120,60000);const raw=await readJsonLimited(req,32*1024);
 const setSession=async(u:{id:string;sessionVersion:number})=>(await cookies()).set({...shopCookie,value:await signShopSession(u)});
 if(action==='register'){if(isPublicDeployment()){await publicLimit(req,'shop-register-hour',cls?200:10,3600000);await publicLimit(req,'shop-register-day',cls?400:30,86400000);await verifyRegistrationChallenge(raw);await durableLimit('registration-cap',cls?1000:500,86400000);}else rateLimit('shop-register:all',cls?200:20,60000);const u=await registerShop(raw);await setSession(u);return shopState(u.id);}
 if(action==='login'){const identity=typeof raw==='object'&&raw!==null&&'identifier' in raw?String(raw.identifier).trim().toLowerCase().slice(0,200):'';if(isPublicDeployment())await durableLimit('shop-login:'+privateKey(identity),10,60000);else rateLimit('shop-login:'+identity,10,60000);const u=await loginShop(raw);await setSession(u);return shopState(u.id);}
 if(action==='logout'){(await cookies()).set({...shopCookie,value:'',maxAge:0});return {ok:true};}
 const u=await requireShopAccount();
 if(action==='addresses')await saveAddresses(u.id,raw);
 else if(action==='profile')await updateShopProfile(u.id,raw);
 else if(action==='password'){const changed=await changeShopPassword(u.id,raw);await setSession(changed);}
 else throw new DomainError('Không có thao tác này.',404);
 return shopState(u.id);
});}

import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {ZodError} from 'zod';
import {DomainError} from '@/server/commands';
import {readJsonLimited,rateLimit} from '@/server/request-security';
import {quote,placeOrder,pay,cancel,statuses,catalog,requestReturn} from '@/domain/integrations/shopvui';
// The storefront is another site (its own origin), so it calls with a shared key instead of a staff session.
// The key ships inside the storefront's JS, so it only identifies the storefront (plus CORS); every call on an existing order
// also carries that order's token (orderToken), which only the browser that placed it holds.
const key=()=>process.env.SHOPVUI_KEY??'shopvui-local-demo';
const origins=()=>(process.env.SHOPVUI_ORIGIN??'http://127.0.0.1:8000,http://localhost:8000').split(',').map(s=>s.trim());
function cors(req:Request){const o=req.headers.get('origin');return o&&origins().includes(o)?{'Access-Control-Allow-Origin':o,'Access-Control-Allow-Headers':'Content-Type, X-ShopVui-Key','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'}:{} as Record<string,string>;}
function authorized(req:Request){const got=Buffer.from(req.headers.get('x-shopvui-key')??''),want=Buffer.from(key());return got.length===want.length&&timingSafeEqual(got,want);}
async function handle(req:Request,run:()=>Promise<unknown>){
 const headers=cors(req);
 try{const origin=req.headers.get('origin');if(origin&&!origins().includes(origin))throw new DomainError('Nguồn ShopVui không được phép.',403);rateLimit('shopvui:all',600,60000);if(req.method==='POST')rateLimit('shopvui:write',120,60000);if(!authorized(req))throw new DomainError('Sai khoá tích hợp ShopVui.',401);return NextResponse.json(await run(),{headers});}
 catch(e){if(e instanceof ZodError)return NextResponse.json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:422,headers});if(e instanceof DomainError)return NextResponse.json({error:e.message},{status:e.status,headers});if(e instanceof SyntaxError)return NextResponse.json({error:'Dữ liệu JSON không hợp lệ.'},{status:422,headers});console.error('ShopVui integration failed',e instanceof Error?e.name:'unknown');return NextResponse.json({error:'EZMART chưa xử lý được, thử lại sau.'},{status:503,headers});}
}
export async function OPTIONS(req:Request){return new NextResponse(null,{status:204,headers:cors(req)});}
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 return handle(req,async()=>{if(action==='orders')rateLimit('shopvui:orders',30,60000);const body=await readJsonLimited(req,action==='return'?7*1024*1024:32*1024);switch(action){case 'quote':return quote(body);case 'orders':return placeOrder(body);case 'pay':return pay(body);case 'cancel':return cancel(body);case 'return':return requestReturn(body);default:throw new DomainError('Không có thao tác này.',404);}});
}
export async function GET(req:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 return handle(req,async()=>{if(action==='catalog')return catalog();if(action!=='status')throw new DomainError('Không có thao tác này.',404);if(req.url.length>20000)throw new DomainError('Danh sách đơn quá dài.',413);return statuses((new URL(req.url).searchParams.get('refs')??'').split(',').map(s=>{const i=s.lastIndexOf(':');return {orderId:s.slice(0,i).trim(),token:s.slice(i+1).trim()};}).filter(r=>r.orderId&&r.token));});
}

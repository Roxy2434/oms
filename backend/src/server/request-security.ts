import {DomainError} from './errors';
/** Bounded, single-process abuse protection for the explicitly local deployment; not a distributed limiter. */
export class RateLimiter {
 private buckets=new Map<string,{count:number;until:number}>();
 constructor(private maxBuckets=2048){}
 take(key:string,limit:number,windowMs:number,now=Date.now()){
  for(const [k,v]of this.buckets)if(v.until<=now)this.buckets.delete(k);
  const value=this.buckets.get(key);
  if(value){if(value.count>=limit)return false;value.count++;return true;}
  if(this.buckets.size>=this.maxBuckets)return false;
  this.buckets.set(key,{count:1,until:now+windowMs});return true;
 }
 reset(key:string){this.buckets.delete(key);}
}
export const requestLimiter=new RateLimiter();
export function rateLimit(key:string,limit:number,windowMs:number){if(!requestLimiter.take(key,limit,windowMs))throw new DomainError('Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.',429);}
export function allowedAppOrigins():Set<string>{
 const set=new Set<string>();
 if(process.env.APP_ORIGIN?.trim())set.add(process.env.APP_ORIGIN.trim());
 if(process.env.VERCEL==='1'){
  for(const host of [process.env.VERCEL_PROJECT_PRODUCTION_URL,process.env.VERCEL_BRANCH_URL,process.env.VERCEL_URL])if(host?.trim())set.add('https://'+host.trim());
 }
 return set;
}
export function allowedShopOrigins():Set<string>{
 const set=allowedAppOrigins();
 for(const s of (process.env.SHOPVUI_ORIGIN??'http://127.0.0.1:8000,http://localhost:8000').split(','))if(s.trim())set.add(s.trim());
 return set;
}
export const isHttpsOrigin=()=>Boolean(process.env.APP_ORIGIN?.startsWith('https:')||process.env.VERCEL==='1');
export async function readJsonLimited(req:Request,maxBytes=128*1024):Promise<unknown>{
 const declared=req.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))throw new DomainError('Dữ liệu gửi lên quá lớn.',413);
 const reader=req.body?.getReader();if(!reader)throw new DomainError('Thiếu dữ liệu JSON.',422);
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new DomainError('Dữ liệu gửi lên quá lớn.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let decoded:string;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new DomainError('Dữ liệu UTF-8 không hợp lệ.',422);}return JSON.parse(decoded);
}

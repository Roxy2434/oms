import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {db} from './db';
import {DomainError} from './errors';
import {isPublicDeployment,isCaptchaDisabled} from '@/domain/demo-mode';
export const privateKey=(value:string)=>createHmac('sha256',process.env.SESSION_SECRET!).update(value).digest('hex');
/** Only behind the shipped edge, which REPLACES this header. Backend has no published port. */
export function clientIdentity(req:Request){
 const ip=req.headers.get('x-real-ip')??'';
 if(!isIP(ip))throw new DomainError('Proxy chưa cung cấp địa chỉ kết nối hợp lệ.',503);
 return privateKey('ip:'+ip);
}
export async function durableLimit(key:string,limit:number,windowMs:number){
 const expires=new Date(Date.now()+windowMs);
 const rows=await db.$queryRaw<{count:number}[]>`INSERT INTO "PUBLIC_RATE_LIMIT" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "PUBLIC_RATE_LIMIT"."expiresAt"<=CURRENT_TIMESTAMP THEN 1 ELSE "PUBLIC_RATE_LIMIT"."count"+1 END,"expiresAt"=CASE WHEN "PUBLIC_RATE_LIMIT"."expiresAt"<=CURRENT_TIMESTAMP THEN EXCLUDED."expiresAt" ELSE "PUBLIC_RATE_LIMIT"."expiresAt" END WHERE "PUBLIC_RATE_LIMIT"."expiresAt"<=CURRENT_TIMESTAMP OR "PUBLIC_RATE_LIMIT"."count"<${limit} RETURNING "count"`;
 if(!rows.length)throw new DomainError('Đã đạt giới hạn demo. Vui lòng chờ rồi thử lại.',429);
 if(Math.random()<0.02)await db.$executeRaw`DELETE FROM "PUBLIC_RATE_LIMIT" WHERE "key" IN (SELECT "key" FROM "PUBLIC_RATE_LIMIT" WHERE "expiresAt"<CURRENT_TIMESTAMP LIMIT 1000)`;
}
export async function publicLimit(req:Request,scope:string,limit:number,windowMs=60000){
 if(isPublicDeployment())await durableLimit(scope+':'+clientIdentity(req),limit,windowMs);
}
export async function verifyRegistrationChallenge(raw:unknown,fetchImpl:typeof fetch=fetch){
 if(!isPublicDeployment()||isCaptchaDisabled())return;
 const token=typeof raw==='object'&&raw!==null&&'captchaToken' in raw?raw.captchaToken:null;
 if(typeof token!=='string'||!token||token.length>2048)throw new DomainError('Vui lòng hoàn thành xác minh chống bot.',422);
 const secret=process.env.TURNSTILE_SECRET_KEY;if(!secret)throw new DomainError('Chưa cấu hình xác minh đăng ký.',503);
 let data:{success?:boolean;hostname?:string;action?:string};
 try{const res=await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret,response:token}),signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error();data=await res.json();}catch{throw new DomainError('Dịch vụ xác minh tạm thời không khả dụng. Thử lại sau.',503);}
 const expected=new URL(process.env.APP_ORIGIN!).hostname;
 const test=expected.endsWith('.test')&&secret==='1x0000000000000000000000000000000AA';
 if(!data.success||!test&&(data.hostname!==expected||data.action!=='register'))throw new DomainError('Xác minh chống bot không hợp lệ hoặc đã hết hạn.',422);
}

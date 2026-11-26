import {NextResponse} from 'next/server';
import {verify} from 'argon2';
import {z} from 'zod';
import {db} from '@/server/db';
import {createSession,sessionCookie} from '@/server/auth';
import {DomainError} from '@/server/commands';
import {readJsonLimited,requestLimiter,allowedAppOrigins} from '@/server/request-security';
import {isPublicDeployment} from '@/domain/demo-mode';
import {passwordWork} from '@/server/password-work';
import {publicLimit,durableLimit,privateKey} from '@/server/public-security';
export async function POST(req:Request){
 if(process.env.OMS_SITE_ROLE==='storefront')return NextResponse.json({error:'Không tìm thấy trang.'},{status:404});
 const origin=req.headers.get('origin');
 if(!origin||!allowedAppOrigins(req).has(origin))return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});
 // Never trust arbitrary X-Forwarded-For on this direct local server. A global bucket bounds username spraying.
 try{if(isPublicDeployment())await publicLimit(req,'staff-login',30);else if(!requestLimiter.take('login:global',120,60000))return NextResponse.json({error:'Quá nhiều yêu cầu đăng nhập. Thử lại sau.'},{status:429});}catch(e){return NextResponse.json({error:'Chưa thể đăng nhập. Vui lòng thử lại sau.'},{status:e instanceof DomainError?e.status:503});}
 let raw:unknown;try{raw=await readJsonLimited(req,4096);}catch(e){return NextResponse.json({error:'Dữ liệu đăng nhập không hợp lệ.'},{status:e instanceof DomainError?e.status:422});}
 const parsed=z.object({username:z.string().trim().min(1).max(80),password:z.string().min(1).max(256)}).safeParse(raw);
 if(!parsed.success)return NextResponse.json({error:'Nhập tài khoản và mật khẩu.'},{status:422});
 const {username,password}=parsed.data;
 if(!isPublicDeployment()&&!requestLimiter.take('login:user:'+username.toLowerCase(),8,900000))return NextResponse.json({error:'Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút.'},{status:429});
 try{
  if(isPublicDeployment())await durableLimit('staff-user:'+privateKey(username.toLowerCase()),8,900000);
  const account=await db.account.findUnique({where:{username}});
  if(!account?.active||!await passwordWork(()=>verify(account.passwordHash,password)))return NextResponse.json({error:'Tài khoản, mật khẩu không đúng hoặc tài khoản đã bị khóa.'},{status:401});
  requestLimiter.reset('login:user:'+username.toLowerCase());const token=await createSession(account);
  const res=NextResponse.json({redirect:'/dashboard'});res.cookies.set({...sessionCookie,value:token});return res;
 }catch(e){return NextResponse.json({error:'Chưa đăng nhập được. Vui lòng thử lại.'},{status:e instanceof DomainError?e.status:503});}
}

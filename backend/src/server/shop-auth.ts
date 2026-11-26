import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import {db} from './db';
import {DomainError} from './errors';
import {isHttpsOrigin} from './request-security';
const issuer='shopvui',audience='shopvui-buyer';
const key=()=>{const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('SESSION_SECRET must have at least 32 characters');return new TextEncoder().encode(s);};
export const shopCookie={name:'shopvui_session',httpOnly:true,secure:isHttpsOrigin(),sameSite:'lax' as const,path:'/',maxAge:7*86400};
export async function signShopSession(u:{id:string;sessionVersion:number}){return new SignJWT({sv:u.sessionVersion}).setProtectedHeader({alg:'HS256'}).setIssuer(issuer).setAudience(audience).setSubject(u.id).setIssuedAt().setExpirationTime('7d').sign(key());}
export async function currentShopAccount(){
 const token=(await cookies()).get(shopCookie.name)?.value;if(!token)return null;
 let p;try{p=(await jwtVerify(token,key(),{algorithms:['HS256'],issuer,audience})).payload;}catch{return null;}
 if(!p.sub)return null;
 const u=await db.shopAccount.findUnique({where:{id:p.sub},select:{id:true,active:true,sessionVersion:true}});
 return u?.active&&u.sessionVersion===p.sv?u:null;
}
export async function requireShopAccount(){const u=await currentShopAccount();if(!u)throw new DomainError('Bạn cần đăng nhập ShopVui.',401);return u;}

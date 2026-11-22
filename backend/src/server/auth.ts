import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { db } from './db';
const cookieName='oms_session';
function key(){const secret=process.env.SESSION_SECRET;if(!secret||secret.length<32)throw new Error('SESSION_SECRET chưa đủ mạnh');return new TextEncoder().encode(secret)}
export async function createSession(account:{id:string;sessionVersion:number}){return new SignJWT({sv:account.sessionVersion}).setProtectedHeader({alg:'HS256'}).setSubject(account.id).setIssuedAt().setExpirationTime('8h').sign(key())}
export async function currentAccount(){const token=(await cookies()).get(cookieName)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key(),{algorithms:['HS256']});if(!payload.sub)return null;const account=await db.account.findUnique({where:{id:payload.sub},select:{id:true,name:true,role:true,active:true,sessionVersion:true}});return account?.active&&account.sessionVersion===payload.sv?account:null}catch(e){if(e instanceof Error&&e.name.startsWith('Prisma'))throw e;return null}}
export async function requireAccount(){const account=await currentAccount();if(!account)redirect('/login');return account}
export const sessionCookie={name:cookieName,httpOnly:true,sameSite:'lax' as const,secure:process.env.APP_ORIGIN?.startsWith('https:')??false,path:'/',maxAge:8*60*60};

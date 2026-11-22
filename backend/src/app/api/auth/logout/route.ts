import { NextResponse } from 'next/server';
import { currentAccount, sessionCookie } from '@/server/auth';
import { db } from '@/server/db';
export async function POST(req:Request){if(req.headers.get('origin')!==process.env.APP_ORIGIN)return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ'},{status:403});const account=await currentAccount();if(account)await db.$transaction(async tx=>{await tx.account.update({where:{id:account.id},data:{sessionVersion:{increment:1}}});await tx.auditLog.create({data:{actorId:account.id,entity:'TAI_KHOAN',entityId:account.id,action:'DANG_XUAT'}})});const response=NextResponse.json({redirect:'/login'});response.cookies.set({...sessionCookie,value:'',maxAge:0});return response;}

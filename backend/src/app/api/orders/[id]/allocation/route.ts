import { NextResponse } from 'next/server';
import { currentAccount } from '@/server/auth';
import { allocationPreview } from '@/domain/allocation/preview';
import { DomainError } from '@/server/commands';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){const account=await currentAccount();if(!account)return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});try{return NextResponse.json(await allocationPreview((await params).id),{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:e instanceof DomainError?e.message:'Không tải được phương án kho.'},{status:e instanceof DomainError?e.status:503})}}

import { NextResponse } from 'next/server';
import { currentAccount } from '@/server/auth';
import { getWorkPreview,workQueues,type WorkQueueKey } from '@/domain/dashboard/work-queries';
export async function GET(req:Request){const account=await currentAccount();if(!account)return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});const key=new URL(req.url).searchParams.get('queue')??'';if(!Object.hasOwn(workQueues,key))return NextResponse.json({error:'Nhóm công việc không hợp lệ.'},{status:422});try{return NextResponse.json(await getWorkPreview(key as WorkQueueKey),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Chưa tải được công việc. Hãy thử lại.'},{status:503})}}

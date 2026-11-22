import { NextResponse } from 'next/server';
import { currentAccount } from '@/server/auth';
import { getDashboard } from '@/domain/dashboard/queries';
export async function GET(req:Request){const account=await currentAccount();if(!account)return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});const q=new URL(req.url).searchParams;const channel=q.get('channel')??'ALL';if(!['ALL','NHAP_TAY','WEBSITE','SHOPEE','TIKTOK','SHOPVUI'].includes(channel))return NextResponse.json({error:'Kênh không hợp lệ.'},{status:422});try{return NextResponse.json(await getDashboard(account.role,q.get('period')==='7'?7:30,channel),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Không tải được tổng quan. Kiểm tra cơ sở dữ liệu và thử lại.'},{status:503})}}

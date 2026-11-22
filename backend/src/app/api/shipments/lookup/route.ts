import {NextResponse} from 'next/server';
import {currentAccount} from '@/server/auth';
import {db} from '@/server/db';
import {batchRowInclude,toBatchRow} from '@/features/fulfillment/rows';
const steps=['DANG_GIU','CHO_BAN_GIAO','DANG_GIAO'] as const;
/** Scan fallback for the fulfillment screen: the lists show the oldest 500 parcels per step, so a scanned parcel code, order code
 * or waybill that is not on screen is looked up here (same step, same warehouse filter). Read-only. */
export async function GET(req:Request){
 const account=await currentAccount();if(!account)return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});
 const q=new URL(req.url).searchParams;const code=(q.get('code')??'').trim().slice(0,80),status=q.get('status')??'',warehouse=q.get('warehouse')??'';
 if(!code||!steps.includes(status as typeof steps[number]))return NextResponse.json({error:'Thiếu mã hoặc bước không hợp lệ.'},{status:422});
 const upper=code.toUpperCase();
 const rows=await db.shipment.findMany({where:{status:status as typeof steps[number],...(warehouse?{warehouseId:warehouse}:{}),OR:[{id:code},{orderId:upper},{trackingCode:upper},...(code.length===8?[{id:{endsWith:code.toLowerCase()}}]:[])]},orderBy:[{createdAt:'asc'},{id:'asc'}],take:20,include:batchRowInclude});
 return NextResponse.json({rows:rows.map(toBatchRow)},{headers:{'Cache-Control':'no-store'}});
}

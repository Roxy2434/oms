import {redirect} from 'next/navigation';
import {requireAccount} from '@/server/auth';
import type {Query} from '@/features/shared/list-controls';
// Parcel lookup now lives in the order list (search by parcel code / waybill, filter by warehouse and Tình trạng);
// old /shipments links keep working by landing on the equivalent order filter.
const byStatus:Record<string,string>={DANG_GIU:'cho_dong_goi',CHO_BAN_GIAO:'cho_ban_giao',DANG_GIAO:'dang_giao',GIAO_THAT_BAI:'giao_that_bai',CHUYEN_HOAN:'tra_hang'};
export default async function Shipments({searchParams}:{searchParams:Promise<Query>}){
 await requireAccount();const q=await searchParams;
 if(q.queue==='packing')redirect('/fulfillment');
 const p=new URLSearchParams();if(q.search)p.set('search',q.search);if(q.warehouse)p.set('warehouse',q.warehouse);if(q.status&&byStatus[q.status])p.set('progress',byStatus[q.status]);
 redirect('/orders'+(p.size?'?'+p.toString():''));
}

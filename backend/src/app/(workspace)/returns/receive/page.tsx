import {redirect} from 'next/navigation';
import {requireAccount} from '@/server/auth';
// Receiving is a step of the return case, not a separate screen: old links land on the returns list's "Chờ kho nhận" queue,
// where the warehouse finds the case by return waybill and receives + inspects it on the case page.
export default async function Receive({searchParams}:{searchParams:Promise<{q?:string;warehouse?:string}>}){
 await requireAccount();const {q,warehouse}=await searchParams;
 const p=new URLSearchParams({queue:'receive'});if(q?.trim())p.set('search',q.trim().slice(0,120));if(warehouse)p.set('warehouse',warehouse);
 redirect('/returns?'+p.toString());
}

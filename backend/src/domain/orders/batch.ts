import {z} from 'zod';
import {db} from '@/server/db';
import {DomainError} from '@/server/commands';
import {orderCommand} from './lifecycle';
const input=z.object({action:z.enum(['pack','handover','deliver','fail']),shipmentIds:z.array(z.string().min(1).max(80)).min(1).max(50),reason:z.string().trim().min(3).max(200).optional()});
/** Warehouse batch: runs the normal per-parcel order command for each parcel (own transaction, key = batchKey:parcel),
 * so a replay of the same batch never double-books and one blocked parcel does not stop the others. */
export async function shipmentBatch(actorId:string,key:string,raw:unknown){
 const p=input.parse(raw);if(p.action==='fail'&&!p.reason)throw new DomainError('Cần lý do giao thất bại.',422);if(key.length<8||key.length>100)throw new DomainError('Mã thao tác không hợp lệ.',422);
 const ids=[...new Set(p.shipmentIds)].sort();const rows=await db.shipment.findMany({where:{id:{in:ids}},select:{id:true,orderId:true}});
 const results:{shipmentId:string;orderId?:string;ok:boolean;error?:string;trackingCode?:string|null}[]=[];
 for(const id of ids){
  const s=rows.find(r=>r.id===id);if(!s){results.push({shipmentId:id,ok:false,error:'Không tìm thấy kiện.'});continue;}
  try{await orderCommand(actorId,key+':'+id,s.orderId,{action:p.action,shipmentId:id,...(p.action==='fail'?{reason:p.reason}:{})});results.push({shipmentId:id,orderId:s.orderId,ok:true});}
  catch(e){if(e instanceof DomainError)results.push({shipmentId:id,orderId:s.orderId,ok:false,error:e.message});else throw e;}
 }
 const codes=await db.shipment.findMany({where:{id:{in:ids}},select:{id:true,trackingCode:true}});
 return {action:p.action,results:results.map(r=>({...r,trackingCode:codes.find(c=>c.id===r.shipmentId)?.trackingCode??null}))};
}

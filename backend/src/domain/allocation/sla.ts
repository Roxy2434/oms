import {z} from 'zod';
import {DomainError} from '../../server/errors';
import {ROUTING_POLICY} from './routing';
const evidence=z.object({policy:z.enum([ROUTING_POLICY,'DOM-OFFLINE-V2']),parcels:z.array(z.object({warehouseId:z.string(),route:z.object({transitHours:z.number().finite().nonnegative(),queueHours:z.number().finite().nonnegative()})}))});
/** Do not silently rewrite historical DEMO-V1 promises. New plans must survive delay until handover. */
export function assertShipmentSla(shipment:{warehouseId:string;allocationEvidence:unknown},deadline:Date|null,at=new Date()){
 const raw=shipment.allocationEvidence as {policy?:unknown}|null;if(raw?.policy!==ROUTING_POLICY&&raw?.policy!=='DOM-OFFLINE-V2')return;
 const parsed=evidence.safeParse(raw),route=parsed.success?parsed.data.parcels.find(p=>p.warehouseId===shipment.warehouseId)?.route:null;
 if(!route||!deadline||!Number.isFinite(deadline.getTime()))throw new DomainError('Thiếu căn cứ SLA. Kiểm tra lại phương án trước khi bàn giao.');
 // Processing is finished when pack/handover is recorded. Retain the committed queue/transit buffers.
 if(at.getTime()+(route.transitHours+route.queueHours)*3600000>deadline.getTime())throw new DomainError('Không còn đủ thời gian giao trong SLA 24 giờ. Chưa xuất kho; cần xử lý ngoại lệ hoặc hủy và lập lại phương án.');
 return new Date(at.getTime()+(route.transitHours+route.queueHours)*3600000);
}

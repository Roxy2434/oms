// One parcel as a row of the warehouse batch screens. Shared by the fulfillment page (oldest-first lists) and the scan lookup
// API (a scanned parcel outside the rows on screen), so both show the same columns and notes.
import type {Prisma} from '@/generated/prisma/client';
import {effectiveValue} from '@/domain/dashboard/queries';
import {moneyPosition,returnDeductions} from '@/domain/payments/balances';
import type {BatchRow} from './batch-section';

export const batchRowInclude={warehouse:true,lines:true,order:{include:{lines:true,transactions:true,shipments:{include:{lines:true}},returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}}} satisfies Prisma.ShipmentInclude;
type Parcel=Prisma.ShipmentGetPayload<{include:typeof batchRowInclude}>;

export function toBatchRow(s:Parcel):BatchRow{
 const o=s.order;const items=s.lines.map(l=>{const line=o.lines.find(x=>x.id===l.orderLineId);return (line?.nameSnapshot??'Sản phẩm')+' × '+l.quantity;}).join(', ');
 const unpaid=o.paymentMethod==='TRA_TRUOC'&&moneyPosition(o.transactions).available<Math.max(0,Number(effectiveValue(o))-returnDeductions(o.returns));
 return {id:s.id,orderId:o.id,recipient:o.recipient,warehouse:s.warehouse.name,items,tracking:s.trackingCode,note:[o.shipments.filter(x=>x.status!=='HUY').length>1?'Đơn tách 2 kho':'',o.paymentMethod==='COD'?'COD':'Trả trước',unpaid?'Chưa thu đủ — chưa bàn giao được':''].filter(Boolean).join(' · ')};
}

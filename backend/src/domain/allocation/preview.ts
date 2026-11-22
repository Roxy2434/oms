import {resolveOrderId} from '@/domain/orders/identifiers';
import { db } from '@/server/db';
import { DomainError } from '@/server/commands';
import { solveAllocation } from './solver';
import {allocationWarehouse} from './contracts';
export async function allocationPreview(orderId:string){orderId=resolveOrderId(orderId);const order=await db.order.findUnique({where:{id:orderId},include:{lines:{include:{sku:true}}}});if(!order)throw new DomainError('Không tìm thấy đơn.',404);if(!['NHAP','CHO_HANG'].includes(order.status))throw new DomainError('Đơn đã xác nhận; không tính lại trực tiếp.');const warehouses=await db.warehouse.findMany({where:{active:true},include:{inventory:{where:{skuId:{in:order.lines.map(l=>l.skuId)}}}}});return {orderId,version:order.version,plan:solveAllocation(order.lines.map(l=>({id:l.id,skuId:l.skuId,name:l.nameSnapshot,quantity:l.quantity,weightGrams:l.sku.weightGrams})),warehouses.map(allocationWarehouse),order.region,order.deadline?Math.max(0,(order.deadline.getTime()-Date.now())/3600000):24)}}

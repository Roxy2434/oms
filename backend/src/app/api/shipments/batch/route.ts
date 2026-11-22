import {mutation} from '@/server/http';
import {shipmentBatch} from '@/domain/orders/batch';
export async function POST(req:Request){return mutation(req,(actor,key,body)=>shipmentBatch(actor,key,body));}

import {mutation} from '@/server/http';
import {orderCommand} from '@/domain/orders/lifecycle';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return mutation(req,(actor,key,body)=>orderCommand(actor,key,id,body));}

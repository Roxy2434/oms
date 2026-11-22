import {mutation} from '@/server/http';
import {paymentCommand} from '@/domain/payments/service';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return mutation(req,(actor,key,body)=>paymentCommand(actor,key,id,body));}

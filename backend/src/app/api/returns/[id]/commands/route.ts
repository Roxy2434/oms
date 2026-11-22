import {mutation} from '@/server/http';
import {returnCommand} from '@/domain/returns/service';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return mutation(req,(actor,key,body)=>returnCommand(actor,key,id,body));}

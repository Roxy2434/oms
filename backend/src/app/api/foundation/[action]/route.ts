import {mutation} from '@/server/http';
import {DomainError} from '@/server/commands';
import {saveAccount,saveCatalog,saveCustomer,countStock} from '@/domain/foundation/service';
import {receiveStock} from '@/domain/inventory/service';
import {z} from 'zod';
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){const {action}=await params;return mutation(req,(actor,key,body)=>{switch(action){case 'customers':return saveCustomer(actor,key,body);case 'accounts':return saveAccount(actor,key,body);case 'catalog':return saveCatalog(actor,key,body);case 'count':return countStock(actor,key,body);case 'receive':return receiveStock(actor,key,z.object({warehouseId:z.string().min(1),skuId:z.string().min(1),quantity:z.number().int().positive().max(1000000),reason:z.string().trim().min(1).max(200)}).parse(body));default:throw new DomainError('Không có thao tác này.',404);}});}

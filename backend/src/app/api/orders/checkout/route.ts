import {mutation} from '@/server/http';
import {createCheckout} from '@/domain/orders/checkout';
export async function POST(req:Request){return mutation(req,(actor,key,body)=>createCheckout(actor,key,body));}

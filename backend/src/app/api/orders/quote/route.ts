import {mutation} from '@/server/http';
import {checkoutQuote} from '@/domain/orders/checkout';
export async function POST(req:Request){return mutation(req,async(_actor,_key,body)=>checkoutQuote(body));}

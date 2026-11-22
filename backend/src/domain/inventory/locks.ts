import {Prisma} from '@/generated/prisma/client';
import type {Tx} from '@/server/commands';
/** Stable row order across warehouses prevents lock inversion. Unrelated SKUs are never locked. */
export async function lockAllocationStock(tx:Tx,skuIds:string[]){
 const ids=[...new Set(skuIds)].sort();if(!ids.length)return;
 await tx.$queryRaw(Prisma.sql`SELECT kho_id FROM "TON_KHO" WHERE sku_id IN (${Prisma.join(ids)}) ORDER BY kho_id,sku_id FOR UPDATE`);
}

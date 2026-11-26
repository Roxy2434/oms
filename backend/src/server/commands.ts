import { createHash } from 'node:crypto';
import {isRetryableTransactionError} from './transaction-errors';
import { db } from './db';
import type { Prisma } from '@/generated/prisma/client';
export type Tx=Prisma.TransactionClient;
/** Runs Prisma queries one after another. Inside an interactive transaction all queries share one connection, and pg
 * deprecates concurrent queries on one client (Promise.all there), so transactions use this instead. Queries are lazy until awaited. */
export async function sequential<T extends readonly unknown[]>(queries:T):Promise<{-readonly [K in keyof T]:Awaited<T[K]>}>{const out:unknown[]=[];for(const q of queries)out.push(await q);return out as {-readonly [K in keyof T]:Awaited<T[K]>};}
import {DomainError} from './errors';
export {DomainError} from './errors';
function canonical(value:unknown):string{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}'}
async function snapshot(tx:Tx,entity:string,id:string):Promise<Prisma.InputJsonValue>{
 if(entity==='DON_HANG'){const row=await tx.order.findUnique({where:{id},include:{lines:true,shipments:{include:{lines:true}},transactions:true}});return row?JSON.parse(JSON.stringify(row)):{};}
 if(entity==='HO_SO_TRA'){const row=await tx.returnCase.findUnique({where:{id},include:{lines:true,claims:true,photos:{select:{id:true,mime:true,createdAt:true}}}});return row?JSON.parse(JSON.stringify(row)):{};}
 if(entity==='TAI_KHOAN'){return await tx.account.findUnique({where:{id},select:{id:true,name:true,username:true,role:true,active:true,sessionVersion:true}})??{};}
 if(entity==='KHACH_HANG'){const row=await tx.customer.findUnique({where:{id}});return row?JSON.parse(JSON.stringify(row)):{};}
 if(entity==='sku'){const row=await tx.sku.findUnique({where:{id}});return row?JSON.parse(JSON.stringify(row)):{};}
 if(entity==='warehouse'){return await tx.warehouse.findUnique({where:{id}})??{};}
 return {};
}
export async function command<T extends Prisma.InputJsonValue>(actorId:string,key:string,action:string,entity:string,entityId:string,payload:unknown,run:(tx:Tx)=>Promise<T>,at=new Date()):Promise<T>{if(key.length<8||key.length>160)throw new DomainError('Mã thao tác không hợp lệ.',422);const hash=createHash('sha256').update(canonical({action,entity,entityId,payload,actorId})).digest('hex');const maxAttempts=process.env.OMS_CLASSROOM_MODE==='1'?60:18;for(let attempt=0;attempt<maxAttempts;attempt++){try{return await db.$transaction(async tx=>{const actor=await tx.account.findUnique({where:{id:actorId}});if(!actor?.active)throw new DomainError('Tài khoản không hoạt động.',403);if(['LUU_TAI_KHOAN','LUU_DANH_MUC'].includes(action)&&actor.role!=='QUAN_LY')throw new DomainError('Chỉ Quản lý được thực hiện.',403);const previous=await tx.auditLog.findUnique({where:{commandKey:key}});if(previous){if(previous.actorId!==actorId||previous.payloadHash!==hash)throw new DomainError('Mã thao tác đã được dùng cho dữ liệu khác.');return previous.result as T}const before=await snapshot(tx,entity,entityId);const result=await run(tx);const candidate=(result as {id?:unknown})?.id;const resolvedId=typeof candidate==='string'?candidate:entityId;const after=await snapshot(tx,entity,resolvedId);await tx.auditLog.create({data:{actorId,commandKey:key,payloadHash:hash,action,entity,entityId:resolvedId,before,after,result,createdAt:at}});return result},{isolationLevel:'Serializable',maxWait:15000,timeout:30000})}catch(e){const code=(e as {code?:string}).code;const retryable=isRetryableTransactionError(e);if(retryable&&attempt<maxAttempts-1){await new Promise(r=>setTimeout(r,4+Math.min(attempt,8)*6+Math.floor(Math.random()*24)));continue;}// P2002 is retried for same-key races; still failing means a real duplicate (username, reference…).
if(code==='P2002')throw new DomainError('Mã hoặc tên này đã tồn tại. Hãy dùng giá trị khác.');if(retryable)throw new DomainError('Dữ liệu thay đổi đồng thời. Hãy tải lại hoặc thử lại cùng thao tác.');throw e}}throw new DomainError('Dữ liệu thay đổi đồng thời. Hãy tải lại.');}

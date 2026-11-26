/** Prisma can wrap a PostgreSQL conflict in meta.driverAdapterError OR throw it directly at commit. */
export function isRetryableTransactionError(error:unknown){
 const queue:unknown[]=[error],seen=new Set<unknown>();
 for(let i=0;queue.length&&i<16;i++){
  const value=queue.shift();if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);
  const row=value as Record<string,unknown>;
  if(['P2034','P2002','40001','40P01'].includes(String(row.code??row.originalCode??''))||row.kind==='TransactionWriteConflict')return true;
  queue.push(row.cause,row.meta,row.driverAdapterError);
 }
 return false;
}

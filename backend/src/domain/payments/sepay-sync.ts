import {createHash} from 'node:crypto';
import {Client} from 'pg';
import {db} from '@/server/db';
import type {BankTransfer} from './sepay';
const cursorKey=()=>createHash('sha256').update('sepay:'+process.env.SEPAY_ACCOUNT).digest('hex');
export async function bankSyncReady(){const c=await db.sepayCursor.findUnique({where:{id:cursorKey()}});return !!c?.syncedAt&&!c.error&&Date.now()-c.syncedAt.getTime()<120000;}
type Row={id:string|number;amount_in:string;account_number?:string;transaction_content:string|null;reference_number:string|null};
/** SePay docs: since_id is inclusive; list returns newest first, max5000. Never advance on overflow/error.
 * Inbox + per-event checkpoint survive restarts. One DB advisory lease across app processes. */
export async function syncSepay(cfg:{token:string;account:string},record:(t:BankTransfer)=>Promise<{id:string;status?:string}|null>,fetchImpl:typeof fetch){
 const lock=new Client({connectionString:process.env.DATABASE_URL});await lock.connect();const id=cursorKey();let acquired=false;
 try{
  acquired=(await lock.query("SELECT pg_try_advisory_lock(hashtext('oms-sepay-sync')) AS ok")).rows[0].ok;if(!acquired)return {recorded:0,busy:true};
  const c=await db.sepayCursor.upsert({where:{id},create:{id,lastId:process.env.SEPAY_START_ID||'0'},update:{}});
  if(!/^\d+$/.test(c.lastId))throw Error('Invalid SePay cursor');
  const params=new URLSearchParams({account_number:cfg.account,since_id:c.lastId,limit:'5000'});
  const res=await fetchImpl('https://my.sepay.vn/userapi/transactions/list?'+params,{headers:{Authorization:'Bearer '+cfg.token},signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('SePay unavailable');
  const body=await res.json() as {transactions?:Row[];error?:unknown;status?:number};if(body.error||body.status&&body.status!==200||!Array.isArray(body.transactions))throw Error('Invalid SePay response');
  if(body.transactions.length>=5000){await db.sepayCursor.update({where:{id},data:{error:'BATCH_OVERFLOW'}});throw Error('SePay backlog >=5000: reconcile date ranges manually before resuming. Cursor unchanged.');}
  const rows=body.transactions;for(const r of rows)if(!/^\d+$/.test(String(r.id))||r.account_number&&r.account_number!==cfg.account)throw Error('Invalid SePay row');
  rows.sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:BigInt(a.id)>BigInt(b.id)?1:0);
  let recorded=0,last=BigInt(c.lastId);
  for(const r of rows){const eventId=String(r.id);if(BigInt(eventId)<=last)continue;
   const amount=Number(r.amount_in);if(!Number.isSafeInteger(amount)||amount<0||amount>999999999999)throw Error('Invalid bank amount');
   if(amount>0){
    const transfer={id:eventId,amount,content:(r.transaction_content??'').slice(0,2000),reference:(r.reference_number??'').slice(0,120)};
    await db.sepayInbox.upsert({where:{id:eventId},create:{id:eventId,amount,content:transfer.content,reference:transfer.reference},update:{}});
    const result=await record(transfer);if(result)recorded++;
    await db.sepayInbox.update({where:{id:eventId},data:{state:result?(result.status==='CHUA_RO'?'REVIEW':'RECORDED'):'UNMATCHED',orderId:result?.id??null}});
   }
   await db.sepayCursor.update({where:{id},data:{lastId:eventId}});last=BigInt(eventId);
  }
  await db.sepayCursor.update({where:{id},data:{syncedAt:new Date(),error:null}});return {recorded};
 }catch(e){if(acquired)await db.sepayCursor.updateMany({where:{id,error:null},data:{error:'SYNC_ERROR'}});throw e;}
 finally{if(acquired)await lock.query("SELECT pg_advisory_unlock(hashtext('oms-sepay-sync'))");await lock.end();}
}

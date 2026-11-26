// Real bank transfers (MB Bank via SePay): the buyer scans a VietQR whose transfer note is the order code;
// OMS polls SePay's transaction list and records each incoming transfer once against the order it names.
import {randomBytes} from 'node:crypto';
import {hash} from 'argon2';
import {db} from '@/server/db';
import {command,DomainError,type Tx} from '@/server/commands';
import {realBankAllowed,isPublicDeployment} from '@/domain/demo-mode';
import {syncSepay} from './sepay-sync';
import {effectiveValue} from '@/domain/dashboard/queries';
import {moneyPosition} from './balances';
import {reconcileReturns} from './service';

/** SePay is available only when token and receiving account are configured; no simulated bank fallback. */
export function sepayConfig(){if(!realBankAllowed())return null;const token=process.env.SEPAY_API_TOKEN,account=process.env.SEPAY_ACCOUNT;const bank=process.env.SEPAY_BANK||'970422'/* MB Bank BIN */;return token&&account?{token,account,bank,bankName:bank==='970422'?'MB Bank':bank,holder:process.env.SEPAY_HOLDER||''}:null;}
/** Banks strip "-" and accents from transfer notes, so the note carries the order code without separators. */
export const payCode=(orderId:string)=>orderId.replace(/[^0-9A-Za-z]/g,'').toUpperCase();
/** Finds the order code in a transfer note: DH-YYMMDD-XXXXXX (new) or DH-000123 (seed), with or without separators. */
export function orderIdFromNote(note:string){const s=note.toUpperCase();const m=/DH[-\s.]?(\d{6})[-\s.]?([0-9A-F]{6})(?![0-9A-Z])/.exec(s);if(m)return `DH-${m[1]}-${m[2]}`;const old=/DH[-\s.]?(\d{6})(?![0-9A-Z])/.exec(s);return old?'DH-'+old[1]:null;}
export const qrUrl=(cfg:{account:string;bank:string},orderId:string,amount:number)=>`https://vietqr.app/img?acc=${encodeURIComponent(cfg.account)}&bank=${encodeURIComponent(cfg.bank)}&amount=${amount}&des=${payCode(orderId)}&template=compact`;

type DueOrder=Parameters<typeof effectiveValue>[0]&{transactions:{kind:string;status:string;amount:unknown}[]};
/** Still to collect on a prepaid order (same rule as the payment bound: effective value minus collected and pending).
 * No return deduction: prepaid orders are paid before handover, so nothing can have been returned yet. */
export function prepaidDue(o:DueOrder){const b=moneyPosition(o.transactions as never);return Math.max(0,Number(effectiveValue(o))-(b.net+b.pendingCollect));}

async function actor(){const existing=await db.account.findUnique({where:{username:'sepay'}});if(existing)return existing;return db.account.upsert({where:{username:'sepay'},update:{},create:{username:'sepay',name:'Ngân hàng (SePay, tự động)',role:'NHAN_VIEN',passwordHash:await hash(randomBytes(32).toString('hex'))}});}

export type BankTransfer={id:string;amount:number;content:string;reference:string};
/** Records one incoming transfer for the order its note names. Exact or partial payment of a confirmed prepaid order is a
 * successful receipt; anything else (over-payment, COD, cancelled order) is recorded "chưa rõ" for staff review.
 * Same SePay id replays, never duplicates. Returns null when the note names no known order. */
export async function recordTransfer(t:BankTransfer){
 if(!realBankAllowed())throw new DomainError('Chế độ demo không nhận giao dịch ngân hàng thật.',403);
 const orderId=orderIdFromNote(t.content);if(!orderId||!(await db.order.findUnique({where:{id:orderId},select:{id:true}})))return null;
 const me=await actor();
 return command(me.id,'sepay-tx:'+t.id,'SEPAY_NHAN_TIEN','DON_HANG',orderId,t,async(tx:Tx)=>{
  await tx.$queryRaw`SELECT id FROM "DON_HANG" WHERE id=${orderId} FOR UPDATE`;
  const o=await tx.order.findUniqueOrThrow({where:{id:orderId},include:{shopPurchase:true,lines:true,shipments:{include:{lines:true}},transactions:true,returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}});
  const due=prepaidDue(o),clear=Number.isSafeInteger(t.amount)&&t.amount>0&&(!o.shopPurchase||o.shopPurchase.payment==='bank')&&o.paymentMethod==='TRA_TRUOC'&&o.status==='DA_XAC_NHAN'&&t.amount<=due;
  const at=new Date();
  const row=await tx.moneyTransaction.create({data:{orderId,kind:'THU',reason:'THU_TRA_TRUOC',amount:t.amount,source:'CHUYEN_KHOAN',reference:'SEPAY-'+(t.reference||t.id),status:clear?'THANH_CONG':'CHUA_RO',idempotencyKey:'sepay-tx:'+t.id,recordedById:me.id,approvedById:me.id,confirmedAt:clear?at:null,
   note:clear?'Chuyển khoản MB Bank, SePay xác nhận':`Chuyển khoản MB Bank ${t.amount}đ nhưng đơn ${o.paymentMethod==='COD'?'thu COD':o.status==='DA_XAC_NHAN'?'chỉ còn phải thu '+due+'đ':'ở trạng thái '+o.status}; cần tra soát, hoàn phần thừa nếu có`}});
  await reconcileReturns(tx,o,[...o.transactions,row]);
  return {id:orderId,transactionId:row.id,status:row.status};
 });
}

type SepayRow={id:string|number;amount_in:string;transaction_content:string|null;reference_number:string|null};
const unmatched=new Set<string>();
/** One poll: the latest 50 transactions of the receiving account; already-recorded ids are skipped cheaply.
 * shortcut: only the latest 50 per poll; upgrade to since_id paging if more than 50 transfers can arrive between two polls. */
export async function pollSepay(fetchImpl:typeof fetch=fetch){
 const cfg=sepayConfig();if(!cfg)return {recorded:0};
 if(isPublicDeployment())return syncSepay(cfg,recordTransfer,fetchImpl);
 const res=await fetchImpl(`https://my.sepay.vn/userapi/transactions/list?account_number=${encodeURIComponent(cfg.account)}&limit=50`,{headers:{Authorization:'Bearer '+cfg.token,'Content-Type':'application/json'}});
 if(!res.ok)throw new Error('SePay trả HTTP '+res.status);
 const rows=((await res.json()) as {transactions?:SepayRow[]}).transactions??[];
 let recorded=0;
 for(const r of rows){
  const id=String(r.id),amount=Math.round(Number(r.amount_in));if(!(amount>0)||unmatched.has(id))continue;
  if(await db.moneyTransaction.findUnique({where:{idempotencyKey:'sepay-tx:'+id},select:{id:true}}))continue;
  try{const done=await recordTransfer({id,amount,content:r.transaction_content??'',reference:r.reference_number??''});if(done)recorded++;else{unmatched.add(id);console.warn('SePay: giao dịch',id,'không ghi mã đơn EZMART, bỏ qua');}}
  catch(e){console.error('SePay: chưa ghi được giao dịch',id,e instanceof Error?e.message:e);}
 }
 return {recorded};
}

/** Started once per server process from instrumentation.ts. SePay allows 2 calls/s; one call every 5 s. */
export function startSepayPoller(everyMs=5000){
 const g=globalThis as {sepayPoller?:boolean};if(g.sepayPoller||!sepayConfig()||process.env.SEPAY_POLL==='off')return;// off: UI tests show the QR without calling the real bank
 g.sepayPoller=true;
 let busy=false;setInterval(async()=>{if(busy)return;busy=true;try{await pollSepay();}catch(e){console.error('SePay poll:',e instanceof Error?e.message:e);}finally{busy=false;}},everyMs);
 console.log('SePay: đang theo dõi chuyển khoản thật; không thực hiện chuyển tiền ra.');
}
let lastOnDemandPoll=0,onDemandPromise:Promise<{recorded:number}>|null=null;
/** Serverless fallback when background setInterval does not persist between requests (Vercel). */
export async function pollSepayOnDemand(minIntervalMs=4000){
 if(process.env.VERCEL!=='1'||!sepayConfig()||process.env.SEPAY_POLL==='off')return {recorded:0};
 const now=Date.now();if(now-lastOnDemandPoll<minIntervalMs)return {recorded:0};
 if(onDemandPromise)return onDemandPromise;
 lastOnDemandPoll=now;
 onDemandPromise=pollSepay().catch(e=>{console.error('SePay on-demand poll:',e instanceof Error?e.message:e);return {recorded:0};}).finally(()=>{onDemandPromise=null;});
 return onDemandPromise;
}

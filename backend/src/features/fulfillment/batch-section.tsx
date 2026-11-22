'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCommandMutation} from '@/features/shared/use-command-mutation';
export type BatchRow={id:string;orderId:string;recipient:string;warehouse:string;items:string;tracking:string|null;note?:string};
type Action={action:'pack'|'handover'|'deliver'|'fail';label:string;needsReason?:boolean;primary?:boolean};
type Result={action:string;results:{shipmentId:string;orderId?:string;ok:boolean;error?:string;trackingCode?:string|null}[]};
const short=(id:string)=>id.slice(-8).toUpperCase();
/** Scanner input: a parcel code, order code or waybill picks every matching row in this section (Sapo/Odoo style scan-to-select). */
export function matchScan(rows:BatchRow[],raw:string){const q=raw.trim().toUpperCase();if(!q)return [];return rows.filter(r=>r.id.toUpperCase()===q||short(r.id)===q||r.orderId.toUpperCase()===q||(r.tracking??'').toUpperCase()===q).map(r=>r.id);}
export function BatchSection({title,description,rows:listed,actions,empty,actor,total=listed.length,status,warehouse}:{title:string;description:string;rows:BatchRow[];actions:Action[];empty:string;actor?:string;total?:number;status?:string;warehouse?:string}){
 // Parcels found by scanning that are outside the oldest-first rows on screen (lists are capped): shown first, already selected.
 const [extra,setExtra]=useState<BatchRow[]>([]);const rows=[...extra.filter(x=>!listed.some(r=>r.id===x.id)),...listed];
 const [selected,setSelected]=useState<string[]>([]);const [reason,setReason]=useState('');const [result,setResult]=useState<Result|null>(null);const [scan,setScan]=useState('');const [scanMsg,setScanMsg]=useState<{ok:boolean;text:string}|null>(null);const [handed,setHanded]=useState<{rows:BatchRow[];at:string}|null>(null);
 const mutation=useCommandMutation('/api/shipments/batch');const router=useRouter();
 const all=rows.length>0&&selected.length===rows.length;
 async function lookup(code:string){
  // Only when this step has parcels not on screen; otherwise "not in this section" is already the answer.
  if(!status||total<=listed.length)return [];
  try{const r=await fetch('/api/shipments/lookup?'+new URLSearchParams({code,status,warehouse:warehouse??''}),{cache:'no-store'});if(!r.ok)return [];return ((await r.json()) as {rows:BatchRow[]}).rows;}catch{return [];}
 }
 async function onScan(e:React.FormEvent){e.preventDefault();const code=scan.trim();setScan('');let ids=matchScan(rows,code);
  if(!ids.length){const found=await lookup(code);if(found.length){setExtra(x=>[...found.filter(f=>!x.some(y=>y.id===f.id)),...x]);ids=found.map(f=>f.id);const next=[...new Set([...selected,...ids])];setSelected(next);setScanMsg({ok:true,text:`Đã chọn ${ids.length} kiện (${code}), đưa lên đầu danh sách. Đang chọn ${next.length}.`});return;}}
  if(!ids.length)setScanMsg({ok:false,text:`Mã ${code} không có trong mục này. Kiểm tra lại kiện.`});
  else if(ids.every(id=>selected.includes(id)))setScanMsg({ok:false,text:`Mã ${code} đã quét rồi.`});
  else{const next=[...new Set([...selected,...ids])];setSelected(next);setScanMsg({ok:true,text:`Đã chọn ${ids.length} kiện (${code}). Đang chọn ${next.length}/${rows.length}.`});}
 }
 async function run(a:Action){if(!selected.length)return;const picked=rows.filter(r=>selected.includes(r.id));const data=await mutation.run<Result>({action:a.action,shipmentIds:selected,...(a.needsReason?{reason}:{})});if(!data)return;setResult(data);setScanMsg(null);
  if(data.action==='handover'){const ok=new Map(data.results.filter(r=>r.ok).map(r=>[r.shipmentId,r.trackingCode??null]));setHanded({rows:picked.filter(r=>ok.has(r.id)).map(r=>({...r,tracking:ok.get(r.id)??r.tracking})),at:new Date().toLocaleString('vi-VN')});}
  setSelected([]);setReason('');setExtra([]);router.refresh();}
 function printHandover(){const html=document.documentElement;html.classList.add('print-handover');const done=()=>{html.classList.remove('print-handover');window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);window.print();}
 const byWarehouse=handed?[...new Set(handed.rows.map(r=>r.warehouse))].map(w=>({w,rows:handed.rows.filter(r=>r.warehouse===w)})):[];
 const ok=result?.results.filter(r=>r.ok)??[],failed=result?.results.filter(r=>!r.ok)??[];
 return <section className="panel form-section batch-section" aria-label={title}>
  <header className="batch-heading"><div><h2>{title} <span className="badge blue">{total}</span></h2><p>{description}</p>{total>rows.length&&<p className="notice">Đang hiện {rows.length} kiện cũ nhất trên tổng {total}. Chọn kho làm việc để thu hẹp danh sách.</p>}</div></header>
  {rows.length===0?<p className="text-muted">{empty}</p>:<>
   <form className="list-filter" onSubmit={onScan}><label>Quét mã kiện / mã đơn / mã vận đơn<input value={scan} onChange={e=>setScan(e.target.value)} placeholder="Quét hoặc gõ mã, Enter" autoComplete="off"/></label><button className="button" type="submit" disabled={!scan.trim()}>Chọn</button>
    {/* Same row as the input, always rendered: the table below never shifts when a scan result appears. */}
    <p className="scan-status" data-tone={scanMsg?.ok===false?'error':'ok'} aria-live="polite">{scanMsg?.text}</p></form>
   <div className="table-scroll" tabIndex={0} role="region" aria-label={title}><table><thead><tr><th><input type="checkbox" aria-label={'Chọn tất cả · '+title} checked={all} onChange={e=>setSelected(e.target.checked?rows.map(r=>r.id):[])}/></th><th>Kiện</th><th>Đơn</th><th>Người nhận</th><th>Kho</th><th>Hàng</th><th>Vận đơn</th><th>Ghi chú</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.id}><td><input type="checkbox" aria-label={'Chọn kiện '+short(r.id)} checked={selected.includes(r.id)} onChange={e=>setSelected(e.target.checked?[...selected,r.id]:selected.filter(x=>x!==r.id))}/></td><td>{short(r.id)}</td><td><Link className="text-link" href={'/orders/'+r.orderId}>{r.orderId}</Link></td><td>{r.recipient}</td><td>{r.warehouse}</td><td>{r.items}</td><td>{r.tracking??'—'}</td><td>{r.note??''}</td></tr>)}</tbody></table></div>
   <fieldset className="batch-actions" disabled={mutation.disabled}>
    {actions.some(a=>a.needsReason)&&<label>Lý do (khi báo giao thất bại)<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={200} placeholder="Ví dụ: Không liên lạc được người nhận"/></label>}
    {actions.map(a=><button key={a.action} type="button" className={'button'+(a.primary===false?'':' primary')} disabled={!selected.length||(a.needsReason&&reason.trim().length<3)} onClick={()=>run(a)}>{mutation.busy?'Đang ghi…':mutation.uncertain?'Kiểm tra kết quả':`${a.label} (${selected.length} kiện)`}</button>)}
   </fieldset></>}
  {mutation.error&&<p className="error-box" role="alert">{mutation.error}</p>}
  {result&&<div className="batch-result" role="status">
   <p><strong>{ok.length} kiện thành công</strong>{failed.length?` · ${failed.length} kiện chưa làm được`:''}</p>
   {result.action==='handover'&&ok.length>0&&<div className="handover-note"><h3>Biên bản bàn giao cho hãng vận chuyển</h3><ul>{ok.map(r=><li key={r.shipmentId}>Kiện {short(r.shipmentId)} · đơn {r.orderId} · vận đơn <strong>{r.trackingCode}</strong></li>)}</ul>
    {handed&&handed.rows.length>0&&<><button type="button" className="button" onClick={printHandover}>In biên bản bàn giao</button>
    {/* Print-only sheet (hidden on screen): per warehouse, waybills, count, signatures, as in Sapo's handover SOP. */}
    <div className="handover-print">{byWarehouse.map(g=><section key={g.w} className="handover-doc"><h3>Biên bản bàn giao hàng cho đơn vị vận chuyển</h3>
     <p>Kho: <strong>{g.w}</strong> · Thời điểm: {handed.at} · Người bàn giao: {actor??'—'} · Đơn vị vận chuyển: hãng vận chuyển (mô phỏng)</p>
     <table><thead><tr><th>#</th><th>Mã vận đơn</th><th>Kiện</th><th>Đơn</th><th>Người nhận</th><th>Hàng</th></tr></thead><tbody>{g.rows.map((r,i)=><tr key={r.id}><td>{i+1}</td><td>{r.tracking}</td><td>{short(r.id)}</td><td>{r.orderId}</td><td>{r.recipient}</td><td>{r.items}</td></tr>)}</tbody></table>
     <p>Tổng số kiện: <strong>{g.rows.length}</strong>. Hai bên đã kiểm đếm đủ số kiện thực tế theo danh sách trên.</p>
     <div className="handover-sign"><div>Đại diện kho<br/><small>(ký, ghi rõ họ tên)</small></div><div>Đại diện đơn vị vận chuyển<br/><small>(ký, ghi rõ họ tên)</small></div></div></section>)}</div></>}
   </div>}
   {failed.length>0&&<ul className="batch-errors">{failed.map(r=><li key={r.shipmentId}>Kiện {short(r.shipmentId)}{r.orderId?` (đơn ${r.orderId})`:''}: {r.error}</li>)}</ul>}
  </div>}
 </section>;
}

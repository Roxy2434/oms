'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useCommandMutation} from '@/features/shared/use-command-mutation';
const money=(n:number)=>n.toLocaleString('vi-VN')+' ₫';
import {causeNames,causeFromReason,defaultRefund,type DamageCause as Cause} from '@/domain/returns/labels';
/** The one form for receiving + QC of a return line (station and RMA page alike). `received` set = line was already received earlier, so only QC remains. */
export function InspectLine({returnId,lineId,name,approved,received:alreadyReceived,refundByDefault,senderReturn,caseReason=''}:{returnId:string;lineId:string;name:string;approved:number;received?:number;refundByDefault:boolean;senderReturn:boolean;caseReason?:string}){
 const qcOnly=alreadyReceived!==undefined,start=alreadyReceived??approved;
 const [received,setReceived]=useState(start),[passed,setPassed]=useState(start),[refundEdit,setRefundEdit]=useState<number|null>(null);
 const [reason,setReason]=useState(''),[conclusion,setConclusion]=useState(''),[done,setDone]=useState(''),[cause,setCause]=useState<Cause>(causeFromReason(caseReason,senderReturn));
 const mutation=useCommandMutation(`/api/returns/${returnId}/commands`);const router=useRouter();
 const failed=Math.max(0,received-passed),short=!qcOnly&&received<approved;
 // Refund follows the inspection (customer-damaged units are not refunded) until the warehouse types its own number.
 const refund=Math.min(received,refundEdit??defaultRefund(passed,failed,cause,refundByDefault));
 function changeReceived(n:number){const v=Math.max(0,Math.min(approved,n||0));setReceived(v);setPassed(Math.min(passed,v));}
 async function submit(e:React.FormEvent){e.preventDefault();setDone('');
  const qc={lineId,passed,failed,refundQuantity:refund,reason,...(failed?{damageCause:cause}:{}),autoSettle:true};
  const r=await mutation.run<{refunded?:number;closed?:boolean}>(qcOnly?{action:'qc',...qc}:{action:'inspect',...qc,received,...(conclusion.trim()?{conclusion:conclusion.trim()}:{})});if(!r)return;
  setDone([`Đã nhận ${received}, đạt ${passed} (nhập lại tồn bán được), lỗi ${failed}${failed?' (cách ly'+(cause==='VAN_CHUYEN'?', đã lập biên bản hư hỏng':cause==='SHOP_GIAO_SAI'?', lỗi của shop':', không đòi hãng')+')':''}.`,senderReturn&&short?`Thiếu ${approved-received}: đã lập biên bản thất lạc với đơn vị vận chuyển.`:'',r.refunded?`Đã hoàn ${money(r.refunded)} cho khách hàng.`:'',r.closed?'Hồ sơ đã tự đóng.':''].filter(Boolean).join(' '));router.refresh();}
 return <form className="inspect-line" onSubmit={submit} data-uncertain={mutation.uncertain} aria-busy={mutation.busy} aria-label={'Nhận và kiểm định '+name}>
  <div className="inspect-head"><h3>{name}</h3><span>Được duyệt {approved}{qcOnly?` · Đã nhận ${alreadyReceived}, chờ kiểm định`:''}</span></div>
  <fieldset disabled={mutation.disabled} className="inspect-fields"><div className="form-grid">
   <label>Thực nhận<input name="received" type="number" min={0} max={approved} step={1} value={received} readOnly={qcOnly} aria-readonly={qcOnly} onChange={e=>changeReceived(Number(e.target.value))}/><small>{qcOnly?'Đã ghi khi nhận hàng':'Số món có trong kiện'}</small></label>
   <label>Đạt<input name="passed" type="number" min={0} max={received} step={1} value={passed} onChange={e=>setPassed(Math.max(0,Math.min(received,Number(e.target.value)||0)))}/><small>Nguyên seal, nhập lại kho bán</small></label>
   <label>Lỗi / hỏng<input name="failed" type="number" value={failed} readOnly aria-readonly="true"/><small>Tự tính, đưa vào cách ly</small></label>
   <label>Hoàn tiền<input name="refundQuantity" type="number" min={0} max={received} step={1} value={refund} onChange={e=>setRefundEdit(Math.max(0,Math.min(received,Number(e.target.value)||0)))}/><small>{refundEdit===null?(failed&&cause==='KHACH_HANG'?'Tự tính: món lỗi do khách không hoàn':'Tự tính theo kết quả kiểm định'):'Đã sửa tay, ghi lý do ở kết luận'}</small></label>
   {failed>0&&<label className="wide">Nguyên nhân hỏng<select name="damageCause" value={cause} onChange={e=>setCause(e.target.value as Cause)}>{(Object.keys(causeNames) as Cause[]).map(c=><option key={c} value={c}>{causeNames[c]}</option>)}</select></label>}
   <label className="wide">Kết luận kiểm định<input name="reason" required minLength={3} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Còn nguyên seal / Móp hộp do vận chuyển"/></label>
   {short&&<label className="wide">{senderReturn?'Thiếu hàng (hãng làm thất lạc, tự lập biên bản) — ghi kết luận':'Thiếu hàng — ghi kết luận'}<input name="conclusion" required minLength={3} maxLength={300} value={conclusion} onChange={e=>setConclusion(e.target.value)}/></label>}
  </div></fieldset>
  <div className="inspect-actions"><button className="button primary" disabled={mutation.busy}>{mutation.busy?'Đang ghi…':mutation.uncertain?'Kiểm tra kết quả':qcOnly?'Xác nhận kiểm định':'Xác nhận nhận & kiểm định'}</button></div>
  {mutation.error&&<p className="error-box" role="alert">{mutation.error}</p>}{done&&<p role="status">{done}</p>}
 </form>;
}

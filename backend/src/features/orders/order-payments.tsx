import Link from 'next/link';
import type {Prisma} from '@/generated/prisma/client';
import {CommandForm,type Field} from '@/features/foundation/command-form';
import {formatMoney,statusNames} from '@/features/dashboard/record-list';
import {documentLabel} from '@/domain/presentation';
type Order=Prisma.OrderGetPayload<{include:{transactions:true;shipments:true;returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}}>;
const receiptFields:Field[]=[{name:'amount',label:'Số tiền VND',type:'number',min:1},{name:'reference',label:'Mã chứng từ mô phỏng'},{name:'note',label:'Lý do / chứng từ'},{name:'source',label:'Nguồn chứng từ',options:[{value:'TIEN_MAT',label:'Tiền mặt'},{value:'CHUYEN_KHOAN',label:'Chuyển khoản'}]},{name:'status',label:'Kết quả',options:['CHO_XAC_NHAN','THANH_CONG','THAT_BAI','CHUA_RO'].map(value=>({value,label:statusNames[value]??value}))}];
export function OrderPayments({order}:{order:Order}){
 const endpoint=`/api/orders/${order.id}/payments`;
 return <section className="panel form-section"><h2>Chứng từ và tra soát</h2>
 {order.transactions.filter(t=>['CHO_XAC_NHAN','CHUA_RO'].includes(t.status)).map(t=><CommandForm key={t.id} title={`Tra soát ${documentLabel(t.reference)}`} action="resolve" endpoint={endpoint} initial={{action:'resolve',transactionId:t.id}} fields={[{name:'status',label:'Kết quả tra soát',options:['THANH_CONG','THAT_BAI','CHUA_RO'].map(value=>({value,label:statusNames[value]??value}))},{name:'note',label:'Chứng từ / lý do kết luận'}]}/>)}
 <p>Hoàn hàng trả được thực hiện từ đúng hồ sơ, sau khi nhận và kiểm định. Không chọn giao dịch gốc cho khoản thu/hoàn thông thường.</p>
 {order.returns.filter(r=>r.status==='CHO_HOAN_TIEN').map(r=><p key={r.id}><Link className="text-link" href={'/returns/'+r.id}>Xử lý hoàn tiền hồ sơ {r.id}</Link></p>)}
 {(order.status==='DA_HUY'||order.shipments.some(s=>s.status==='HUY'))&&<CommandForm title="Ghi hoàn do hủy" action="record" endpoint={endpoint} initial={{action:'record',kind:'HOAN',reason:'HOAN_HUY',source:'CHUYEN_KHOAN',status:'CHO_XAC_NHAN'}} fields={receiptFields}/>}
 <details><summary>Chứng từ chờ xác nhận / bù sai sót</summary><p>Chỉ dùng khi đã có chứng từ cần tra soát hoặc cần bù một giao dịch thành công. Máy chủ kiểm tra hạn mức; không sửa/xóa khoản tiền đã thành công.</p>
 {order.paymentMethod==='TRA_TRUOC'&&order.status!=='DA_HUY'&&<CommandForm title="Ghi chứng từ thu trả trước cần tra soát" action="record" endpoint={endpoint} initial={{action:'record',kind:'THU',reason:'THU_TRA_TRUOC',source:'CHUYEN_KHOAN',status:'CHO_XAC_NHAN'}} fields={receiptFields}/>}
 {order.paymentMethod==='COD'&&order.shipments.filter(s=>s.status==='DA_GIAO').map(s=><CommandForm key={s.id} title={'Ghi chứng từ COD cần tra soát · '+s.id} action="record" endpoint={endpoint} initial={{action:'record',kind:'THU',reason:'THU_COD',source:'COD_MO_PHONG',shipmentId:s.id,status:'CHO_XAC_NHAN'}} fields={receiptFields.filter(f=>f.name!=='source')}/>)}
 {(['THU','HOAN'] as const).map(kind=>{const originals=order.transactions.filter(t=>t.status==='THANH_CONG'&&t.kind===kind);return originals.length>0?<CommandForm key={kind} title={kind==='THU'?'Bù khoản thu sai':'Bù khoản hoàn sai'} action="record" endpoint={endpoint} initial={{action:'record',kind:kind==='THU'?'HOAN':'THU',reason:kind==='THU'?'HOAN_BU_THU_SAI':'THU_BU_HOAN_SAI',source:'CHUYEN_KHOAN',status:'CHO_XAC_NHAN'}} fields={[{name:'originalId',label:'Giao dịch gốc cần bù',options:originals.map(t=>({value:t.id,label:documentLabel(t.reference)+' · '+formatMoney(t.amount.toFixed(0))}))},...receiptFields]}/>:null;})}
 </details></section>;
}

import Link from 'next/link';
import type {Prisma} from '@/generated/prisma/client';
import {CommandForm,type Field} from '@/features/foundation/command-form';
import {formatMoney,statusNames} from '@/features/dashboard/record-list';
import {documentLabel} from '@/domain/presentation';
import {isPublicDeployment} from '@/domain/demo-mode';
import {bankEvidenceField} from './bank-evidence';
type Order=Prisma.OrderGetPayload<{include:{shopPurchase:true;transactions:true;shipments:true;returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}}>;
const receiptFields:Field[]=[{name:'amount',label:'Số tiền VND',type:'number',min:1},{name:'reference',label:'Mã chứng từ tham chiếu'},{name:'note',label:'Lý do / chứng từ'},{name:'source',label:'Nguồn chứng từ',options:[{value:'TIEN_MAT',label:'Tiền mặt'},{value:'CHUYEN_KHOAN',label:'Chuyển khoản ngân hàng'},{value:'VI_MO_PHONG',label:'Ví điện tử ShopVuiPay'}]},{name:'status',label:'Kết quả',options:['CHO_XAC_NHAN','THANH_CONG','THAT_BAI','CHUA_RO'].map(value=>({value,label:statusNames[value]??value}))}];
export function OrderPayments({order}:{order:Order}){
 const endpoint=`/api/orders/${order.id}/payments`;
 const realBank=isPublicDeployment()&&order.shopPurchase?.payment==='bank';
 const walletOrder=!realBank&&(order.shopPurchase?.payment==='wallet'||order.transactions.some(t=>t.kind==='THU'&&t.source==='VI_MO_PHONG'&&t.status==='THANH_CONG'));
 const defaultRefundSource=walletOrder?'VI_MO_PHONG':'CHUYEN_KHOAN';
 const fields:Field[]=receiptFields.map(f=>!realBank?f:f.name==='reference'?{...f,label:'Mã giao dịch ngân hàng thật'}:f.name==='source'?{...f,options:[{value:'CHUYEN_KHOAN',label:'Ngân hàng thật'}]}:f).concat(realBank?[bankEvidenceField]:[]);
 return <section className="panel form-section"><h2>Chứng từ và tra soát</h2>
 {order.transactions.filter(t=>['CHO_XAC_NHAN','CHUA_RO'].includes(t.status)).map(t=><CommandForm key={t.id} title={`Tra soát ${documentLabel(t.reference)}`} action="resolve" endpoint={endpoint} initial={{action:'resolve',transactionId:t.id}} fields={[{name:'status',label:'Kết quả tra soát',options:['THANH_CONG','THAT_BAI','CHUA_RO'].map(value=>({value,label:statusNames[value]??value}))},{name:'note',label:'Chứng từ / lý do kết luận'},...(realBank?[bankEvidenceField]:[])]}/>)}
 <p>Hoàn hàng trả được thực hiện từ đúng hồ sơ, sau khi nhận và kiểm định. Không chọn giao dịch gốc cho khoản thu/hoàn thông thường.</p>
 {order.returns.filter(r=>r.status==='CHO_HOAN_TIEN').map(r=><p key={r.id}><Link className="text-link" href={'/returns/'+r.id}>Xử lý hoàn tiền hồ sơ {r.id}</Link></p>)}
 {(order.status==='DA_HUY'||order.shipments.some(s=>s.status==='HUY'))&&<CommandForm title="Ghi hoàn do hủy" action="record" endpoint={endpoint} initial={{action:'record',kind:'HOAN',reason:'HOAN_HUY',source:defaultRefundSource,status:'CHO_XAC_NHAN'}} fields={fields}/>}
 <details><summary>Chứng từ chờ xác nhận / bù sai sót</summary><p>Chỉ dùng khi đã có chứng từ cần tra soát hoặc cần bù một giao dịch thành công. Máy chủ kiểm tra hạn mức; không sửa/xóa khoản tiền đã thành công.</p>
 {order.shopPurchase?.payment!=='bank'&&order.paymentMethod==='TRA_TRUOC'&&order.status!=='DA_HUY'&&<CommandForm title="Ghi chứng từ thu trả trước cần tra soát" action="record" endpoint={endpoint} initial={{action:'record',kind:'THU',reason:'THU_TRA_TRUOC',source:'CHUYEN_KHOAN',status:'CHO_XAC_NHAN'}} fields={fields}/>}
 {order.paymentMethod==='COD'&&order.shipments.filter(s=>s.status==='DA_GIAO').map(s=><CommandForm key={s.id} title={'Ghi chứng từ COD cần tra soát · '+s.id} action="record" endpoint={endpoint} initial={{action:'record',kind:'THU',reason:'THU_COD',source:'COD_MO_PHONG',shipmentId:s.id,status:'CHO_XAC_NHAN'}} fields={fields.filter(f=>f.name!=='source')}/>)}
 {(['THU','HOAN'] as const).map(kind=>{const originals=order.transactions.filter(t=>t.status==='THANH_CONG'&&t.kind===kind);return originals.length>0?<CommandForm key={kind} title={kind==='THU'?'Bù khoản thu sai':'Bù khoản hoàn sai'} action="record" endpoint={endpoint} initial={{action:'record',kind:kind==='THU'?'HOAN':'THU',reason:kind==='THU'?'HOAN_BU_THU_SAI':'THU_BU_HOAN_SAI',source:kind==='THU'?defaultRefundSource:'CHUYEN_KHOAN',status:'CHO_XAC_NHAN'}} fields={[{name:'originalId',label:'Giao dịch gốc cần bù',options:originals.map(t=>({value:t.id,label:documentLabel(t.reference)+' · '+formatMoney(t.amount.toFixed(0))}))},...fields]}/>:null;})}
 </details></section>;
}

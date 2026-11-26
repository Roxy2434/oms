import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAccount} from '@/server/auth';
import {db} from '@/server/db';
import '@/features/dashboard/dashboard.css';
const money=(n:unknown)=>Number(n||0).toLocaleString('vi-VN')+'đ';
export default async function Bank(){
 if((await requireAccount()).role!=='QUAN_LY')notFound();
 const [inbox,pending,total,refunds,cursors]=await Promise.all([
  db.sepayInbox.findMany({orderBy:{createdAt:'desc'},take:50}),
  db.sepayInbox.count({where:{state:{in:['NEW','UNMATCHED','REVIEW']}}}),
  db.sepayInbox.aggregate({_sum:{amount:true}}),
  db.moneyTransaction.aggregate({where:{kind:'HOAN',source:'CHUYEN_KHOAN',status:'THANH_CONG',order:{shopPurchase:{payment:'bank'}}},_sum:{amount:true}}),
  db.sepayCursor.findMany({select:{lastId:true,syncedAt:true,error:true}})
 ]);
 return <><div className="page-heading"><div><h1>SePay · tiền thật</h1><p>Tách riêng khỏi COD và ví mô phỏng. Không phải số dư tài khoản ngân hàng.</p></div><Link className="button" href="/dashboard">Về dashboard</Link></div>
 <div className="kpi-strip">{[['Tiền vào đã nhập inbox',money(total._sum.amount)],['Chứng từ cần đối soát',pending],['Hoàn ngân hàng đã ghi nhận',money(refunds._sum.amount)]].map(([label,value])=><div className="kpi" key={label}><div>{label}</div><strong className="kpi-value">{value}</strong></div>)}</div>
 <section className="panel"><div className="panel-head"><div><h2>Đối soát và hoàn tiền</h2><p>Khoản chuyển sai nội dung, thừa, sau hạn hoặc không khớp đơn cần kiểm trực tiếp trong SePay/ngân hàng. Chỉ ghi chứng từ hoàn sau khi đã chuyển hoàn thật về ngân hàng; không hoàn bằng ví ảo. Inbox chỉ tính từ mốc SEPAY_START_ID đã chọn.</p>{cursors.map((c,i)=><p key={i}>Lần đồng bộ: {c.syncedAt?.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})||'chưa thành công'} · checkpoint {c.lastId} · {c.error||'OK'}</p>)}</div></div>
 <div className="table-scroll" tabIndex={0} role="region" aria-label="50 giao dịch ngân hàng mới nhất"><table><thead><tr>{['SePay ID','Số tiền thật','Đối chiếu','Đơn','Nội dung'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{inbox.map(r=><tr key={r.id}><td>{r.id}</td><td>{money(r.amount)}</td><td>{r.state}</td><td>{r.orderId?<Link className="text-link" href={'/orders/'+encodeURIComponent(r.orderId)}>{r.orderId}</Link>:'Chưa khớp'}</td><td style={{whiteSpace:'normal',overflowWrap:'anywhere'}}>{r.content}</td></tr>)}</tbody></table></div>{!inbox.length&&<p className="empty-state">Chưa có giao dịch trong inbox.</p>}</section></>;
}

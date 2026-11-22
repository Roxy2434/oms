import {missingShippingFee,moneyPosition,causeAmount,returnDeductions} from '@/domain/payments/balances';
import {projectCompletion} from '@/domain/orders/completion';
import {notFound,redirect} from 'next/navigation';
import {resolveOrderId,legacyOrderId} from '@/domain/orders/identifiers';
import Link from 'next/link';
import {db} from '@/server/db';
import {requireAccount} from '@/server/auth';
import {effectiveValue} from '@/domain/dashboard/queries';
import {formatMoney,statusNames} from '@/features/dashboard/record-list';
import {CreateReturn} from '@/features/returns/create-return';
import {OrderPayments} from '@/features/orders/order-payments';
import {OrderActions,OrderAction} from '@/features/orders/order-actions';
import {OrderTabs} from '@/features/orders/order-tabs';
import {documentLabel} from '@/domain/presentation';
import {channelName} from '@/domain/channels';
import {collectLabel} from '@/domain/payments/labels';
import '@/features/orders/order-detail.css';
export const dynamic='force-dynamic';
export default async function Detail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{tab?:string;flow?:string}>}){
 await requireAccount();const {id:requestedId}=await params;const id=resolveOrderId(requestedId);if(id!==requestedId)redirect('/orders/'+id);const oldId=legacyOrderId(id);const {tab:initialTab,flow}=await searchParams;
 const order=await db.order.findUnique({where:{id},include:{lines:true,shipments:{include:{lines:true,warehouse:true}},transactions:true,returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}});if(!order)notFound();
 const audits=await db.auditLog.findMany({where:{OR:[{entityId:id},{entityId:oldId},{entity:'HO_SO_TRA',entityId:{in:order.returns.map(r=>r.id)}},{result:{path:['id'],equals:id}},{result:{path:['id'],equals:oldId}}]},orderBy:[{createdAt:'desc'},{id:'desc'}],include:{actor:{select:{name:true}}},take:100});
 const collected=order.transactions.filter(t=>t.kind==='THU'&&t.status==='THANH_CONG').reduce((s,t)=>s+Number(t.amount),0);
 const refunded=order.transactions.filter(t=>t.kind==='HOAN'&&t.status==='THANH_CONG').reduce((s,t)=>s+Number(t.amount),0);
 const completion=projectCompletion({status:order.status,shipmentStatuses:order.shipments.map(s=>s.status),returnStatuses:order.returns.map(r=>r.status),pendingTransactions:order.transactions.filter(t=>['CHO_XAC_NHAN','CHUA_RO'].includes(t.status)).length,netCollected:collected-refunded,effectiveValue:Number(effectiveValue(order)),returnRefundObligation:returnDeductions(order.returns),waived:0});
 const due=Math.max(0,completion.collectDue-moneyPosition(order.transactions).pendingCollect),missingFee=missingShippingFee(order);
 const codDue=(shipmentId:string,codAmount:unknown)=>Math.max(0,Math.min(due,Number(codAmount)-causeAmount(order.transactions,'THU',t=>t.reason==='THU_COD'&&t.shipmentId===shipmentId,true)));
 const shipmentActions=order.shipments.map(s=>({id:s.id,name:s.warehouse.name,status:s.status,codDue:codDue(s.id,s.codAmount),reason:s.reason}));
 const returnSources=order.shipments.filter(s=>['DA_GIAO','CHUYEN_HOAN'].includes(s.status)).flatMap(s=>s.lines.map(l=>{const used=order.returns.filter(r=>r.status!=='TU_CHOI').flatMap(r=>r.lines).filter(rl=>rl.shipmentLineId===l.id).reduce((n,rl)=>n+Math.max(rl.requested,rl.approved),0);return{id:l.id,name:order.lines.find(x=>x.id===l.orderLineId)!.nameSnapshot,quantity:Math.max(0,l.quantity-used),shipped:l.quantity,warehouseId:s.warehouseId,kind:s.status==='DA_GIAO'?'KHACH_TRA' as const:'CHUYEN_HOAN' as const};})).filter(l=>l.quantity>0);
 const canAllocate=['NHAP','CHO_HANG'].includes(order.status)&&order.shipments.length===0;
 const active=order.shipments.filter(s=>s.status!=='HUY');
 const preparing=active.some(s=>['DANG_GIU','CHO_BAN_GIAO'].includes(s.status));
 const transit=active.some(s=>['DANG_GIAO','GIAO_THAT_BAI','CHUYEN_HOAN'].includes(s.status));
 const step=completion.complete?3:transit||active.some(s=>s.status==='DA_GIAO')?2:active.length?1:0;
 let next:{title:string;description:string;target:'items'|'shipments'|'money'|'returns';label:string}={title:'Đơn đã hoàn tất',description:'Xem lại sản phẩm, kiện hàng và các chứng từ của đơn bên dưới.',target:'items',label:'Xem đơn'};
 if(order.status==='DA_HUY')next={title:'Đơn đã hủy',description:completion.refundDue>0?'Còn khoản hoàn cần xử lý trong Thu / hoàn.':'Kiểm tra chứng từ và lịch sử hủy của đơn bên dưới.',target:completion.refundDue>0?'money':'items',label:'Xử lý hoàn tiền'};
 else if(canAllocate)next={title:order.status==='CHO_HANG'?'Đơn đang chờ đủ hàng':'Chọn kho để xác nhận đơn',description:'Xem kho xuất, số lượng, chi phí và thời gian giao. Hàng chỉ được giữ khi xác nhận.',target:'items',label:order.shippingPolicy==='SUM_FREIGHT_V1'?'Kiểm tra và xác nhận':'Tìm kho phù hợp'};
 else if(order.transactions.some(t=>['CHO_XAC_NHAN','CHUA_RO'].includes(t.status)))next={title:'Có giao dịch cần xác nhận',description:'Kiểm tra chứng từ trước khi lập thêm khoản thu hoặc hoàn.',target:'money',label:'Tra soát tiền'};
 else if(!completion.returnsDone)next={title:'Tiếp tục xử lý hàng trả',description:'Mở hồ sơ đang xử lý để duyệt, nhận hàng, kiểm định hoặc hoàn tiền. Mỗi hồ sơ chỉ đóng khi cả hàng và tiền đã được kết luận.',target:'returns',label:'Mở hồ sơ trả hàng'};
 else if(active.some(s=>s.status==='CHUYEN_HOAN'))next={title:'Cần nhận hàng chuyển hoàn',description:'Hàng chưa được cộng lại vào kho. Tạo hồ sơ trả, nhận thực tế và kiểm định để chốt lượng bán lại/cách ly và tiền.',target:'returns',label:'Xử lý hàng chuyển hoàn'};
 else if(order.paymentMethod==='TRA_TRUOC'&&due>0&&preparing)next={title:'Cần thu đủ tiền trước khi bàn giao',description:`Còn phải thu ${formatMoney(due)}. Có thể chuẩn bị hàng, nhưng chưa được bàn giao khi thiếu tiền.`,target:'money',label:'Ghi nhận thu tiền'};
 else if(preparing||transit)next={title:active.some(s=>s.status==='GIAO_THAT_BAI')?'Có kiện giao chưa thành công':'Tiếp tục xử lý kiện hàng',description:'Mỗi kiện bên dưới có kho xuất, sản phẩm, trạng thái và thao tác phù hợp. Các kiện có thể ở những bước khác nhau.',target:'shipments',label:'Xử lý kiện hàng'};
 else if(completion.refundDue>0||due>0)next={title:'Còn khoản tiền cần xử lý',description:`Còn thu ${formatMoney(due)} · Còn hoàn ${formatMoney(completion.refundDue)}.`,target:'money',label:'Kiểm tra thu / hoàn'};
 else if(!completion.complete)next={title:'Kiểm tra tình trạng đơn',description:'Đối chiếu kiện hàng, hồ sơ trả và chứng từ tiền trước khi kết luận hoàn tất.',target:'shipments',label:'Xem các kiện'};
 // The next-step card carries the real action when there is exactly one obvious one; otherwise it only switches tab.
 const parcelStep:Record<string,[string,string]>={DANG_GIU:['pack','Xác nhận đã đóng gói'],CHO_BAN_GIAO:['handover','Bàn giao cho hãng'],DANG_GIAO:['deliver','Hãng báo đã giao']};
 const stepParcels=active.filter(s=>parcelStep[s.status]&&!(s.status==='CHO_BAN_GIAO'&&order.paymentMethod==='TRA_TRUOC'&&due>0));
 const codParcels=shipmentActions.filter(s=>s.status==='DA_GIAO'&&s.codDue>0),openReturns=order.returns.filter(r=>!['DA_DONG','TU_CHOI'].includes(r.status));
 const parcelName=(sid:string)=>{const i=order.shipments.findIndex(x=>x.id===sid);return `Kiện ${i+1} · ${order.shipments[i]?.warehouse.name??''}`;};
 // What is still returnable, per parcel, with the 7-day deadline for delivered goods (staff create returns on behalf of the customer).
 const returnableText='Còn trả được: '+returnSources.map(src=>{const s=order.shipments.find(x=>x.lines.some(l=>l.id===src.id))!;const due=s.deliveredAt?new Date(s.deliveredAt.getTime()+7*86400000).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):null;return `${src.name} × ${src.quantity} (${parcelName(s.id)}${src.kind==='CHUYEN_HOAN'?', chuyển hoàn':due?', hạn trả đến '+due:''})`;}).join('; ')+'.';
 let nextAction:React.ReactNode=null;
 if(next.target==='money'&&order.status==='DA_XAC_NHAN'&&order.paymentMethod==='TRA_TRUOC'&&due>0)nextAction=<OrderAction key="collect" orderId={id} label={collectLabel('prepaid',due)} payload={{action:'collect'}} autoAmount={due}/>;
 else if(next.target==='money'&&order.paymentMethod==='COD'&&codParcels.length===1)nextAction=<OrderAction key={'cod:'+codParcels[0].id} orderId={id} label={collectLabel('cod',codParcels[0].codDue)+' · '+parcelName(codParcels[0].id)} payload={{action:'collect',shipmentId:codParcels[0].id}} autoAmount={codParcels[0].codDue}/>;
 else if(next.target==='shipments'&&stepParcels.length===1&&!active.some(s=>s.status==='GIAO_THAT_BAI')){const [action,label]=parcelStep[stepParcels[0].status];nextAction=<OrderAction key={action+':'+stepParcels[0].id} orderId={id} label={label+' · '+parcelName(stepParcels[0].id)} payload={{action,shipmentId:stepParcels[0].id}}/>;}
 else if(next.target==='returns'&&openReturns.length===1)nextAction=<Link className="button primary" href={'/returns/'+openReturns[0].id}>Mở hồ sơ trả hàng</Link>;
 const summary=<section className="panel form-section order-overview-money"><h2>Thanh toán</h2><p>{order.paymentMethod==='COD'?'Thu khi nhận hàng (COD mô phỏng)':'Trả trước'}</p><dl><div><dt>{canAllocate?'Phí giao dự kiến':'Phí giao đã chốt'}</dt><dd>{formatMoney(order.shippingFee.toFixed(0))}{order.status==='DA_HUY'?' · miễn do hủy toàn đơn':''}</dd></div><div><dt>Giá trị hiện tại</dt><dd>{formatMoney(effectiveValue(order).toFixed(0))}</dd></div><div><dt>Đã thu thành công</dt><dd>{formatMoney(collected)}</dd></div><div><dt>Đã hoàn thành công</dt><dd>{formatMoney(refunded)}</dd></div><div className="money-total"><dt>Tiền ròng</dt><dd>{formatMoney(collected-refunded)}</dd></div><div><dt>Còn phải thu</dt><dd>{formatMoney(completion.collectDue)}</dd></div><div><dt>Còn phải hoàn</dt><dd>{formatMoney(completion.refundDue)}</dd></div></dl></section>;
 return <article className="order-record"><Link className="text-link" href="/orders">← Danh sách đơn hàng</Link><header className="order-record-header"><div><h1>{id}</h1><p>Chi tiết đơn hàng · {channelName(order.channel)}</p></div><div className="order-record-status"><span className="badge blue">{statusNames[order.status]??order.status}</span>{completion.complete&&<span className="badge green">Hoàn tất hàng & tiền</span>}{canAllocate&&<Link className="button" href={`/orders/${id}/edit`}>Sửa đơn nháp</Link>}</div></header>
 {order.status!=='DA_HUY'&&<ol className="panel order-progress" aria-label="Tiến độ xử lý đơn">{['Xác nhận đơn','Chuẩn bị hàng','Giao hàng','Hoàn tất'].map((label,index)=><li key={label} className={index<=step?'reached':''} aria-current={index===step?'step':undefined}><span>{index<step?'✓':index+1}</span>{label}</li>)}</ol>}
 <OrderTabs key={id+(initialTab??'items')+(flow??'')} nextAction={nextAction} editForAllocation={order.shippingPolicy==='SUM_FREIGHT_V1'} autoAllocate={flow==='allocate'&&order.shippingPolicy!=='SUM_FREIGHT_V1'} initialTab={initialTab} orderId={id} canAllocate={canAllocate} next={next} summary={summary}
 recipient={{name:order.recipient,phone:order.phone,address:order.address,region:order.region}}
 lines={order.lines.map(l=>({id:l.id,name:l.nameSnapshot,quantity:l.quantity,price:l.priceSnapshot.toFixed(0)}))}
 shipments={order.shipments.map(s=>({id:s.id,name:s.warehouse.name,freight:Number(s.freight),eta:s.eta.toISOString(),codAmount:order.paymentMethod==='COD'?Number(s.codAmount):null,codCollected:Math.max(0,causeAmount(order.transactions,'THU',t=>t.reason==='THU_COD'&&t.shipmentId===s.id)),codDue:codDue(s.id,s.codAmount),status:s.status==='DA_GIAO'&&order.paymentMethod==='COD'&&codDue(s.id,s.codAmount)>0?'Đã giao · chờ thu COD':statusNames[s.status]??s.status,tracking:s.trackingCode?documentLabel(s.trackingCode):'',items:s.lines.map(l=>({name:order.lines.find(line=>line.id===l.orderLineId)?.nameSnapshot??'Sản phẩm',quantity:l.quantity})),actions:<OrderActions mode="parcel" orderId={id} status={order.status} paymentMethod={order.paymentMethod} collectDue={due} missingFee={missingFee} shipments={shipmentActions.filter(x=>x.id===s.id)}/>}))}
 transactions={order.transactions.map(t=>({id:t.id,kind:t.kind,amount:t.amount.toFixed(0),status:t.status}))}
 returns={order.returns.map(r=>({id:r.id,code:r.code,status:statusNames[r.status]??r.status}))}
 history={audits.map(a=>({id:a.id,action:a.action,date:a.createdAt.toISOString(),actor:a.actor?.name??'Hệ thống',returnId:a.entity==='HO_SO_TRA'?a.entityId:undefined}))}
 moneyActions={<><OrderActions mode="money" collectDue={due} missingFee={missingFee} orderId={id} status={order.status} paymentMethod={order.paymentMethod} shipments={shipmentActions}/><OrderPayments order={order}/></>}
 returnActions={<CreateReturn orderId={id} sources={returnSources}/>} returnBlocked={!returnSources.length?(order.returns.some(r=>r.status!=='TU_CHOI')?'Mọi sản phẩm đã giao của đơn đều đã có hồ sơ trả bên dưới, không còn gì để trả thêm.':'Chưa có kiện đã giao hoặc chuyển hoàn nên chưa trả hàng được.'):order.channel==='SHOPVUI'?'Đơn ShopVui: khách gửi yêu cầu trả hàng trên ShopVui, hệ thống tự tạo hồ sơ RMA. Cửa hàng không tạo thay.':undefined} returnHint={returnableText}
 otherActions={order.status!=='DA_HUY'&&!order.shipments.some(s=>['DANG_GIAO','DA_GIAO','GIAO_THAT_BAI','CHUYEN_HOAN','DA_NHAN_HOAN'].includes(s.status))?<details className="panel form-section order-secondary-actions"><summary>Thao tác khác / hủy đơn</summary><OrderAction primary={false} orderId={id} label="Hủy toàn đơn trước xuất" payload={{action:'cancel'}} fields={[{name:'reason',label:'Lý do hủy'}]}/></details>:null}/>
 </article>;
}

import Link from 'next/link';
import {documentLabel,narrativeLabel} from '@/domain/presentation';
import {db} from '@/server/db';
import {requireAccount} from '@/server/auth';
import {RecordList} from '@/features/dashboard/record-list';
import {ListFilters,ListNavigation,pageNumber,type Query} from '@/features/shared/list-controls';
import {MovementKind,type Prisma} from '@/generated/prisma/client';
function localDate(value:string|undefined,end=false){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;const d=new Date(value+'T00:00:00+07:00');return Number.isNaN(d.getTime())?undefined:new Date(d.getTime()+(end?86400000:0));}
const kindNames:Record<MovementKind,string>={NHAP:'Nhập kho',GIU:'Giữ cho đơn',GIAI_PHONG:'Trả lại hàng đã giữ',XUAT:'Xuất kho (bàn giao)',NHAN_HOAN:'Nhận hàng hoàn',QC:'Kiểm định hàng hoàn',DIEU_CHINH:'Điều chỉnh kiểm kê'};
const short=(id:string)=>id.slice(-8).toUpperCase();
const delta=(n:number)=>n===0?<span className="muted">—</span>:<span className={n>0?'delta-up':'delta-down'}>{n>0?'+':'−'}{Math.abs(n)}</span>;
// Stock ledger: every change to stock (receipt, hold, handover, cancel release, return QC, count) as an append-only line.
// Lines point at a parcel or an RMA by internal id; the page shows the codes people use (order, RMA, short parcel code) and searches by them.
export default async function Ledger({searchParams}:{searchParams:Promise<Query>}){
 await requireAccount();const q=await searchParams,page=pageNumber(q.page),search=q.search?.slice(0,120).trim();
 const kind=Object.values(MovementKind).includes(q.kind as MovementKind)?q.kind as MovementKind:undefined;
 // Search by order code / RMA code too: resolve them to the parcel and RMA ids the lines are filed under.
 const [hitShipments,hitReturns]=search?await Promise.all([db.shipment.findMany({where:{orderId:{contains:search,mode:'insensitive'}},select:{id:true},take:500}),db.returnCase.findMany({where:{OR:[{code:{contains:search,mode:'insensitive'}},{orderId:{contains:search,mode:'insensitive'}}]},select:{id:true},take:500})]):[[],[]];
 const where:Prisma.InventoryMovementWhereInput={...(q.warehouse?{warehouseId:q.warehouse}:{}),...(q.sku?{skuId:q.sku}:{}),...(kind?{kind}:{}),createdAt:{gte:localDate(q.from),lt:localDate(q.to,true)},
  ...(search?{OR:[{skuId:{contains:search,mode:'insensitive'}},{sku:{name:{contains:search,mode:'insensitive'}}},{documentId:{contains:search,mode:'insensitive'}},{reason:{contains:search,mode:'insensitive'}},{documentId:{in:[...hitShipments,...hitReturns].map(x=>x.id)}}]}:{})};
 const [movements,total,warehouses,skus]=await Promise.all([db.inventoryMovement.findMany({where,include:{warehouse:{select:{name:true}},sku:{select:{name:true}}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:20}),db.inventoryMovement.count({where}),db.warehouse.findMany({orderBy:{id:'asc'}}),db.sku.findMany({orderBy:{id:'asc'}})]);
 const ids=(t:string)=>movements.filter(m=>m.documentType===t).map(m=>m.documentId);
 const [parcels,rmas]=await Promise.all([db.shipment.findMany({where:{id:{in:ids('KIEN_HANG')}},select:{id:true,orderId:true}}),db.returnCase.findMany({where:{id:{in:ids('HO_SO_TRA')}},select:{id:true,code:true,orderId:true}})]);
 const parcelOf=new Map(parcels.map(s=>[s.id,s])),rmaOf=new Map(rmas.map(r=>[r.id,r]));
 const doc=(m:(typeof movements)[number])=>{
  const s=m.documentType==='KIEN_HANG'?parcelOf.get(m.documentId):undefined;if(s)return <span key="doc">Kiện <strong title={s.id}>{short(s.id)}</strong> · <Link className="text-link" href={'/orders/'+s.orderId}>{s.orderId}</Link></span>;
  const r=m.documentType==='HO_SO_TRA'?rmaOf.get(m.documentId):undefined;if(r)return <span key="doc"><Link className="text-link" href={'/returns/'+r.id}>{r.code??short(r.id)}</Link> · <Link className="text-link" href={'/orders/'+r.orderId}>{r.orderId}</Link></span>;
  return documentLabel(m.documentId);
 };
 return <RecordList live title="Sổ biến động" description="Mọi thay đổi tồn kho theo thứ tự thời gian: nhập, giữ cho đơn, xuất khi bàn giao, trả lại khi hủy, hàng hoàn và kiểm kê. Không xóa hoặc sửa bút toán." headers={['Thời gian','Kho','Sản phẩm','Loại','Bán được','Giữ','QC','Cách ly','Chứng từ','Lý do']}
  rows={movements.map(m=>[m.createdAt.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),m.warehouse.name,<span key="sku" className="ledger-sku"><strong>{m.skuId}</strong><small>{m.sku.name}</small></span>,kindNames[m.kind],delta(m.sellableDelta),delta(m.reservedDelta),delta(m.qcDelta),delta(m.quarantinedDelta),doc(m),narrativeLabel(m.reason)])}>
  <ListFilters query={q} dates searchLabel="Tìm mã đơn, RMA, kiện, phiếu, SKU hoặc lý do" selects={[{name:'kind',label:'Loại',options:Object.values(MovementKind).map(value=>({value,label:kindNames[value]}))},{name:'warehouse',label:'Kho',options:warehouses.map(w=>({value:w.id,label:w.name}))},{name:'sku',label:'Sản phẩm',options:skus.map(s=>({value:s.id,label:s.name}))}]}/>
  <ListNavigation query={q} total={total} page={page}/>
 </RecordList>;
}

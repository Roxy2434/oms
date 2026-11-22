import {db} from '@/server/db';
import {requireAccount} from '@/server/auth';
import {BatchSection} from '@/features/fulfillment/batch-section';
import {batchRowInclude,toBatchRow} from '@/features/fulfillment/rows';
import {TaskTabs} from '@/features/orders/task-tabs';
import {WarehousePicker} from '@/features/fulfillment/warehouse-picker';
import {LiveUpdates} from '@/features/shared/live-updates';
import '@/features/dashboard/dashboard.css';
import '@/features/fulfillment/fulfillment.css';
export const dynamic='force-dynamic';
/** Warehouse work screen: parcels of ALL orders by step, processed in batches. */
export default async function Fulfillment({searchParams}:{searchParams:Promise<{warehouse?:string;view?:string}>}){
 const me=await requireAccount();const {warehouse,view}=await searchParams;
 const statuses=['DANG_GIU','CHO_BAN_GIAO','DANG_GIAO'] as const,cap=500,scope=warehouse?{warehouseId:warehouse}:{};
 // Each step loads its own oldest-first page so a long backlog in one step never hides another step's parcels.
 const [warehouses,counts,...lists]=await Promise.all([db.warehouse.findMany({where:{active:true},orderBy:{id:'asc'}}),db.shipment.groupBy({by:['status'],where:{status:{in:[...statuses]},...scope},_count:true}),...statuses.map(status=>db.shipment.findMany({where:{status,...scope},orderBy:[{createdAt:'asc'},{id:'asc'}],take:cap,include:batchRowInclude}))]);
 const shipments=lists.flat();const total=(status:string)=>counts.find(c=>c.status===status)?._count??0;
 const by=(status:string)=>shipments.filter(s=>s.status===status).map(toBatchRow);
 const pack=by('DANG_GIU'),handover=by('CHO_BAN_GIAO'),delivering=by('DANG_GIAO');
 const steps=[
  {id:'pack',label:'Chờ đóng gói',rows:pack,content:<BatchSection status="DANG_GIU" warehouse={warehouse} total={total('DANG_GIU')} title="Chờ đóng gói" description="Hàng đã được giữ cho đơn. Đóng gói thực tế rồi xác nhận; tồn kho chưa đổi." rows={pack} actions={[{action:'pack',label:'Xác nhận đã đóng gói'}]} empty="Không có kiện chờ đóng gói."/>},
  {id:'handover',label:'Chờ bàn giao',rows:handover,content:<BatchSection status="CHO_BAN_GIAO" warehouse={warehouse} total={total('CHO_BAN_GIAO')} title="Chờ bàn giao" description="Bàn giao cho hãng vận chuyển: ghi xuất kho, trừ tồn và lượng đang giữ, sinh mã vận đơn. Đơn trả trước chưa thu đủ sẽ bị chặn." rows={handover} actions={[{action:'handover',label:'Bàn giao cho hãng'}]} actor={me.name} empty="Không có kiện chờ bàn giao."/>},
  {id:'delivering',label:'Đang giao',rows:delivering,content:<BatchSection status="DANG_GIAO" warehouse={warehouse} total={total('DANG_GIAO')} title="Đang giao — cập nhật từ hãng (giả lập)" description="Thực tế hãng vận chuyển tự báo trạng thái. Ở bản local, chọn kiện và giả lập kết quả hãng trả về." rows={delivering} actions={[{action:'deliver',label:'Hãng báo đã giao'},{action:'fail',label:'Hãng báo giao thất bại',needsReason:true,primary:false}]} empty="Không có kiện đang giao."/>},
 ];
 return <>
  <div className="page-heading"><div><h1>Đóng gói & bàn giao</h1><p>Màn làm việc của kho: chọn nhiều kiện của mọi đơn và xử lý một lần. Hệ thống đã tự chọn kho và giữ hàng khi tạo đơn.</p></div></div>
  <WarehousePicker extra={<LiveUpdates/>} value={warehouse??''} warehouses={warehouses.map(w=>({id:w.id,name:w.name}))}>
   <TaskTabs label="Các bước của kho" keepMounted initialTab={view??steps.find(t=>t.rows.length)?.id} tabs={steps.map(t=>({id:t.id,label:`${t.label} (${total({pack:'DANG_GIU',handover:'CHO_BAN_GIAO',delivering:'DANG_GIAO'}[t.id]!)})`,content:t.content}))}/>
  </WarehousePicker>
 </>;
}

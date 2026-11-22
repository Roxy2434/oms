// Read-only scan of the main DB: every stored status must agree with the data around it, and the derived "Tình trạng"
// must cover every order. Writes nothing. Run: npx tsx scripts/check-live-status-consistency.ts
import 'dotenv/config';
import {db} from '../src/server/db';
import {effectiveValue} from '../src/domain/dashboard/queries';
import {orderProgress} from '../src/domain/orders/progress';
const issues:string[]=[];const bad=(id:string,msg:string)=>issues.push(id+': '+msg);
const orders=await db.order.findMany({include:{lines:true,shipments:{include:{lines:true}},transactions:true,returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}}});
const progress:Record<string,number>={};
for(const o of orders){
 const p=orderProgress(o,Number(effectiveValue(o)));progress[p.code]=(progress[p.code]??0)+1;if(p.code==='dang_xu_ly')bad(o.id,'tình trạng không xác định');
 const active=o.shipments.filter(s=>s.status!=='HUY');
 if(['NHAP','CHO_HANG'].includes(o.status)&&o.shipments.length)bad(o.id,o.status+' nhưng đã có kiện');
 if(o.status==='DA_XAC_NHAN'&&!active.length)bad(o.id,'đã xác nhận nhưng không còn kiện nào');
 if(o.status==='DA_HUY'&&active.length)bad(o.id,'đã hủy nhưng còn kiện chưa hủy');
 if(o.status==='DA_XAC_NHAN'&&!o.confirmedAt)bad(o.id,'đã xác nhận nhưng thiếu thời điểm xác nhận');
 for(const s of o.shipments){
  const shipped=['DANG_GIAO','DA_GIAO','GIAO_THAT_BAI','CHUYEN_HOAN','DA_NHAN_HOAN'].includes(s.status);
  if(shipped&&(!s.trackingCode||!s.handedOverAt))bad(o.id,`kiện ${s.status} thiếu vận đơn/thời điểm bàn giao`);
  if(!shipped&&s.trackingCode)bad(o.id,`kiện ${s.status} chưa bàn giao nhưng có vận đơn`);
  if(s.status==='DA_GIAO'&&!s.deliveredAt)bad(o.id,'kiện đã giao thiếu thời điểm giao');
  if(s.status==='GIAO_THAT_BAI'&&!s.reason)bad(o.id,'giao thất bại không có lý do');
  if(s.status==='CHUYEN_HOAN'&&!o.returns.some(r=>r.kind==='CHUYEN_HOAN'&&r.status!=='TU_CHOI'))bad(o.id,'kiện chuyển hoàn chưa có hồ sơ trả');
 }
 if(o.paymentMethod==='TRA_TRUOC'&&active.some(s=>['DANG_GIAO','DA_GIAO'].includes(s.status))){const paid=o.transactions.filter(t=>t.kind==='THU'&&t.status==='THANH_CONG').reduce((n,t)=>n+Number(t.amount),0);if(paid<Number(effectiveValue(o)))bad(o.id,'trả trước đã bàn giao nhưng chưa thu đủ');}
 for(const r of o.returns){
  const qc=r.lines.every(l=>l.qcAt);
  if(r.status==='DA_DONG'&&!qc)bad(r.code??r.id,'hồ sơ đã đóng nhưng còn dòng chưa kiểm định');
  if(['CHO_NHAN','CHO_DUYET'].includes(r.status)&&r.lines.some(l=>l.qcAt))bad(r.code??r.id,r.status+' nhưng đã có dòng kiểm định');
  for(const l of r.lines)if(l.qcAt&&l.passed+l.failed!==l.received)bad(r.code??r.id,'đạt + lỗi khác thực nhận');
 }
}
const inv=await db.inventory.findMany();for(const i of inv)if(i.sellable<0||i.reserved<0||i.qc<0||i.quarantined<0||i.sellable<i.reserved)bad(i.warehouseId+'/'+i.skuId,'tồn âm hoặc bán được < đang giữ');
console.log(JSON.stringify({orders:orders.length,progress,issues:issues.length},null,0));for(const x of issues.slice(0,30))console.log(' - '+x);
await db.$disconnect();if(issues.length)process.exit(1);

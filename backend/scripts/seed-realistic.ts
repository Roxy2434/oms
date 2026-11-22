// Fills the main OMS database with a realistic working state: ~10 orders per status, returns, money and stock receipts,
// spread over the last 30 days. Every state is reached through the real services (no status patching); only timestamps
// are shifted afterwards, by the same amount per order, so each order keeps its own event order.
// Run once on a freshly seeded DB: npm run db:seed && npx tsx scripts/seed-realistic.ts
import 'dotenv/config';
import assert from 'node:assert/strict';
import {Prisma} from '../src/generated/prisma/client';
import {db} from '../src/server/db';
import {checkoutQuote,createCheckout} from '../src/domain/orders/checkout';
import {orderCommand} from '../src/domain/orders/lifecycle';
import {shipmentBatch} from '../src/domain/orders/batch';
import {returnCommand} from '../src/domain/returns/service';
import {receiveStock} from '../src/domain/inventory/service';
import {allocationPreview} from '../src/domain/allocation/preview';

const MARK='seed-realistic-v1',QL='QL-01',KHO='NV-01',DAY=86400;
let n=0;const key=(s:string)=>`${MARK}:${s}:${++n}`;
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const pick=<T,>(a:T[])=>a[Math.floor(rnd()*a.length)];

// Fictional new customers (names, phones and addresses are made up).
const fresh:[string,string,string,'HN'|'DN'|'HCM'][]=[
 ['Đặng Thu Hà','0903124578','15 Nguyễn Chí Thanh, Láng Thượng, Đống Đa, Hà Nội','HN'],
 ['Hoàng Đức Mạnh','0938456120','88 Lê Văn Việt, Hiệp Phú, Thủ Đức, TP. Hồ Chí Minh','HCM'],
 ['Phan Ngọc Trâm','0905332871','42 Hùng Vương, Hải Châu, Đà Nẵng','DN'],
 ['Vũ Quốc Bảo','0977215490','7 Trần Duy Hưng, Trung Hòa, Cầu Giấy, Hà Nội','HN'],
 ['Lý Mỹ Duyên','0919680234','230 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh','HCM'],
 ['Trương Gia Khánh','0935741062','19 Ngô Quyền, An Hải Bắc, Sơn Trà, Đà Nẵng','DN'],
 ['Đỗ Phương Linh','0986034517','56 Kim Mã, Ngọc Khánh, Ba Đình, Hà Nội','HN'],
 ['Huỳnh Tấn Phát','0908871236','14 Phan Xích Long, Phường 2, Phú Nhuận, TP. Hồ Chí Minh','HCM'],
 ['Mai Thanh Tùng','0961427805','101 Điện Biên Phủ, Chính Gián, Thanh Khê, Đà Nẵng','DN'],
 ['Cao Bích Ngọc','0942659318','33 Lạc Long Quân, Bưởi, Tây Hồ, Hà Nội','HN'],
];
const CHANNELS=['NHAP_TAY','WEBSITE','SHOPEE','TIKTOK','SHOPVUI'] as const;

/** Moves every timestamp that belongs to one order back by `days` (returns of that order by `returnDays`, default the same). */
async function shift(orderId:string,days:number,returnDays=days){
 const s=Math.round(days*DAY),r=Math.round(returnDays*DAY),iv=(x:number)=>Prisma.sql`${x} * interval '1 second'`;
 const ships=(await db.shipment.findMany({where:{orderId},select:{id:true}})).map(x=>x.id);
 const rets=(await db.returnCase.findMany({where:{orderId},select:{id:true}})).map(x=>x.id);
 const money=(await db.moneyTransaction.findMany({where:{orderId},select:{id:true,returnId:true}}));
 const own=[orderId,...ships,...money.filter(m=>!m.returnId).map(m=>m.id)],retIds=[...rets,...money.filter(m=>m.returnId).map(m=>m.id)];
 await db.$executeRaw`UPDATE "DON_HANG" SET tao_luc=tao_luc-${iv(s)},cap_nhat_luc=cap_nhat_luc-${iv(s)},xac_nhan_luc=xac_nhan_luc-${iv(s)},han_giao=han_giao-${iv(s)} WHERE id=${orderId}`;
 await db.$executeRaw`UPDATE "KIEN_HANG" SET tao_luc=tao_luc-${iv(s)},cap_nhat_luc=cap_nhat_luc-${iv(s)},du_kien_giao=du_kien_giao-${iv(s)},ban_giao_luc=ban_giao_luc-${iv(s)},giao_luc=giao_luc-${iv(s)} WHERE don_hang_id=${orderId}`;
 await db.$executeRaw`UPDATE "GIAO_DICH_TIEN" SET tao_luc=tao_luc-${iv(s)},xac_nhan_luc=xac_nhan_luc-${iv(s)} WHERE don_hang_id=${orderId} AND ho_so_tra_id IS NULL`;
 await db.$executeRaw`UPDATE "GIAO_DICH_TIEN" SET tao_luc=tao_luc-${iv(r)},xac_nhan_luc=xac_nhan_luc-${iv(r)} WHERE don_hang_id=${orderId} AND ho_so_tra_id IS NOT NULL`;
 await db.$executeRaw`UPDATE "HO_SO_TRA" SET tao_luc=tao_luc-${iv(r)},duyet_luc=duyet_luc-${iv(r)},dong_luc=dong_luc-${iv(r)} WHERE don_hang_id=${orderId}`;
 await db.$executeRaw`UPDATE "DONG_TRA" SET nhan_luc=nhan_luc-${iv(r)},qc_luc=qc_luc-${iv(r)} WHERE ho_so_tra_id = ANY(${rets})`;
 await db.$executeRaw`UPDATE "BIEN_BAN_BOI_THUONG" SET tao_luc=tao_luc-${iv(r)},cap_nhat_luc=cap_nhat_luc-${iv(r)} WHERE ho_so_tra_id = ANY(${rets})`;
 await db.$executeRaw`UPDATE "BIEN_DONG_TON" SET tao_luc=tao_luc-${iv(s)} WHERE chung_tu_id = ANY(${own})`;
 await db.$executeRaw`UPDATE "BIEN_DONG_TON" SET tao_luc=tao_luc-${iv(r)} WHERE chung_tu_id = ANY(${retIds})`;
 await db.$executeRaw`UPDATE "NHAT_KY" SET tao_luc=tao_luc-${iv(s)} WHERE ma_doi_tuong = ANY(${own})`;
 await db.$executeRaw`UPDATE "NHAT_KY" SET tao_luc=tao_luc-${iv(r)} WHERE ma_doi_tuong = ANY(${retIds})`;
}

type Buyer={customerId?:string;newCustomer?:boolean;recipient:string;phone:string;address:string;city:'HN'|'DN'|'HCM'};
async function order(buyer:Buyer,paymentMethod:'COD'|'TRA_TRUOC'){
 const skus=await db.sku.findMany({where:{active:true},select:{id:true}});
 const count=rnd()<0.7?1:2,lines=[...new Set(Array.from({length:count},()=>pick(skus).id))].map(skuId=>({skuId,quantity:rnd()<0.75?1:2}));
 const base={city:buyer.city,address:buyer.address,lines};const q=await checkoutQuote(base);assert(q.quote,'quote: '+JSON.stringify(q.reasons));
 const r=await createCheckout(QL,key('order'),{...base,...(buyer.customerId?{customerId:buyer.customerId}:{newCustomer:true}),recipient:buyer.recipient,phone:buyer.phone,channel:pick([...CHANNELS]),paymentMethod,quote:q.quote,paidOnline:paymentMethod==='TRA_TRUOC'}) as {id:string};
 return {id:r.id,ships:(await db.shipment.findMany({where:{orderId:r.id},orderBy:{createdAt:'asc'}})).map(s=>s.id),paymentMethod};
}
const batch=(action:'pack'|'handover'|'deliver'|'fail',ids:string[],reason?:string)=>shipmentBatch(KHO,key(action),{action,shipmentIds:ids,...(reason?{reason}:{})});
async function collectCod(o:{id:string;ships:string[];paymentMethod:string}){if(o.paymentMethod==='COD')for(const s of o.ships)await orderCommand(KHO,key('cod'),o.id,{action:'collect',shipmentId:s});}


/** Codes carry their creation date (DH-/VD-/VDH-YYMMDD-…). Orders were placed "now" and shifted back afterwards, so re-date
 * every code to the day it now shows. Order FKs cascade on update; audit/ledger/money texts that quote a code are rewritten too. */
async function alignCodes(){
 const ymd=(d:Date)=>new Date(d.getTime()+7*3600000).toISOString().slice(2,10).replaceAll('-','');
 const redate=(code:string,d:Date)=>code.replace(/^(DH|VD|VDH)-\d{6}-/,(_m,prefix:string)=>`${prefix}-${ymd(d)}-`);
 const quote=async(from:string,to:string)=>{
  await db.$executeRaw`UPDATE "NHAT_KY" SET ma_doi_tuong=replace(ma_doi_tuong,${from},${to}),truoc=replace(truoc::text,${from},${to})::jsonb,sau=replace(sau::text,${from},${to})::jsonb,result=replace(result::text,${from},${to})::jsonb WHERE ma_doi_tuong=${from} OR truoc::text LIKE ${'%'+from+'%'} OR sau::text LIKE ${'%'+from+'%'} OR result::text LIKE ${'%'+from+'%'}`;
  await db.$executeRaw`UPDATE "BIEN_DONG_TON" SET chung_tu_id=replace(chung_tu_id,${from},${to}) WHERE chung_tu_id LIKE ${'%'+from+'%'}`;
  await db.$executeRaw`UPDATE "GIAO_DICH_TIEN" SET ma_tham_chieu=replace(ma_tham_chieu,${from},${to}) WHERE ma_tham_chieu LIKE ${'%'+from+'%'}`;
 };
 let n=0;
 for(const o of await db.order.findMany({select:{id:true,createdAt:true}})){const to=redate(o.id,o.createdAt);if(to===o.id||await db.order.findUnique({where:{id:to},select:{id:true}}))continue;await db.$executeRaw`UPDATE "DON_HANG" SET id=${to} WHERE id=${o.id}`;await quote(o.id,to);n++;}
 for(const s of await db.shipment.findMany({where:{trackingCode:{not:null},handedOverAt:{not:null}},select:{id:true,trackingCode:true,handedOverAt:true}})){const to=redate(s.trackingCode!,s.handedOverAt!);if(to===s.trackingCode)continue;await db.shipment.update({where:{id:s.id},data:{trackingCode:to}});await quote(s.trackingCode!,to);n++;}
 for(const r of await db.returnCase.findMany({where:{trackingCode:{not:null}},select:{id:true,trackingCode:true,createdAt:true}})){const to=redate(r.trackingCode!,r.createdAt);if(to===r.trackingCode)continue;await db.returnCase.update({where:{id:r.id},data:{trackingCode:to}});await quote(r.trackingCode!,to);n++;}
 return n;
}

try{
 if(await db.auditLog.findUnique({where:{commandKey:MARK}}))throw new Error('Đã chạy seed-realistic trên DB này. Muốn làm lại: reset DB, db:seed rồi chạy lại.');
 assert.equal(await db.shipment.count(),0,'DB phải vừa db:seed (chưa có kiện nào).');
 const opening=(await db.inventoryMovement.findMany({select:{id:true}})).map(m=>m.id);
 // Stock receipts: top up every SKU at every warehouse (purchase orders a month ago).
 const [skus,warehouses]=await Promise.all([db.sku.findMany({orderBy:{id:'asc'}}),db.warehouse.findMany({orderBy:{id:'asc'}})]);
 let po=31;for(const w of warehouses)for(const s of skus)await receiveStock(QL,key('receive'),{warehouseId:w.id,skuId:s.id,quantity:30,reason:`Nhập hàng theo phiếu PN-2610-${String(po++).padStart(5,'0')}`});
 const stock=(await db.inventoryMovement.findMany({select:{id:true}})).map(m=>m.id);
 const existing=await db.customer.findMany({orderBy:{id:'asc'}});
 let fi=0;const buyer=():Buyer=>{if(fi<fresh.length&&rnd()<0.35){const [recipient,phone,address,city]=fresh[fi++];return {newCustomer:true,recipient,phone,address,city};}
  const c=pick(existing);return {customerId:c.id,recipient:c.name,phone:c.phone,address:c.address??'1 Đường thử',city:(c.city as 'HN'|'DN'|'HCM'|null)??'HN'};};
 const pay=()=>rnd()<0.55?'COD' as const:'TRA_TRUOC' as const;

 // Drafts: keep the 10 oldest from db:seed, confirm the 10 newest -> "chờ đóng gói" (confirmed today).
 const drafts=await db.order.findMany({where:{status:'NHAP'},orderBy:{createdAt:'desc'},take:10});
 for(const d of drafts){const pv=await allocationPreview(d.id);await orderCommand(QL,key('confirm'),d.id,{action:'confirm',version:pv.version,plan:pv.plan});}

 // Chờ bàn giao (đã đóng gói), hôm nay hoặc hôm qua.
 for(let i=0;i<10;i++){const o=await order(buyer(),pay());await batch('pack',o.ships);await shift(o.id,rnd()*1.2);}
 // Đang giao: bàn giao 1–3 ngày trước.
 for(let i=0;i<10;i++){const o=await order(buyer(),pay());await batch('pack',o.ships);await batch('handover',o.ships);await shift(o.id,1+rnd()*2);}
 // Hoàn tất: giao xong, đã thu tiền; 6–29 ngày trước.
 for(let i=0;i<10;i++){const o=await order(buyer(),pay());for(const a of ['pack','handover','deliver'] as const)await batch(a,o.ships);await collectCod(o);await shift(o.id,6+rnd()*23);}
 // Đã hủy trước khi xuất kho (COD, chưa thu tiền).
 const cancelReasons=['Khách đổi ý, không mua nữa','Khách đặt trùng đơn','Không liên hệ được khách để xác nhận','Khách muốn đổi sang sản phẩm khác','Sai địa chỉ, khách sẽ đặt lại'];
 for(let i=0;i<10;i++){const o=await order(buyer(),'COD');if(rnd()<0.5)await batch('pack',o.ships);await orderCommand(QL,key('cancel'),o.id,{action:'cancel',reason:pick(cancelReasons)});await shift(o.id,rnd()*25);}
 // Giao thất bại: 4 chờ quyết định, 3 chuyển hoàn đang về kho, 3 chuyển hoàn đã nhận + kiểm định xong.
 const failReasons=['Không liên hệ được người nhận','Khách hẹn giao lại nhưng không nghe máy','Khách từ chối nhận hàng','Sai số điện thoại người nhận'];
 for(let i=0;i<10;i++){const o=await order(buyer(),'COD');for(const a of ['pack','handover'] as const)await batch(a,o.ships);const s=o.ships[0];await batch('fail',[s],pick(failReasons));
  if(i>=4){const r=await orderCommand(QL,key('rts'),o.id,{action:'returnToSender',shipmentId:s,reason:'Hãng chuyển hoàn sau 3 lần giao không thành công',openReturn:true}) as {returnId:string};
   if(i>=7){const rc=await db.returnCase.findUniqueOrThrow({where:{id:r.returnId},include:{lines:true}});for(const l of rc.lines)await returnCommand(KHO,key('inspect'),rc.id,{action:'inspect',lineId:l.id,received:l.approved,passed:l.approved,failed:0,refundQuantity:0,reason:'Hàng về đủ, còn nguyên seal',autoSettle:true});}}
  await shift(o.id,3+rnd()*10,1+rnd()*2);}
 // Khách trả hàng: 3 chờ duyệt, 3 chờ nhận, 4 đã kiểm định + hoàn tiền (1 có món hỏng do vận chuyển -> biên bản với hãng).
 const notes=['Hộp bị móp một góc, sản phẩm bên trong trầy xước','Nhận sai màu so với đơn đặt','Sản phẩm không giống ảnh trên trang','Thiếu nắp đi kèm','Dùng thử thấy rò nước ở nắp'];
 const reasons=['Hàng bị lỗi, hư hỏng','Giao sai hàng (sai size, sai màu, sai sản phẩm)','Hàng khác với mô tả','Thiếu hàng, thiếu phụ kiện'];
 for(let i=0;i<10;i++){const o=await order(buyer(),pay());for(const a of ['pack','handover','deliver'] as const)await batch(a,o.ships);await collectCod(o);
  const s=await db.shipment.findFirstOrThrow({where:{id:o.ships[0]},include:{lines:true}});const l=s.lines[0];
  const r=await returnCommand(QL,key('rma'),'new',{action:'create',orderId:o.id,warehouseId:s.warehouseId,kind:'KHACH_TRA',reason:pick(reasons),note:pick(notes),autoApprove:i>=3,lines:[{shipmentLineId:l.id,quantity:1}]}) as {id:string};
  if(i>=6){const rc=await db.returnCase.findUniqueOrThrow({where:{id:r.id},include:{lines:true}});const bad=i===9;
   await returnCommand(KHO,key('inspect'),r.id,{action:'inspect',lineId:rc.lines[0].id,received:1,passed:bad?0:1,failed:bad?1:0,refundQuantity:1,reason:bad?'Vỏ hộp và sản phẩm móp do vận chuyển':'Còn nguyên seal, nhập lại kho',...(bad?{damageCause:'VAN_CHUYEN'}:{}),autoSettle:true});}
  const age=4+rnd()*8;await shift(o.id,age,age-1-rnd()*2);}

 // No leftover drafts: the db:seed drafts not confirmed above never reserved stock or money, so only their lines + audit go.
 const left=(await db.order.findMany({where:{status:'NHAP'},select:{id:true}})).map(o=>o.id);
 await db.$transaction([db.orderLine.deleteMany({where:{orderId:{in:left}}}),db.auditLog.deleteMany({where:{entityId:{in:left}}}),db.order.deleteMany({where:{id:{in:left},status:'NHAP'}})]);
 // Opening stock + purchase receipts happened before all of the above.
 await db.$executeRaw`UPDATE "BIEN_DONG_TON" SET tao_luc=tao_luc - interval '40 days' WHERE id = ANY(${opening})`;
 await db.$executeRaw`UPDATE "BIEN_DONG_TON" SET tao_luc=tao_luc - interval '32 days' WHERE id = ANY(${stock}) AND NOT (id = ANY(${opening}))`;
 console.log('Mã chứng từ chỉnh theo ngày tạo:',await alignCodes());
 await db.auditLog.create({data:{actorId:QL,entity:'HE_THONG',entityId:MARK,action:'SEED_DU_LIEU',reason:'Dữ liệu vận hành mô phỏng 30 ngày',commandKey:MARK}});
 const by=await db.order.groupBy({by:['status'],_count:true});const sh=await db.shipment.groupBy({by:['status'],_count:true});const rs=await db.returnCase.groupBy({by:['status'],_count:true});
 console.log('Đơn:',Object.fromEntries(by.map(x=>[x.status,x._count])));console.log('Kiện:',Object.fromEntries(sh.map(x=>[x.status,x._count])));console.log('RMA:',Object.fromEntries(rs.map(x=>[x.status,x._count])));
 console.log('Khách:',await db.customer.count(),'· Giao dịch tiền:',await db.moneyTransaction.count(),'· Biên bản hãng:',await db.carrierClaim.count());
}finally{await db.$disconnect();}

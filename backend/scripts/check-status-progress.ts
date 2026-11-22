// Walks orders through every stored status (order / parcel / return case / money) on oms_test and checks, at each step,
// the stored statuses and the derived "Tình trạng" shown in the order list. Also checks a few transitions that must be refused.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');url.pathname='/oms_test';process.env.DATABASE_URL=url.toString();delete process.env.SEPAY_API_TOKEN;
const {db}=await import('../src/server/db');const {createDraft}=await import('../src/domain/orders/service');const {orderCommand}=await import('../src/domain/orders/lifecycle');
const {allocationPreview}=await import('../src/domain/allocation/preview');const {receiveStock}=await import('../src/domain/inventory/service');
const {paymentCommand}=await import('../src/domain/payments/service');const {returnCommand}=await import('../src/domain/returns/service');
const {effectiveValue}=await import('../src/domain/dashboard/queries');const {orderProgress}=await import('../src/domain/orders/progress');
const prefix='st-'+randomUUID().slice(0,8),key=()=>randomUUID(),seen={order:new Set<string>(),parcel:new Set<string>(),rma:new Set<string>(),money:new Set<string>(),progress:new Set<string>()};let actor='';
const include={lines:true,shipments:{include:{lines:true},orderBy:{createdAt:'asc' as const}},transactions:true,returns:{include:{lines:{include:{shipmentLine:{include:{orderLine:true}}}}}}};
async function state(id:string,expected:{order:string;parcels?:string[];progress:string;label?:string}){
 const o=await db.order.findUniqueOrThrow({where:{id},include});const p=orderProgress(o,Number(effectiveValue(o)));
 seen.order.add(o.status);o.shipments.forEach(s=>seen.parcel.add(s.status));o.returns.forEach(r=>seen.rma.add(r.status));o.transactions.forEach(t=>seen.money.add(t.status));seen.progress.add(p.code);
 assert.equal(o.status,expected.order,`${id} order status`);if(expected.parcels)assert.deepEqual(o.shipments.map(s=>s.status).sort(),[...expected.parcels].sort(),`${id} parcels`);
 assert.equal(p.code,expected.progress,`${id} progress (${p.label})`);if(expected.label)assert.equal(p.label,expected.label);
 for(const s of o.shipments){if(['DANG_GIAO','DA_GIAO','GIAO_THAT_BAI','CHUYEN_HOAN','DA_NHAN_HOAN'].includes(s.status))assert.match(s.trackingCode??'',/^VD-/,'handed over parcel has waybill');if(s.status==='DA_GIAO')assert(s.deliveredAt,'delivered parcel has date');}
 return o;
}
const refused=async(name:string,run:()=>Promise<unknown>)=>{await assert.rejects(run,Error,name+' must be refused');};
async function confirmed(sku:string,qty:number,payment:'COD'|'TRA_TRUOC'){const d=await createDraft(actor,key(),{customerId:prefix,channel:'NHAP_TAY',recipient:'QA',phone:'0900000000',address:'QA address 12',region:'HN-NOITHANH',paymentMethod:payment,shippingFee:30000,lines:[{skuId:sku,quantity:qty}]});const pv=await allocationPreview(d.id);const r=await orderCommand(actor,key(),d.id,{action:'confirm',version:pv.version,plan:pv.plan});return {id:d.id,result:r as {status?:string}};}
const parcels=async(id:string)=>(await db.shipment.findMany({where:{orderId:id},orderBy:{createdAt:'asc'},include:{lines:true}}));
const cmd=(id:string,action:string,extra:Record<string,unknown>={})=>orderCommand(actor,key(),id,{action,...extra});
try{
 actor=(await db.account.create({data:{username:prefix,name:'Status QA',role:'QUAN_LY',passwordHash:'not-a-login-hash'}})).id;
 await db.customer.create({data:{id:prefix,name:'QA',phone:'0900000000'}});
 for(const [id,region] of [[prefix+'-HN','HN-NOITHANH'],[prefix+'-DN','DN-NOITHANH']])await db.warehouse.create({data:{id,name:id,address:'QA',region}});
 const A=prefix+'-A',B=prefix+'-B';for(const id of [A,B])await db.sku.create({data:{id,name:id,category:'QA',price:100000,weightGrams:500}});
 for(const w of [prefix+'-HN',prefix+'-DN'])for(const s of [A,B])await db.inventory.create({data:{warehouseId:w,skuId:s}});
 const stock=(w:string,s:string,q:number)=>receiveStock(actor,key(),{warehouseId:prefix+'-'+w,skuId:s,quantity:q,reason:'QA stock'});
 await stock('HN',A,20);

 // 1. COD, one parcel: draft → hold → pack → handover → fail → retry → deliver → COD collected → returns (reject, then full RMA path).
 const d1=await createDraft(actor,key(),{customerId:prefix,channel:'NHAP_TAY',recipient:'QA',phone:'0900000000',address:'QA address 12',region:'HN-NOITHANH',paymentMethod:'COD',shippingFee:30000,lines:[{skuId:A,quantity:2}]});
 await state(d1.id,{order:'NHAP',progress:'nhap'});
 const pv=await allocationPreview(d1.id);await orderCommand(actor,key(),d1.id,{action:'confirm',version:pv.version,plan:pv.plan});
 const [s1]=await parcels(d1.id);await state(d1.id,{order:'DA_XAC_NHAN',parcels:['DANG_GIU'],progress:'cho_dong_goi'});
 await refused('deliver before handover',()=>cmd(d1.id,'deliver',{shipmentId:s1.id}));
 await cmd(d1.id,'pack',{shipmentId:s1.id});await state(d1.id,{order:'DA_XAC_NHAN',parcels:['CHO_BAN_GIAO'],progress:'cho_ban_giao'});
 await cmd(d1.id,'handover',{shipmentId:s1.id});await state(d1.id,{order:'DA_XAC_NHAN',parcels:['DANG_GIAO'],progress:'dang_giao'});
 await refused('cancel whole order after handover',()=>cmd(d1.id,'cancel',{reason:'QA cancel'}));
 await cmd(d1.id,'fail',{shipmentId:s1.id,reason:'QA không gặp người nhận'});await state(d1.id,{order:'DA_XAC_NHAN',parcels:['GIAO_THAT_BAI'],progress:'giao_that_bai'});
 await cmd(d1.id,'retry',{shipmentId:s1.id,reason:'QA giao lại'});await state(d1.id,{order:'DA_XAC_NHAN',parcels:['DANG_GIAO'],progress:'dang_giao'});
 await cmd(d1.id,'deliver',{shipmentId:s1.id});await state(d1.id,{order:'DA_XAC_NHAN',parcels:['DA_GIAO'],progress:'cho_thu_tien'});
 // COD receipt first recorded as "chờ xác nhận" → tra soát → success.
 const cod=Number((await db.shipment.findUniqueOrThrow({where:{id:s1.id}})).codAmount);
 await paymentCommand(actor,key(),d1.id,{action:'record',kind:'THU',reason:'THU_COD',amount:cod,source:'COD_MO_PHONG',reference:prefix+'-COD-1',note:'QA COD chờ',status:'CHO_XAC_NHAN',shipmentId:s1.id});
 await state(d1.id,{order:'DA_XAC_NHAN',progress:'cho_tra_soat'});
 const t1=(await db.moneyTransaction.findFirstOrThrow({where:{orderId:d1.id}})).id;
 await paymentCommand(actor,key(),d1.id,{action:'resolve',transactionId:t1,status:'THANH_CONG',note:'QA đối soát xong'});
 await state(d1.id,{order:'DA_XAC_NHAN',parcels:['DA_GIAO'],progress:'hoan_tat'});
 const line=s1.lines[0].id;
 const r1=await returnCommand(actor,key(),'new',{action:'create',orderId:d1.id,warehouseId:prefix+'-HN',kind:'KHACH_TRA',reason:'QA đổi ý',lines:[{shipmentLineId:line,quantity:1}]}) as {id:string};
 await state(d1.id,{order:'DA_XAC_NHAN',progress:'tra_hang'});assert.equal((await db.returnCase.findUniqueOrThrow({where:{id:r1.id}})).status,'CHO_DUYET');
 await returnCommand(actor,key(),r1.id,{action:'reject',reason:'QA không đủ điều kiện'});await state(d1.id,{order:'DA_XAC_NHAN',progress:'hoan_tat'});
 const r2=await returnCommand(actor,key(),'new',{action:'create',orderId:d1.id,warehouseId:prefix+'-HN',kind:'KHACH_TRA',reason:'QA lỗi',autoApprove:true,lines:[{shipmentLineId:line,quantity:1}]}) as {id:string};
 const rl=(await db.returnLine.findFirstOrThrow({where:{returnId:r2.id}})).id;const rs=async()=>{const s=(await db.returnCase.findUniqueOrThrow({where:{id:r2.id}})).status;seen.rma.add(s);return s;};
 assert.equal(await rs(),'CHO_NHAN');await state(d1.id,{order:'DA_XAC_NHAN',progress:'tra_hang'});
 await refused('refund before goods are inspected',()=>paymentCommand(actor,key(),d1.id,{action:'record',kind:'HOAN',reason:'HOAN_RMA',amount:100000,source:'CHUYEN_KHOAN',reference:prefix+'-RF-0',note:'QA hoàn sớm',status:'THANH_CONG',returnId:r2.id}));
 const before=await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:prefix+'-HN',skuId:A}}});
 await returnCommand(actor,key(),r2.id,{action:'receive',lineId:rl,quantity:1});assert.equal(await rs(),'CHO_QC');
 await returnCommand(actor,key(),r2.id,{action:'qc',lineId:rl,passed:1,failed:0,refundQuantity:1,reason:'QA còn seal'});assert.equal(await rs(),'CHO_HOAN_TIEN');
 assert.equal((await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId:prefix+'-HN',skuId:A}}})).sellable,before.sellable+1,'QC pass returns 1 to sellable');
 await refused('close with refund still owed',()=>returnCommand(actor,key(),r2.id,{action:'close',reason:'QA đóng sớm'}));
 await paymentCommand(actor,key(),d1.id,{action:'record',kind:'HOAN',reason:'HOAN_RMA',amount:100000,source:'CHUYEN_KHOAN',reference:prefix+'-RF-1',note:'QA hoàn chưa rõ',status:'CHUA_RO',returnId:r2.id});
 const t2=(await db.moneyTransaction.findFirstOrThrow({where:{orderId:d1.id,reference:prefix+'-RF-1'}})).id;await state(d1.id,{order:'DA_XAC_NHAN',progress:'tra_hang'});
 await paymentCommand(actor,key(),d1.id,{action:'resolve',transactionId:t2,status:'THAT_BAI',note:'QA ngân hàng trả về'});
 await paymentCommand(actor,key(),d1.id,{action:'record',kind:'HOAN',reason:'HOAN_RMA',amount:100000,source:'CHUYEN_KHOAN',reference:prefix+'-RF-2',note:'QA hoàn lại',status:'THANH_CONG',returnId:r2.id});
 await returnCommand(actor,key(),r2.id,{action:'close',reason:'QA đã hoàn đủ'});assert.equal(await rs(),'DA_DONG');
 await state(d1.id,{order:'DA_XAC_NHAN',parcels:['DA_GIAO'],progress:'hoan_tat'});

 // 2. Not enough stock → CHO_HANG; prepaid: unpaid handover refused; collected then cancelled → refund due → refunded.
 const w=await confirmed(A,5,'TRA_TRUOC');
 const big=await createDraft(actor,key(),{customerId:prefix,channel:'NHAP_TAY',recipient:'QA',phone:'0900000000',address:'QA address 12',region:'HN-NOITHANH',paymentMethod:'TRA_TRUOC',shippingFee:30000,lines:[{skuId:B,quantity:5}]});
 const bpv=await allocationPreview(big.id);assert.equal(bpv.plan,null);await orderCommand(actor,key(),big.id,{action:'confirm',version:bpv.version,plan:bpv.plan});
 await state(big.id,{order:'CHO_HANG',progress:'cho_hang'});
 const [s2]=await parcels(w.id);await cmd(w.id,'pack',{shipmentId:s2.id});
 await refused('prepaid handover before payment',()=>cmd(w.id,'handover',{shipmentId:s2.id}));
 const due=Number(effectiveValue(await db.order.findUniqueOrThrow({where:{id:w.id},include})));
 await cmd(w.id,'collect',{amount:due});await state(w.id,{order:'DA_XAC_NHAN',parcels:['CHO_BAN_GIAO'],progress:'cho_ban_giao'});
 await cmd(w.id,'cancel',{reason:'QA khách hủy'});await state(w.id,{order:'DA_HUY',parcels:['HUY'],progress:'cho_hoan_tien'});
 await paymentCommand(actor,key(),w.id,{action:'record',kind:'HOAN',reason:'HOAN_HUY',amount:due,source:'CHUYEN_KHOAN',reference:prefix+'-HUY-1',note:'QA hoàn do hủy',status:'THANH_CONG'});
 await state(w.id,{order:'DA_HUY',parcels:['HUY'],progress:'da_huy'});
 await cmd(big.id,'cancel',{reason:'QA hủy chờ hàng'});await state(big.id,{order:'DA_HUY',progress:'da_huy'});

 // 3. Two warehouses, COD: parcel counts, one delivered, the other failed → returned to sender → received → complete.
 await stock('HN',B,1);await stock('DN',B,1);
 const sp=await confirmed(B,2,'COD');const [pa,pb]=await parcels(sp.id);
 await state(sp.id,{order:'DA_XAC_NHAN',parcels:['DANG_GIU','DANG_GIU'],progress:'cho_dong_goi',label:'Chờ đóng gói'});
 await cmd(sp.id,'pack',{shipmentId:pa.id});await state(sp.id,{order:'DA_XAC_NHAN',progress:'cho_dong_goi',label:'Chờ đóng gói (1/2 kiện)'});
 await cmd(sp.id,'pack',{shipmentId:pb.id});await cmd(sp.id,'handover',{shipmentId:pa.id});await state(sp.id,{order:'DA_XAC_NHAN',progress:'cho_ban_giao',label:'Chờ bàn giao (1/2 kiện)'});
 await cmd(sp.id,'handover',{shipmentId:pb.id});await cmd(sp.id,'deliver',{shipmentId:pa.id});await state(sp.id,{order:'DA_XAC_NHAN',parcels:['DA_GIAO','DANG_GIAO'],progress:'dang_giao',label:'Đang giao (1/2 kiện)'});
 await cmd(sp.id,'fail',{shipmentId:pb.id,reason:'QA từ chối nhận'});await state(sp.id,{order:'DA_XAC_NHAN',progress:'giao_that_bai',label:'Giao thất bại (1/2 kiện)'});
 await cmd(sp.id,'returnToSender',{shipmentId:pb.id,openReturn:true});await state(sp.id,{order:'DA_XAC_NHAN',parcels:['DA_GIAO','CHUYEN_HOAN'],progress:'tra_hang'});
 const rts=await db.returnCase.findFirstOrThrow({where:{orderId:sp.id},include:{lines:true}});assert.equal(rts.kind,'CHUYEN_HOAN');assert.equal(rts.status,'CHO_NHAN');
 await returnCommand(actor,key(),rts.id,{action:'inspect',lineId:rts.lines[0].id,received:1,passed:1,failed:0,refundQuantity:0,reason:'QA hàng nguyên',autoSettle:true});
 const codA=Number((await db.shipment.findUniqueOrThrow({where:{id:pa.id}})).codAmount);await cmd(sp.id,'collect',{shipmentId:pa.id,amount:codA});
 await state(sp.id,{order:'DA_XAC_NHAN',parcels:['DA_GIAO','DA_NHAN_HOAN'],progress:'hoan_tat'});
 assert.equal((await db.returnCase.findUniqueOrThrow({where:{id:rts.id}})).status,'DA_DONG');

 // 4. Cancel one unshipped parcel of a two-warehouse order: the order continues with the other parcel only.
 const C=prefix+'-C';await db.sku.create({data:{id:C,name:C,category:'QA',price:100000,weightGrams:500}});for(const wh of [prefix+'-HN',prefix+'-DN'])await db.inventory.create({data:{warehouseId:wh,skuId:C}});
 await stock('HN',C,1);await stock('DN',C,1);
 const c4=await confirmed(C,2,'COD');const c4p=await parcels(c4.id);assert.equal(c4p.length,2,'split into two parcels');await cmd(c4.id,'cancelShipment',{shipmentId:c4p[0].id,reason:'QA hủy một kiện'});
 await state(c4.id,{order:'DA_XAC_NHAN',parcels:['HUY','DANG_GIU'],progress:'cho_dong_goi',label:'Chờ đóng gói'});
 // Cancelling the last open parcel cancels the whole order.
 await cmd(c4.id,'cancelShipment',{shipmentId:c4p[1].id,reason:'QA hủy nốt'});await state(c4.id,{order:'DA_HUY',parcels:['HUY','HUY'],progress:'da_huy'});

 const all={order:['NHAP','CHO_HANG','DA_XAC_NHAN','DA_HUY'],parcel:['DANG_GIU','CHO_BAN_GIAO','DANG_GIAO','DA_GIAO','GIAO_THAT_BAI','CHUYEN_HOAN','DA_NHAN_HOAN','HUY'],rma:['CHO_DUYET','TU_CHOI','CHO_NHAN','CHO_QC','CHO_HOAN_TIEN','DA_DONG'],money:['CHO_XAC_NHAN','THANH_CONG','THAT_BAI','CHUA_RO'],progress:['nhap','cho_hang','cho_dong_goi','cho_ban_giao','dang_giao','giao_that_bai','tra_hang','cho_tra_soat','cho_thu_tien','cho_hoan_tien','hoan_tat','da_huy']};
 for(const [k,list] of Object.entries(all))for(const v of list)assert((seen as Record<string,Set<string>>)[k].has(v),`${k} ${v} not exercised`);
 console.log(JSON.stringify({result:'PASS',orderStatuses:4,parcelStatuses:8,returnStatuses:6,moneyStatuses:4,progress:12,refused:6,scope:'oms_test only'}));
}finally{await db.$disconnect();}

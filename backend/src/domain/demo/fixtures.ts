// Operator-only, repeatable demo preparation. No HTTP reset endpoint. Real accounts/orders are never deleted.
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {hash} from 'argon2';
import {Prisma} from '@/generated/prisma/client';
import {db} from '@/server/db';
import {command} from '@/server/commands';
import {isDemoMode} from '@/domain/demo-mode';
import {saveCatalog,countStock} from '@/domain/foundation/service';
import {checkoutQuote,createCheckout} from '@/domain/orders/checkout';
import {createDraft} from '@/domain/orders/service';
import {allocationPreview} from '@/domain/allocation/preview';
import {orderCommand} from '@/domain/orders/lifecycle';
import {shipmentBatch} from '@/domain/orders/batch';
import {returnCommand} from '@/domain/returns/service';
import {paymentCommand} from '@/domain/payments/service';
import {placeOrder} from '@/domain/integrations/shopvui';
import {registerShop,saveAddresses} from '@/domain/storefront/accounts';
import {demoCatalog,demoMatrix} from '../../../prisma/demo-catalog';
export const DEMO_ACTOR='DEMO-V2-ACTOR';
export type DemoCase={key:string;title:string;orderId:string;returnId?:string;expected:string;path:string};
export type DemoRun={version:2;id:string;status:'RUNNING'|'READY'|'ARCHIVED'|'FAILED';createdAt:string;buyer:{id:string;username:string};cases:DemoCase[];archivedAt?:string;error?:string};
const warehouses=['KHO-HN','KHO-DN','KHO-HCM'];
const specs=[
 ['DOM01','Một kho: đóng gói → giao → thu COD','Một kiện, kho HCM, đủ hàng'],
 ['DOM02','Hai kho bắt buộc: bình HN + hộp ĐN','Hai kiện; không có kho đủ toàn đơn'],
 ['DOM03','Chọn kho tối thiểu cước + đóng gói','Một kho HN khi giao HN'],
 ['DOM04','Thiếu hàng: đơn chờ bổ sung','CHO_HANG; không giữ tồn'],
 ['DOM05','Chờ bàn giao','Đã đóng gói; chưa xuất tồn'],
 ['DOM06','Đang giao COD','Đã xuất tồn; chưa thu COD'],
 ['DOM07','Giao thất bại: giao lại hoặc chuyển hoàn','GIAO_THAT_BAI'],
 ['DOM08','Hủy đơn trước xuất','Đang giữ hàng; có thể hủy và giải phóng'],
 ['DOM09','SLA: từ chối đóng gói quá hạn','Deadline quá hạn được đặt bằng audit DEMO, chưa xuất tồn'],
 ['RMA01','Khách trả: chờ duyệt','CHO_DUYET'],
 ['RMA02','Khách trả: nhận và kiểm định','CHO_NHAN'],
 ['RMA03','Đã nhận hàng: chỉ còn QC','CHO_QC; 2 món đang QC'],
 ['RMA04','Hàng hỏng do vận chuyển: biên bản','Cách ly + biên bản CHO_GUI, hoàn mô phỏng đã xong'],
 ['RMA05','Chuyển hoàn COD: thiếu/hỏng/đạt','Chờ nhận; có thể thử nhận 2/3, đạt1, lỗi1'],
 ['RMA06','Khoản hoàn chưa rõ: tra soát','CHO_HOAN_TIEN; chứng từ CHUA_RO'],
 ['BC01','Đơn hai kho hoàn tất để đối chiếu báo cáo','Đã giao và thu đủ COD'],
 ['SHOP01','Đơn của tài khoản ShopVui demo','Ví đã trừ một lần; có thể hủy để hoàn ví'],
] as const;
function json(value:unknown){return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;}
export async function prepareDemo(){
 if(!isDemoMode()||process.env.OMS_DEMO_REAL_BANK==='1')throw Error('Chỉ chuẩn bị khi OMS_DEMO_MODE=1 và SePay thật đã tắt.');
 const claimedRuns=await db.auditLog.findMany({where:{entity:'DEMO_RUN',actorId:DEMO_ACTOR}});
 const priorBuyers=claimedRuns.map(l=>l.result as unknown as DemoRun).filter(r=>r?.version===2).map(r=>r.buyer.id);
 if(priorBuyers.length&&await db.moneyTransaction.count({where:{source:'CHUYEN_KHOAN',reference:{startsWith:'SEPAY-'},order:{shopPurchase:{accountId:{in:priorBuyers}}}}}))throw Error('Tài khoản fixture đã nhận tiền thật. Không được tự lưu trữ/khóa hoặc làm mới; cần đối soát thủ công.');
 const allWarehouses=await db.warehouse.findMany({where:{active:true},include:{inventory:true}});
 if(warehouses.some(id=>!allWarehouses.some(w=>w.id===id)))throw Error('Cần 3 kho chuẩn KHO-HN / KHO-DN / KHO-HCM.');
 if(allWarehouses.some(w=>!warehouses.includes(w.id)&&w.inventory.some(i=>i.sellable-i.reserved-i.safety>0&&demoMatrix[i.skuId])))throw Error('Có tồn SKU demo ở kho ngoài phạm vi. Không tự thay đổi kho đó.');
 const currentSkus=await db.sku.findMany({where:{id:{in:demoCatalog.map(s=>s[0])}}});
 for(const s of demoCatalog){const old=currentSkus.find(x=>x.id===s[0]);if(old&&Number(old.price)!==s[4]&&Number(old.price)!==s[6])throw Error('Giá '+s[0]+' đã thay đổi ngoài bộ demo; kiểm tra trước khi ghi đè.');}
 const manager=await db.account.findFirst({where:{active:true,role:'QUAN_LY',id:{not:DEMO_ACTOR}},select:{id:true}});if(!manager)throw Error('Cần Quản lý thật đang hoạt động để chuẩn bị danh mục demo.');
 // The non-login fixture actor must NOT count as a spare manager, otherwise the last usable manager could be disabled.
 await db.account.upsert({where:{id:DEMO_ACTOR},update:{role:'NHAN_VIEN',active:true},create:{id:DEMO_ACTOR,username:'demo-fixtures-v2',name:'Bộ dữ liệu trình diễn',role:'NHAN_VIEN',passwordHash:await hash(randomBytes(32).toString('hex'))}});
 // Retire ONLY records explicitly owned by prior operator-created runs. Histories and wallets stay intact.
 const previous=claimedRuns;
 let retired=0;
 for(const log of previous){const run=log.result as unknown as DemoRun;if(run?.version!==2||run.status==='ARCHIVED')continue;
  for(const c of run.cases){const o=await db.order.findUnique({where:{id:c.orderId},include:{shipments:true,transactions:true,shopPurchase:true}});if(!o)continue;
   const owned=o.createdById===DEMO_ACTOR||o.shopPurchase?.accountId===run.buyer.id;
   const protectedMoney=o.transactions.some(t=>t.reference.startsWith('SEPAY-')||t.source==='TIEN_MAT'||t.source==='CHUYEN_KHOAN'&&!t.note.includes('mô phỏng'));
   if(owned&&!protectedMoney&&o.status!=='DA_HUY'&&!o.shipments.some(s=>s.handedOverAt))await orderCommand(DEMO_ACTOR,'demo-retire:'+run.id+':'+c.key,o.id,{action:'cancel',reason:'Kết thúc lượt demo '+run.id+', chuẩn bị lượt mới'});
  }
  const ownedBuyer=await db.shopAccount.findUnique({where:{id:run.buyer.id}});if(ownedBuyer&&ownedBuyer.username===run.buyer.username)await db.shopAccount.update({where:{id:ownedBuyer.id},data:{active:false,sessionVersion:{increment:1}}});
  await db.auditLog.update({where:{id:log.id},data:{result:json({...run,status:'ARCHIVED',archivedAt:new Date().toISOString()})}});retired++;
 }
 const runId=new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+randomBytes(3).toString('hex');const at=new Date();
 const code=(key:string)=>'DH-'+new Date(Date.now()+7*3600000).toISOString().slice(2,10).replaceAll('-','')+'-'+createHash('sha256').update(runId+key).digest('hex').slice(0,6).toUpperCase();
 const password=process.env.DEMO_BUYER_PASSWORD||'DemoShop2026';
 const buyer=await registerShop({username:'demo'+randomBytes(5).toString('hex'),contact:'demo-'+runId+'@example.test',password});
 const shopBuyer=await db.shopAccount.findUniqueOrThrow({where:{id:buyer.id}});
 const run:DemoRun={version:2,id:runId,status:'RUNNING',createdAt:at.toISOString(),buyer:{id:buyer.id,username:shopBuyer.username},cases:specs.map(([key,title,expected])=>({key,title,expected,orderId:code(key),path:'/orders/'+code(key)}))};
 const record=await db.auditLog.create({data:{actorId:DEMO_ACTOR,entity:'DEMO_RUN',entityId:runId,action:'CHUAN_BI_DEMO',reason:'Chỉ dữ liệu mô phỏng; không nhận tiền ngân hàng',commandKey:'demo-run:'+runId,result:json(run)}});
 const key=(tag:string)=>'demo:'+runId+':'+tag;
 const find=(tag:string)=>run.cases.find(c=>c.key===tag)!;
 async function persist(){await db.auditLog.update({where:{id:record.id},data:{result:json(run)}});}
 try{
  for(const [id,name,variant,category,price,weightGrams]of demoCatalog){await saveCatalog(manager.id,key('sku:'+id),{kind:'sku',id,name,category,price,weightGrams,active:true});await db.sku.update({where:{id},data:{variant}});}
  for(const [wi,warehouseId]of warehouses.entries())for(const [skuId,amounts]of Object.entries(demoMatrix)){
   const current=await db.inventory.findUniqueOrThrow({where:{warehouseId_skuId:{warehouseId,skuId}}});
   await countStock(DEMO_ACTOR,key('stock:'+warehouseId+':'+skuId),{warehouseId,skuId,version:current.version,sellable:current.reserved+current.safety+amounts[wi],reason:'Kiểm kê/bổ sung đầu lượt demo '+runId+'; giữ nguyên lượng đang giữ/QC/cách ly'});
  }
  const places=[{id:'DEMO-HN',city:'HN' as const,province:'Hà Nội',name:'Nguyễn Minh Anh',address:'12 Phố Mẫu, Hà Nội'},{id:'DEMO-DN',city:'DN' as const,province:'Đà Nẵng',name:'Trần Hải An',address:'24 Đường Mẫu, Đà Nẵng'},{id:'DEMO-HCM',city:'HCM' as const,province:'TP. Hồ Chí Minh',name:'Lê Ngọc Bình',address:'36 Đường Mẫu, TP. Hồ Chí Minh'}];
  for(const p of places){const old=await db.customer.findUnique({where:{id:p.id}});if(old&&(old.name!==p.name||old.phone!=='0900000001'))throw Error('Mã khách '+p.id+' đã thuộc dữ liệu khác; không ghi đè.');await db.customer.upsert({where:{id:p.id},update:{},create:{id:p.id,name:p.name,phone:'0900000001',address:p.address,city:p.city}});}
  await saveAddresses(buyer.id,{addresses:places.map((p,i)=>({id:p.id,name:p.name,phone:'0900000001',province:p.province,ward:'Phường Mẫu',detail:p.address,type:'home',isDefault:i===2}))});
  async function create(tag:string,items:{skuId:string;quantity:number}[],city:'HN'|'DN'|'HCM'='HCM',paymentMethod:'COD'|'TRA_TRUOC'='COD'){
   const p=places.find(p=>p.city===city)!;const q=await checkoutQuote({city,address:p.address,lines:items});if(!q.quote)throw Error(tag+': '+q.reasons.join('; '));
   await createCheckout(DEMO_ACTOR,key(tag),{orderId:find(tag).orderId,city,address:p.address,lines:items,customerId:p.id,recipient:p.name+' · '+tag,phone:'0900000001',channel:tag.startsWith('RMA')?'WEBSITE':tag==='BC01'?'SHOPEE':'NHAP_TAY',paymentMethod,quote:q.quote,paidOnline:paymentMethod==='TRA_TRUOC'});
   return find(tag).orderId;
  }
  async function batch(tag:string,action:'pack'|'handover'|'deliver'|'fail',reason?:string){const id=find(tag).orderId;const ids=(await db.shipment.findMany({where:{orderId:id}})).map(s=>s.id);const r=await shipmentBatch(DEMO_ACTOR,key(tag+':'+action),{action,shipmentIds:ids,...(reason?{reason}:{})});if(r.results.some(r=>!r.ok))throw Error(JSON.stringify(r));}
  async function delivered(tag:string,skuId='CH-500',quantity=2){await create(tag,[{skuId,quantity}],'HCM','TRA_TRUOC');for(const action of ['pack','handover','deliver'] as const)await batch(tag,action);}
  async function rma(tag:string,autoApprove=true){const s=await db.shipment.findFirstOrThrow({where:{orderId:find(tag).orderId},include:{lines:true}});const result=await returnCommand(DEMO_ACTOR,key(tag+':return'),'new',{action:'create',orderId:s.orderId,warehouseId:s.warehouseId,kind:'KHACH_TRA',reason:'Khách yêu cầu đổi trả theo chính sách cửa hàng',autoApprove,lines:[{shipmentLineId:s.lines[0].id,quantity:s.lines[0].quantity}]}) as {id:string};find(tag).returnId=result.id;find(tag).path='/returns/'+result.id;await persist();return db.returnCase.findUniqueOrThrow({where:{id:result.id},include:{lines:true}});}
  await create('DOM01',[{skuId:'CH-500',quantity:2}]);
  await create('DOM02',[{skuId:'BT-750-XANH',quantity:1},{skuId:'HT-1200',quantity:1}],'DN');
  await create('DOM03',[{skuId:'TH-5',quantity:2}],'HN');
  const shortage=find('DOM04');await createDraft(DEMO_ACTOR,key('DOM04'),{id:shortage.orderId,customerId:'DEMO-HN',recipient:places[0].name+' · DOM04',phone:'0900000001',address:places[0].address,region:'HN-NOITHANH',channel:'NHAP_TAY',paymentMethod:'COD',shippingFee:0,lines:[{skuId:'KT-SET',quantity:2}]});const pv=await allocationPreview(shortage.orderId);if(pv.plan)throw Error('DOM04 unexpectedly allocatable');await orderCommand(DEMO_ACTOR,key('DOM04:confirm'),shortage.orderId,{action:'confirm',version:pv.version,plan:null});
  await create('DOM05',[{skuId:'CB-6',quantity:1}]);await batch('DOM05','pack');
  await create('DOM06',[{skuId:'DC-3',quantity:1}]);await batch('DOM06','pack');await batch('DOM06','handover');
  await create('DOM07',[{skuId:'TG-1',quantity:1}]);await batch('DOM07','pack');await batch('DOM07','handover');await batch('DOM07','fail','Không liên lạc được với người nhận');
  await create('DOM08',[{skuId:'BD-28',quantity:1}],'HN');
  await create('DOM09',[{skuId:'CH-500',quantity:1}]);await command(DEMO_ACTOR,key('DOM09:deadline'),'DEMO_HAN_SLA','DON_HANG',find('DOM09').orderId,{fixture:true},async tx=>{await tx.order.update({where:{id:find('DOM09').orderId},data:{deadline:new Date(Date.now()-1000)}});return {id:find('DOM09').orderId};});
  await delivered('RMA01');await rma('RMA01',false);
  await delivered('RMA02','HT-1200');await rma('RMA02');
  await delivered('RMA03');const q=await rma('RMA03');await returnCommand(DEMO_ACTOR,key('RMA03:receive'),q.id,{action:'receive',lineId:q.lines[0].id,quantity:2});
  await delivered('RMA04','KH-2',1);const bad=await rma('RMA04');await returnCommand(DEMO_ACTOR,key('RMA04:inspect'),bad.id,{action:'inspect',lineId:bad.lines[0].id,received:1,passed:0,failed:1,refundQuantity:1,reason:'Thùng hàng móp góc do va đập khi trung chuyển',damageCause:'VAN_CHUYEN',autoSettle:true});
  await create('RMA05',[{skuId:'DC-3',quantity:3}]);await batch('RMA05','pack');await batch('RMA05','handover');await batch('RMA05','fail','Khách từ chối nhận hàng tại điểm giao');const sender=await db.shipment.findFirstOrThrow({where:{orderId:find('RMA05').orderId}});const sr=await orderCommand(DEMO_ACTOR,key('RMA05:sender'),sender.orderId,{action:'returnToSender',shipmentId:sender.id,openReturn:true}) as {returnId:string};find('RMA05').returnId=sr.returnId;find('RMA05').path='/returns/'+sr.returnId;
  await delivered('RMA06','HT-1200',1);const unclear=await rma('RMA06');await returnCommand(DEMO_ACTOR,key('RMA06:inspect'),unclear.id,{action:'inspect',lineId:unclear.lines[0].id,received:1,passed:1,failed:0,refundQuantity:1,reason:'Sản phẩm còn nguyên tem niêm phong',autoSettle:false});await paymentCommand(DEMO_ACTOR,key('RMA06:unclear'),find('RMA06').orderId,{action:'record',kind:'HOAN',reason:'HOAN_RMA',returnId:unclear.id,amount:45000,source:'VI_MO_PHONG',reference:'DEMO-'+runId,note:'Giao dịch hoàn tiền đang chờ đối soát kết quả',status:'CHUA_RO'});
  await create('BC01',[{skuId:'BT-750-XANH',quantity:1},{skuId:'HT-1200',quantity:1}],'DN');for(const action of ['pack','handover','deliver'] as const)await batch('BC01',action);for(const s of await db.shipment.findMany({where:{orderId:find('BC01').orderId}}))await orderCommand(DEMO_ACTOR,key('BC01:collect:'+s.id),s.orderId,{action:'collect',shipmentId:s.id});
  await placeOrder({orderId:find('SHOP01').orderId,recoveryKey:randomUUID()+randomUUID(),name:places[2].name+' · SHOP01',phone:'0900000001',address:{province:'TP. Hồ Chí Minh',ward:'Phường Mẫu',detail:places[2].address},items:[{sku:'CH-500',qty:1}],payment:'wallet'},buyer.id);
  run.status='READY';await persist();return {run,retired,prices:demoCatalog.map(s=>({sku:s[0],before:s[6],after:s[4]}))};
 }catch(e){run.status='FAILED';run.error=e instanceof Error?e.message:String(e);await persist();throw e;}
}

import 'dotenv/config';
import {hash} from 'argon2';
import {randomBytes} from 'node:crypto';
import {db} from '../src/server/db';
import {receiveStock} from '../src/domain/inventory/service';
import {createDraft} from '../src/domain/orders/service';
import {customers,warehouses,shippingAddress} from './presentation-fixtures';
import {demoCatalog} from './demo-catalog';
async function main(){
 const password=process.env.BOOTSTRAP_PASSWORD;if(!password||password.length<12)throw new Error('BOOTSTRAP_PASSWORD tối thiểu 12 ký tự.');
 const passwordHash=await hash(password);
 for(const [id,username,name,role]of [['QL-01','quanly','Nguyễn Quang Minh','QUAN_LY'],['NV-01','nhanvien.an','Trần Hoài An','NHAN_VIEN'],['NV-02','nhanvien.binh','Phạm Thanh Bình','NHAN_VIEN']]as const)await db.account.upsert({where:{id},update:{},create:{id,username,name,role,passwordHash:process.env.OMS_PUBLIC_DEPLOYMENT==='1'&&role==='NHAN_VIEN'?await hash(randomBytes(32).toString('hex')):passwordHash,active:!(process.env.OMS_PUBLIC_DEPLOYMENT==='1'&&role==='NHAN_VIEN')}});
 for(const w of warehouses)await db.warehouse.upsert({where:{id:w.id},update:{},create:w});
 const skus=demoCatalog;
 for(const [id,name,variant,category,price,weightGrams]of skus)await db.sku.upsert({where:{id},update:{},create:{id,name,variant,category,price,weightGrams}});
 for(const [i,c]of customers.entries())await db.customer.upsert({where:{id:c.id},update:{},create:{...c,city:['HN','DN','HCM'][i%3],address:shippingAddress(i,['HN-NOITHANH','DN-NOITHANH','HCM-NOITHANH'][i%3])}});
 for(const [wi,w]of warehouses.entries())for(const [si,s]of skus.entries()){
  await db.inventory.upsert({where:{warehouseId_skuId:{warehouseId:w.id,skuId:s[0]}},update:{},create:{warehouseId:w.id,skuId:s[0],safety:1}});
  const quantity=si===0?(wi===0?5:0):si===1?(wi===1?8:0):12+(wi*7+si*3)%25;
  const oldKey=`seed-stock-${w.id}-${s[0]}`;const key='PN-'+String(wi*10+si+1).padStart(6,'0');
  if(quantity&&!await db.auditLog.findFirst({where:{commandKey:{in:[oldKey,key]}}}))await receiveStock('QL-01',key,{warehouseId:w.id,skuId:s[0],quantity,reason:'Nhập tồn đầu kỳ theo biên bản kiểm kê KK-2610-001'});
 }
 const draftCount=process.env.OMS_DEMO_MODE==='1'?0:20;
 for(let i=0;i<draftCount;i++){
  // Code comes from issueDocumentCode like every other order; the stable command key makes a re-run replay instead of duplicating.
  const date=new Date();date.setUTCDate(date.getUTCDate()-Math.floor(i*1.35));date.setUTCHours(2+i%9,10,0,0);
  const c=customers[i%10],region=(['HN-NOITHANH','DN-NOITHANH','HCM-NOITHANH']as const)[i%3];
  await createDraft('NV-01','initial-order-'+(i+1),{customerId:c.id,channel:(['NHAP_TAY','WEBSITE','SHOPEE','TIKTOK']as const)[i%4],recipient:c.name,phone:c.phone,address:shippingAddress(i%10,region),region,paymentMethod:i%2?'COD':'TRA_TRUOC',shippingFee:30000,lines:[{skuId:skus[i%10][0],quantity:1+i%3}]},date);
 }
 if(process.env.OMS_DEMO_MODE==='1')await db.auditLog.upsert({where:{commandKey:'seed-demo-foundation-v2'},update:{},create:{actorId:'QL-01',entity:'HE_THONG',entityId:'demo-foundation-v2',action:'SEED_DEMO_FOUNDATION',commandKey:'seed-demo-foundation-v2',reason:'Nền demo, không tự tạo đơn lịch sử hết SLA'}});
 console.log(`Khởi tạo xong 3 kho, 10 sản phẩm, 10 khách hàng và ${draftCount} đơn nháp. Thông tin hoàn toàn hư cấu, không dùng để liên hệ hoặc giao thật.`);
}
main().finally(()=>db.$disconnect());

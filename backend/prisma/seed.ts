import 'dotenv/config';
import {hash} from 'argon2';
import {db} from '../src/server/db';
import {receiveStock} from '../src/domain/inventory/service';
import {createDraft} from '../src/domain/orders/service';
import {customers,warehouses,shippingAddress} from './presentation-fixtures';
async function main(){
 const password=process.env.BOOTSTRAP_PASSWORD;if(!password||password.length<12)throw new Error('BOOTSTRAP_PASSWORD tối thiểu 12 ký tự.');
 const passwordHash=await hash(password);
 for(const [id,username,name,role]of [['QL-01','quanly','Nguyễn Quang Minh','QUAN_LY'],['NV-01','nhanvien.an','Trần Hoài An','NHAN_VIEN'],['NV-02','nhanvien.binh','Phạm Thanh Bình','NHAN_VIEN']]as const)await db.account.upsert({where:{id},update:{},create:{id,username,name,role,passwordHash}});
 for(const w of warehouses)await db.warehouse.upsert({where:{id:w.id},update:{},create:w});
 const skus=[['BT-750-XANH','Bình giữ nhiệt 750ml','Xanh','Bình nước',250000,450],['HT-1200','Hộp thực phẩm 1.200ml','Trong suốt','Đồ bếp',90000,300],['CH-500','Cốc thủy tinh 500ml','','Đồ uống',65000,320],['KT-SET','Khăn tắm cotton','Xám','Gia dụng',120000,350],['DC-3','Dao bếp bộ 3','','Đồ bếp',185000,600],['TH-5','Thùng đựng 5L','Trắng','Lưu trữ',75000,400],['BD-28','Chảo chống dính 28cm','','Đồ bếp',320000,850],['KH-2','Khay inox 2 ngăn','','Đồ bếp',110000,500],['TG-1','Túi giữ nhiệt','Xanh','Gia dụng',145000,250],['CB-6','Bộ cốc 6 chiếc','','Đồ uống',210000,1200]]as const;
 for(const [id,name,variant,category,price,weightGrams]of skus)await db.sku.upsert({where:{id},update:{},create:{id,name,variant,category,price,weightGrams}});
 for(const [i,c]of customers.entries())await db.customer.upsert({where:{id:c.id},update:{},create:{...c,city:['HN','DN','HCM'][i%3],address:shippingAddress(i,['HN-NOITHANH','DN-NOITHANH','HCM-NOITHANH'][i%3])}});
 for(const [wi,w]of warehouses.entries())for(const [si,s]of skus.entries()){
  await db.inventory.upsert({where:{warehouseId_skuId:{warehouseId:w.id,skuId:s[0]}},update:{},create:{warehouseId:w.id,skuId:s[0],safety:1}});
  const quantity=si===0?(wi===0?5:0):si===1?(wi===1?8:0):12+(wi*7+si*3)%25;
  const oldKey=`seed-stock-${w.id}-${s[0]}`;const key='PN-'+String(wi*10+si+1).padStart(6,'0');
  if(quantity&&!await db.auditLog.findFirst({where:{commandKey:{in:[oldKey,key]}}}))await receiveStock('QL-01',key,{warehouseId:w.id,skuId:s[0],quantity,reason:'Nhập tồn đầu kỳ theo biên bản kiểm kê KK-2610-001'});
 }
 for(let i=0;i<20;i++){
  // Code comes from issueDocumentCode like every other order; the stable command key makes a re-run replay instead of duplicating.
  const date=new Date();date.setUTCDate(date.getUTCDate()-Math.floor(i*1.35));date.setUTCHours(2+i%9,10,0,0);
  const c=customers[i%10],region=(['HN-NOITHANH','DN-NOITHANH','HCM-NOITHANH']as const)[i%3];
  await createDraft('NV-01','initial-order-'+(i+1),{customerId:c.id,channel:(['NHAP_TAY','WEBSITE','SHOPEE','TIKTOK']as const)[i%4],recipient:c.name,phone:c.phone,address:shippingAddress(i%10,region),region,paymentMethod:i%2?'COD':'TRA_TRUOC',shippingFee:30000,lines:[{skuId:skus[i%10][0],quantity:1+i%3}]},date);
 }
 console.log('Khởi tạo xong 3 kho, 10 sản phẩm, 10 khách hàng và 20 đơn nháp. Thông tin hoàn toàn hư cấu, không dùng để liên hệ hoặc giao thật.');
}
main().finally(()=>db.$disconnect());

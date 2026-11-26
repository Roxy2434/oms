import 'dotenv/config';
import {Client} from 'pg';
import {mkdir,writeFile} from 'node:fs/promises';
import {db} from '../src/server/db';
import {prepareDemo} from '../src/domain/demo/fixtures';
const url=new URL(process.env.DATABASE_URL!);
const local=url.hostname==='127.0.0.1'&&url.port===(process.env.OMS_DB_PORT||'55432')&&/^\/(oms|oms_test|oms_demo_test_[a-z0-9_]+)$/.test(url.pathname);
const container=process.argv.includes('--container-initial')&&url.hostname==='db'&&url.port==='5432'&&url.pathname==='/oms';
if(!local&&!container)throw Error('Chỉ cho phép DB OMS local hoặc container db/oms đã định danh.');
if(process.env.OMS_DEMO_MODE!=='1')throw Error('Cần OMS_DEMO_MODE=1. Không dùng công cụ demo trong DB nhận tiền thật.');
const lock=new Client({connectionString:url.toString()});await lock.connect();
try{
 const r=await lock.query("SELECT pg_try_advisory_lock(hashtext('oms-demo-v2-prepare')) AS locked");if(!r.rows[0].locked)throw Error('Đang có một lượt chuẩn bị demo khác.');
 const result=await prepareDemo();await mkdir('storage/demo',{recursive:true});await writeFile('storage/demo/latest.json',JSON.stringify(result,null,2));
 const lines=['# Lượt demo '+result.run.id,'','Tài khoản ShopVui: `'+result.run.buyer.username+'`','Mật khẩu: biến DEMO_BUYER_PASSWORD nếu có; mặc định công khai `DemoShop2026` (chỉ tài khoản demo).','','| Ca | Mở | Kết quả / thao tác |','|---|---|---|',...result.run.cases.map(c=>'| '+c.key+' — '+c.title+' | http://127.0.0.1:3001'+c.path+' | '+c.expected+' |'),'','Đặt lại lượt mới: `npm run demo:refresh`. Giữ lịch sử, tài khoản thật và chứng từ; chỉ hủy kiện chưa xuất thuộc lượt cũ, khóa tài khoản demo cũ, bổ sung ATP và tạo các ca mới.','Ví mỗi tài khoản mới vẫn chỉ được cấp 6 triệu một lần. SePay tiền thật bị khóa trong chế độ demo.'];
 await writeFile('storage/demo/LUOT-HIEN-TAI.md',lines.join('\n'));
 console.log(JSON.stringify({result:'READY',database:url.pathname.slice(1),run:result.run.id,cases:result.run.cases.length,buyer:result.run.buyer.username,retiredRuns:result.retired,guide:'storage/demo/LUOT-HIEN-TAI.md',manifest:'storage/demo/latest.json'},null,2));
}finally{await lock.query("SELECT pg_advisory_unlock(hashtext('oms-demo-v2-prepare'))").catch(()=>{});await lock.end();await db.$disconnect();}

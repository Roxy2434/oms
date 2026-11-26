// Rebuild operator guide from the persistent run record. Read-only DB access, useful after a container restart.
import 'dotenv/config';import {mkdir,writeFile} from 'node:fs/promises';import {db} from '../src/server/db';import type {DemoRun} from '../src/domain/demo/fixtures';
try{
 const rows=await db.auditLog.findMany({where:{entity:'DEMO_RUN',actorId:'DEMO-V2-ACTOR'},orderBy:{createdAt:'desc'}});
 const run=rows.map(r=>r.result as unknown as DemoRun).find(r=>r?.version===2&&r.status==='READY');
 if(run){await mkdir('storage/demo',{recursive:true});await writeFile('storage/demo/latest.json',JSON.stringify({run},null,2));
  await writeFile('storage/demo/LUOT-HIEN-TAI.md',['# Lượt demo '+run.id,'','Tài khoản ShopVui: `'+run.buyer.username+'`','Mật khẩu: DEMO_BUYER_PASSWORD nếu có; mặc định công khai `DemoShop2026`.','',...run.cases.map(c=>'- **'+c.key+' — '+c.title+'**: '+c.path+' — '+c.expected),'','Chỉ mô phỏng. SePay tiền thật bị khóa khi OMS_DEMO_MODE=1.'].join('\n'));
  console.log('Hướng dẫn lượt hiện hành:',run.id,'storage/demo/LUOT-HIEN-TAI.md');
 }else console.log('Chưa có lượt demo READY; không tự thay đổi dữ liệu.');
}finally{await db.$disconnect();}

// Container entrypoint: apply migrations, load sample data only into an empty DB, then serve OMS.
import {spawnSync, spawn} from 'node:child_process';
import pg from 'pg';
import {assertDeploymentConfig} from './config.mjs';
assertDeploymentConfig();

const run = (label, cmd, args) => {
  console.log(`\n[EZMART] ${label}…`);
  const r = spawnSync(cmd, args, {stdio: 'inherit',env:label.includes('Chuẩn bị lượt')?{...process.env,OMS_PUBLIC_DEPLOYMENT:'0',OMS_DEMO_REAL_BANK:'0'}:process.env});
  if (r.status !== 0) {console.error(`[EZMART] Lỗi ở bước: ${label}`); process.exit(r.status ?? 1);}
};

run('Tạo/cập nhật bảng (prisma migrate deploy)', 'node', ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);

const client = new pg.Client({connectionString: process.env.DATABASE_URL});
await client.connect();
const accounts = (await client.query('SELECT count(*)::int AS n FROM "TAI_KHOAN"')).rows[0].n;
// seed-realistic writes this marker; checking it separately lets a half-finished first run resume.
const realistic = (await client.query(`SELECT 1 FROM "NHAT_KY" WHERE "commandKey" = 'seed-realistic-v1'`)).rowCount > 0;
const demoFoundation=(await client.query(`SELECT 1 FROM "NHAT_KY" WHERE "commandKey"='seed-demo-foundation-v2'`)).rowCount>0;
const demoReady=(await client.query(`SELECT 1 FROM "NHAT_KY" WHERE "doi_tuong"='DEMO_RUN' AND result->>'status'='READY'`)).rowCount>0;
await client.end();

if (accounts === 0) run('Nạp tài khoản, kho, sản phẩm mẫu', 'npm', ['run', 'db:seed']);
if(process.env.OMS_DEMO_MODE==='1'){
 if(!demoReady&&(accounts===0||demoFoundation))run('Chuẩn bị lượt DOM/RMA demo lặp lại', 'npm', ['run','demo:prepare','--','--container-initial']);
 else console.log('\n[EZMART] Dữ liệu demo được giữ nguyên. SePay thật chỉ bật khi được cấu hình riêng.');
}else if (!realistic) run('Nạp đơn hàng, hàng hoàn mẫu', 'npm', ['run', 'db:seed-realistic']);
if (accounts > 0 && (realistic||demoReady)) console.log('\n[EZMART] DB đã có dữ liệu — không nạp lại dữ liệu mẫu.');
if(process.env.OMS_DEMO_MODE==='1')run('Cập nhật hướng dẫn từ lượt demo hiện hành', 'node', ['node_modules/tsx/dist/cli.mjs','scripts/demo-status.ts']);

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3001'], {stdio: 'inherit'});
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));

// Announce readiness once the app answers, so users know when to open the browser.
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch('http://127.0.0.1:3001/api/health');
    if (r.ok) {
      const pw = process.env.BOOTSTRAP_PASSWORD === 'OmsDemo@2026' ? 'OmsDemo@2026' : '(BOOTSTRAP_PASSWORD trong .env)';
      console.log(`\n[EZMART] ===== SẴN SÀNG =====\n[EZMART] EZMART:     http://127.0.0.1:3001   (đăng nhập: quanly / ${pw})\n[EZMART] ShopVui: http://127.0.0.1:8000   (chọn Đăng Ký: ví mô phỏng 6.000.000đ/tài khoản mới)\n`);
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

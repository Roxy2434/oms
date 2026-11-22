// Container entrypoint: apply migrations, load sample data only into an empty DB, then serve OMS.
import {spawnSync, spawn} from 'node:child_process';
import pg from 'pg';

const run = (label, cmd, args) => {
  console.log(`\n[EZMART] ${label}…`);
  const r = spawnSync(cmd, args, {stdio: 'inherit'});
  if (r.status !== 0) {console.error(`[EZMART] Lỗi ở bước: ${label}`); process.exit(r.status ?? 1);}
};

run('Tạo/cập nhật bảng (prisma migrate deploy)', 'npx', ['prisma', 'migrate', 'deploy']);

const client = new pg.Client({connectionString: process.env.DATABASE_URL});
await client.connect();
const accounts = (await client.query('SELECT count(*)::int AS n FROM "TAI_KHOAN"')).rows[0].n;
// seed-realistic writes this marker; checking it separately lets a half-finished first run resume.
const realistic = (await client.query(`SELECT 1 FROM "NHAT_KY" WHERE "commandKey" = 'seed-realistic-v1'`)).rowCount > 0;
await client.end();

if (accounts === 0) run('Nạp tài khoản, kho, sản phẩm mẫu', 'npm', ['run', 'db:seed']);
if (!realistic) run('Nạp đơn hàng, hàng hoàn mẫu', 'npm', ['run', 'db:seed-realistic']);
if (accounts > 0 && realistic) console.log('\n[EZMART] DB đã có dữ liệu — không nạp lại dữ liệu mẫu.');

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3001'], {stdio: 'inherit'});
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));

// Announce readiness once the app answers, so users know when to open the browser.
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch('http://127.0.0.1:3001/api/health');
    if (r.ok) {
      const pw = process.env.BOOTSTRAP_PASSWORD === 'OmsDemo@2026' ? 'OmsDemo@2026' : '(BOOTSTRAP_PASSWORD trong .env)';
      console.log(`\n[EZMART] ===== SẴN SÀNG =====\n[EZMART] EZMART:     http://127.0.0.1:3001   (đăng nhập: quanly / ${pw})\n[EZMART] ShopVui: http://127.0.0.1:8000   (khách mẫu: demo / Demo1234)\n`);
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

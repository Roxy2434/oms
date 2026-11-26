// Runs during `vercel-build`: applies Prisma migrations to Neon and seeds initial accounts/catalog/17 demo cases ONLY when DB is empty.
import { spawnSync } from 'node:child_process';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.log('[vercel-db-init] DATABASE_URL not set; skipping database migration/seed.');
  process.exit(0);
}

// Neon pooled URLs (-pooler.) use PgBouncer transaction mode; derive direct URL automatically for schema migrations.
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL.replace('-pooler.', '.');

function run(label, cmd, args, extraEnv = {}) {
  console.log(`\n[vercel-db-init] ${label}…`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (res.status !== 0) {
    console.error(`[vercel-db-init] Failed at step: ${label}`);
    process.exit(res.status ?? 1);
  }
}

run(
  'Applying Prisma migrations (migrate deploy)',
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  {
    DATABASE_URL: directUrl,
    PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1',
  },
);

const client = new pg.Client({ connectionString: directUrl });
await client.connect();
const { rows } = await client.query('SELECT count(*)::int AS n FROM "TAI_KHOAN"');
const accountCount = rows[0]?.n ?? 0;
await client.end();

if (accountCount === 0) {
  const bootstrapEnv = {
    DATABASE_URL: directUrl,
    BOOTSTRAP_PASSWORD: process.env.BOOTSTRAP_PASSWORD || 'Ezmart@2026Admin',
    SESSION_SECRET: process.env.SESSION_SECRET || 'vercel-classroom-default-session-secret-please-set-in-env-012345',
    OMS_DEMO_MODE: '1',
    OMS_PUBLIC_DEPLOYMENT: '0',
    OMS_DEMO_REAL_BANK: '0',
  };
  run('Seeding initial staff accounts, 3 warehouses, and 10 EZMART SKUs', process.execPath, ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], bootstrapEnv);
  run(
    'Preparing 17 DOM/RMA/Report/ShopVui live cases + classroom stock buffer',
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      '-e',
      `import { prepareDemo } from './src/domain/demo/fixtures.ts';
       import { db } from './src/server/db.ts';
       import { receiveStock } from './src/domain/inventory/service.ts';
       const r = await prepareDemo();
       const inv = await db.inventory.findMany({ include: { warehouse: true, sku: true } });
       let i = 0;
       for (const row of inv) {
         if (!row.warehouse.active || !row.sku.active) continue;
         const avail = row.sellable - row.reserved - row.safety;
         if (avail < 80) {
           i++;
           await receiveStock('QL-01', 'vercel-init-topup-' + row.warehouseId + '-' + row.skuId, {
             warehouseId: row.warehouseId,
             skuId: row.skuId,
             quantity: 80 - avail,
             reason: 'Nhập bổ sung tồn kho đầu kỳ phục vụ bán hàng đa kênh',
           });
         }
       }
       console.log('[vercel-db-init] Demo cases ready:', r.run.cases.length, '| Stock rows topped up:', i);
       await db.$disconnect();`,
    ],
    bootstrapEnv,
  );
} else {
  console.log(`[vercel-db-init] Database already initialized (${accountCount} staff accounts); preserving existing data.`);
}

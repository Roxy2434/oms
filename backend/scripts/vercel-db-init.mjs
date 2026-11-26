// Runs during `vercel-build`: applies Prisma migrations to Neon and seeds base staff accounts/warehouses/SKUs ONLY when DB has 0 accounts.
// Heavy multi-order live-case seeding (`prepareDemo`) runs in the `sin1` (Singapore) runtime (`1ms` RTT to Neon) instead of the `iad1` (US East) build container (`260ms` RTT).
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
const { rows: accRows } = await client.query('SELECT count(*)::int AS n FROM "TAI_KHOAN"');
const accountCount = accRows[0]?.n ?? 0;
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
  run(
    'Seeding initial staff accounts, 3 warehouses, and 10 EZMART SKUs',
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'],
    bootstrapEnv,
  );
} else {
  console.log(`[vercel-db-init] Schema ready and staff accounts present (${accountCount} accounts).`);
}

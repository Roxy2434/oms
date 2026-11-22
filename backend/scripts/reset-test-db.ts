// Wipes and re-migrates the TEST database oms_test only (tests leave their fixtures behind; lists capped at 500 rows fill up).
// Guarded: refuses unless the target is exactly 127.0.0.1:55432/oms_test. The main database `oms` is never touched.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const url=new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55432');
url.pathname='/oms_test';
assert.equal(url.pathname,'/oms_test');
const r=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','reset','--force'],{stdio:'inherit',env:{...process.env,DATABASE_URL:url.toString()}});
process.exit(r.status??1);

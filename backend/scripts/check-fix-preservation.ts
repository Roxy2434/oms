import 'dotenv/config';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {expectedBusinessTables} from './helpers/schema-tables';
import {db} from '../src/server/db';
const dir='artifacts/qa/audit-fixes';
assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/oms','Read-only live integrity check must target the owned oms database');
try{
 const tables=await db.$queryRaw<{tablename:string}[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename`;
 assert.deepEqual(tables.map(t=>t.tablename).sort(),await expectedBusinessTables());const snapshot:Record<string,{rows:number;sha256:string}>={};
 for(const {tablename}of tables){assert(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tablename));const rows=await db.$queryRawUnsafe<{payload:unknown}[]>(`SELECT to_jsonb(t) AS payload FROM "${tablename}" t`);const values=rows.map(r=>JSON.stringify(r.payload)).sort();snapshot[tablename]={rows:values.length,sha256:createHash('sha256').update(values.join('\n')).digest('hex')};}
 await mkdir(dir,{recursive:true});const after=process.argv.includes('--after');if(after){const before=JSON.parse(await readFile(dir+'/live-before.json','utf8'));assert.deepEqual(snapshot,before,'Live business data changed during checks; investigate before claiming preservation');}
 await writeFile(dir+(after?'/live-after.json':'/live-before.json'),JSON.stringify(snapshot,null,2));console.log(after?`PASS all ${tables.length} live table counts + SHA256 unchanged`:`Captured ${tables.length} live table counts + SHA256, no data/secrets exported`);
}finally{await db.$disconnect();}

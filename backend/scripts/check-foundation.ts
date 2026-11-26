import 'dotenv/config';
import {Client} from 'pg';
import {spawnSync} from 'node:child_process';
import {expectedBusinessTables} from './helpers/schema-tables';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,process.env.OMS_DB_PORT||'55432');assert.equal(url.pathname,'/oms');
const main=new Client({connectionString:url.toString()});await main.connect();
try{const exists=await main.query("SELECT 1 FROM pg_database WHERE datname='oms_test'");if(!exists.rowCount)await main.query('CREATE DATABASE oms_test');}finally{await main.end();}
url.pathname='/oms_test';const test=new Client({connectionString:url.toString()});await test.connect();try{const count=await test.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'");if(count.rows[0].n!==0){const migrations=await test.query('SELECT count(*)::int n FROM _prisma_migrations WHERE finished_at IS NOT NULL');assert(migrations.rows[0].n>=2,'Existing test DB must have the base migrations; deploy applies additive migrations below.');}else console.log('Test DB initially empty');}finally{await test.end();}
const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});assert.equal(migration.status,0,migration.stderr);console.log(migration.stdout);
const verify=new Client({connectionString:url.toString()});await verify.connect();let tables:string[]=[];try{const result=await verify.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename");tables=result.rows.map(r=>r.tablename);assert.deepEqual([...tables].sort(),await expectedBusinessTables());const constraints=await verify.query("SELECT count(*)::int n FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace");assert(constraints.rows[0].n>0);}finally{await verify.end();}
const sources={schema:'prisma/schema.prisma',referenceFilesRequired:false};
let appHealth:number|null=null;if(process.argv.includes('--check-live')){const response=await fetch((process.env.APP_ORIGIN??'http://127.0.0.1:3001')+'/login');assert.equal(response.status,200);appHealth=response.status;}await mkdir('artifacts/qa',{recursive:true});await writeFile('artifacts/qa/foundation.json',JSON.stringify({at:new Date().toISOString(),node:process.version,sources,testDatabase:'oms_test',tables,appHealth},null,2));console.log(`PASS dedicated test DB, ${tables.length} schema-matched business tables and constraints; no DB dropped/reset. Live HTTP checked only with --check-live.`);

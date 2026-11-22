"""Round-trip oms_test (default) or oms into a NEW restore DB; never overwrites a DB."""
from pathlib import Path
import argparse, subprocess, time, json, datetime, re

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--database',choices=['oms_test','oms'],default='oms_test');source=p.parse_args().database
out=root/'artifacts/qa/backup';out.mkdir(parents=True,exist_ok=True)
stamp=datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
target=('oms_restore_handover_' if source=='oms' else 'oms_restore_test_')+stamp
base=['docker','compose','exec','-T','db']
def run(args,**kw):
    return subprocess.run(base+args,cwd=root,check=True,**kw)
def snapshot(database):
    query="SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename"
    tables=run(['psql','-U','oms','-d',database,'-Atc',query],capture_output=True,text=True).stdout.splitlines()
    result={}
    for table in tables:
        assert table.replace('_','').isalnum()
        query='SELECT count(*), md5(COALESCE(string_agg(to_jsonb(t)::text, chr(10) ORDER BY to_jsonb(t)::text), \'\')) FROM "'+table+'" t'
        count,fingerprint=run(['psql','-U','oms','-d',database,'-Atc',query],capture_output=True,text=True).stdout.strip().split('|')
        result[table]={'rows':int(count),'contentMd5':fingerprint}
    return result
expected=set(re.findall(r'@@map\("([A-Z_]+)"\)',(root/'prisma/schema.prisma').read_text(encoding='utf-8')))
def sequences(database):
    query="SELECT json_agg(x ORDER BY sequencename) FROM (SELECT sequencename,start_value,min_value,max_value,increment_by,cycle,last_value FROM pg_sequences WHERE schemaname='public') x"
    return json.loads(run(['psql','-U','oms','-d',database,'-Atc',query],capture_output=True,text=True).stdout.strip() or 'null')
start=time.perf_counter();before=snapshot(source);before_sequences=sequences(source);assert set(before)==expected, 'Database tables do not match the current Prisma schema'
archive=out/(source+'_'+stamp+'.dump')
with archive.open('wb') as f:run(['pg_dump','-U','oms','-d',source,'-Fc'],stdout=f)
run(['createdb','-U','oms',target])
with archive.open('rb') as f:run(['pg_restore','-U','oms','-d',target,'--exit-on-error'],stdin=f)
after=snapshot(target);assert before==after,'Counts or row contents differ after restore'
after_sequences=sequences(target);assert before_sequences==after_sequences,'Document sequences differ after restore'
invalid=run(['psql','-U','oms','-d',target,'-Atc',"SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated"],capture_output=True,text=True).stdout.strip();assert invalid=='0'
report={'source':source,'restoredDatabase':target,'archive':str(archive),'tables':after,'seconds':round(time.perf_counter()-start,3),'allContentsMatch':True,'allConstraintsValidated':True,'sequencesMatch':True,'sequences':after_sequences,'note':f'No existing database overwritten; all {len(after)} current tables/counts/row-content fingerprints/FK constraints verified; application DATABASE_URL unchanged.'}
(out/('handover-result.json' if source=='oms' else 'result.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))

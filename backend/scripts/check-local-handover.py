"""Operator-requested local P8 verification. Restarts only the owned app + optional OMS DB."""
from pathlib import Path
import argparse, datetime, json, shutil, subprocess, tempfile, time, urllib.request

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--restart-db',action='store_true');args=p.parse_args()
out=root/'artifacts/qa/final-acceptance';out.mkdir(parents=True,exist_ok=True)
def run(command,check=True):
    result=subprocess.run(command,cwd=root,capture_output=True,text=True)
    if check and result.returncode:raise RuntimeError('Command failed: '+str(command)+'\n'+result.stdout+'\n'+result.stderr)
    return result

def other_containers():
    own=run(['docker','compose','ps','-q','db']).stdout.strip()
    ids=run(['docker','ps','-q','--no-trunc']).stdout.splitlines()
    result={}
    for cid in ids:
        if own and (cid.startswith(own) or own.startswith(cid)):continue
        record=json.loads(run(['docker','inspect',cid]).stdout)[0]
        result[cid]={'name':record['Name'],'status':record['State']['Status'],'startedAt':record['State']['StartedAt']}
    return result

before_others=other_containers();pid_file=root/'storage/runtime/production.pid';old_pid=pid_file.read_text().strip()
occupied=run(['python','scripts/start-local.py'],check=False)
assert occupied.returncode and 'Port 3001 is occupied' in occupied.stdout+occupied.stderr
assert pid_file.read_text().strip()==old_pid
rejected=run(['python','scripts/backup-local.py','--restore-file','nonexistent.dump','--new-database','oms'],check=False)
assert rejected.returncode and 'never overwritten' in rejected.stdout+rejected.stderr
# Exercise stop's foreign-command refusal without touching the actual app PID file.
with tempfile.TemporaryDirectory(prefix='oms-stop-guard-') as tmp:
    isolated=Path(tmp);(isolated/'scripts').mkdir();(isolated/'storage/runtime').mkdir(parents=True)
    shutil.copy(root/'scripts/stop-local.py',isolated/'scripts/stop-local.py')
    child=subprocess.Popen(['node','-e','setTimeout(()=>{},60000)'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        (isolated/'storage/runtime/production.pid').write_text(str(child.pid))
        refused=run(['python',str(isolated/'scripts/stop-local.py')],check=False)
        assert refused.returncode and child.poll() is None,'Stop must reject a foreign command line even with a PID file'
    finally:
        child.terminate();child.wait(timeout=10)

run(['python','scripts/stop-local.py'])
build=run(['cmd','/c','npm','run','build']);(out/'production-build.log').write_text(build.stdout+build.stderr,encoding='utf-8')
if args.restart_db:
    run(['docker','compose','restart','db'])
    deadline=time.monotonic()+40
    while time.monotonic()<deadline:
        if run(['docker','compose','exec','-T','db','pg_isready','-U','oms','-d','oms'],check=False).returncode==0:break
        time.sleep(.5)
    else:raise RuntimeError('Owned OMS database did not become ready')
started=run(['python','scripts/start-local.py']);print(started.stdout.strip())
new_pid=pid_file.read_text().strip();assert new_pid!=old_pid
with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=3) as response:health=json.load(response)
assert health['app']=='ok' and health['database']=='ok'
after_others=other_containers();assert before_others==after_others,'An unrelated container changed during handover; investigate'
report={'runAt':datetime.datetime.now().isoformat(),'occupiedPortRefusedWithoutStopping':True,'foreignPidCommandRefused':True,'restoreLiveTargetRefused':True,'productionBuild':True,'oldPid':old_pid,'newPid':new_pid,'ownedDatabaseRestarted':args.restart_db,'health':health,'noSeedCommandsExecuted':True,'unrelatedContainersUnchanged':after_others,'note':'Data fingerprints checked separately with check-live-fingerprint.ts --after; no existing restore target overwritten.'}
(out/'handover-runtime.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('PASS production build, owned app/DB restart, start/stop/restore safety guards, health and unrelated container preservation. No seed.')

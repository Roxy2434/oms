"""Explicit operator command: backup, stop owned local app, prepare a fresh demo round, restart with real bank disabled."""
from pathlib import Path
import os,sys,shutil,subprocess,json,urllib.request,socket
root=Path(__file__).resolve().parents[1]
choices=[os.environ.get('OMS_NODE'),shutil.which('node')]
if os.name=='nt':
 for base,pattern in [(Path.home()/'.tools/node24','*/node.exe'),(Path.home()/'.pi/runtimes','node-v24*/node.exe'),(Path.home()/'.omo/runtimes','node-v24*/node.exe')]:choices.extend(str(p) for p in base.glob(pattern))
node=None
for candidate in choices:
 if not candidate:continue
 try:
  v=subprocess.check_output([candidate,'--version'],text=True).strip().lstrip('v');parts=tuple(map(int,v.split('.')))
  if parts>=(24,15,0) and parts[0]==24:node=str(Path(candidate).resolve());break
 except (OSError,ValueError,subprocess.CalledProcessError):pass
if not node:raise SystemExit('Can Node >=24.15 <25; dat OMS_NODE tro toi node.exe hop le. Khong cai/thay runtime toan may.')
env=os.environ.copy();env.update({'OMS_NODE':node,'OMS_DEMO_MODE':'1','SEPAY_POLL':'off','PATH':str(Path(node).parent)+os.pathsep+env.get('PATH','')})
def run(args):subprocess.run(args,cwd=root,env=env,check=True)
# A caller must not run this concurrently with E2E (same build, different DB but native process restarts).
s=socket.socket();busy=s.connect_ex(('127.0.0.1',3002))==0;s.close()
if busy:raise SystemExit('Cong test 3002 dang ban; dung kiem thu truoc khi chuan bi demo.')
run([node,'scripts/py.mjs','backup-local.py'])
run([node,'scripts/py.mjs','stop-local.py'])
try:run([node,'node_modules/tsx/dist/cli.mjs','scripts/prepare-demo.ts'])
except subprocess.CalledProcessError:raise SystemExit('Chuan bi THAT BAI; app giu dung, backup duoc giu. Khong tu reset/restore DB that. Xem loi va storage/demo truoc khi tiep tuc.')
run([node,'scripts/py.mjs','start-local.py'])
print('Demo san sang: http://127.0.0.1:8000/#/shop/oms ; huong dan: storage/demo/LUOT-HIEN-TAI.md ; SePay tien that TAT.')

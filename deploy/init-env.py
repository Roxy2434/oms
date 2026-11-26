"""Create private deploy/.env once. Never copy local bank credentials or overwrite an existing file."""
import argparse, os, re, secrets, subprocess
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--domain',required=True)
p.add_argument('--email',required=True)
p.add_argument('--no-captcha',action='store_true',help='Skip Turnstile requirement for closed classroom Wi-Fi demos')
p.add_argument('--output',type=Path,default=Path(__file__).resolve().parent/'.env')
a=p.parse_args()
if not re.fullmatch(r'(?=.{4,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}',a.domain) or '..' in a.domain: p.error('Use one domain, no scheme/port/path')
if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',a.email):p.error('Invalid email')
dest=a.output.resolve()
if dest.exists():p.error('Private .env already exists; not overwritten')
edge_password=secrets.token_urlsafe(32)
# Pass plaintext only over stdin, not host command arguments or console output.
r=subprocess.run(['docker','run','--rm','-i','--entrypoint','sh','caddy:2-alpine','-c','IFS= read -r p; exec caddy hash-password --plaintext "$p"'],input=(edge_password+'\n').encode('utf-8'),capture_output=True)
hashes=[s for s in r.stdout.decode('utf-8').splitlines() if s.startswith('$2')]
if r.returncode or not hashes:raise SystemExit('Could not generate Caddy hash; verify Docker/network. No env was written.')
values={'DOMAIN':a.domain,'ACME_EMAIL':a.email,'DB_ADMIN_PASSWORD':secrets.token_hex(32),'APP_DB_PASSWORD':secrets.token_hex(32),'SESSION_SECRET':secrets.token_hex(48),'BOOTSTRAP_PASSWORD':secrets.token_urlsafe(32),'STAFF_EDGE_USER':'operator','STAFF_EDGE_HASH':hashes[-1],'STAFF_EDGE_PASSWORD':edge_password,'OMS_CLASSROOM_MODE':'1','OMS_DISABLE_CAPTCHA':'1' if a.no_captcha else '0','TURNSTILE_SITEKEY':'','TURNSTILE_SECRET_KEY':'','OMS_DEMO_REAL_BANK':'0','SEPAY_API_TOKEN':'','SEPAY_ACCOUNT':'','SEPAY_BANK':'970422','SEPAY_HOLDER':'','SEPAY_REFUND_CONTACT':a.email,'SEPAY_START_ID':'','OPS_ALERT_URL':''}
fd=os.open(dest,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as f:
 for k,v in values.items():f.write(k+"='"+v+"'\n")
print('Created private config: '+str(dest)+' (values not printed). Set real Turnstile keys and bank settings privately before startup.')
print('Keep STAFF_EDGE_PASSWORD for the outer staff login; quanly uses BOOTSTRAP_PASSWORD. Never publish this file.')

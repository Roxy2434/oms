"""Start this project's built server only; preflight is read-only, never seeds or migrates."""
from pathlib import Path
import json, re, socket, subprocess, time, urllib.request, os, shutil

root = Path(__file__).resolve().parents[1]
runtime = root / 'storage/runtime'
runtime.mkdir(parents=True, exist_ok=True)
s = socket.socket()
try:
    if s.connect_ex(('127.0.0.1', 3001)) == 0:
        raise SystemExit('Port 3001 is occupied; no process was stopped.')
finally:
    s.close()
if not (root / '.next/BUILD_ID').exists():
    raise SystemExit('Run npm run build first.')
node = os.environ.get('OMS_NODE', 'node')
resolved = shutil.which(node)
if not resolved:raise SystemExit('Node not found. Install Node 24.15 or set OMS_NODE to its node executable path.')
child_env = os.environ.copy()
child_env['PATH'] = str(Path(resolved).parent) + os.pathsep + child_env.get('PATH', '')
version = subprocess.run([resolved, '--version'], capture_output=True, text=True, check=True).stdout.strip()
match = re.fullmatch(r'v(\d+)\.(\d+)\.(\d+)', version)
if not match or not (tuple(map(int, match.groups())) >= (24, 15, 0) and int(match[1]) < 25):
    raise SystemExit('This local build requires Node >=24.15.0 and <25.')
try:
    database = subprocess.run(['docker', 'compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'oms', '-d', 'oms'], cwd=root, capture_output=True, timeout=15)
    if database.returncode:
        raise SystemExit('Owned OMS database is unavailable. Start Docker Desktop, then docker compose up -d db. Nothing was seeded or migrated.')
    migrations = subprocess.run([resolved, str(root / 'node_modules/prisma/build/index.js'), 'migrate', 'status'], cwd=root, env=child_env, capture_output=True, timeout=30)
    if migrations.returncode:
        raise SystemExit('Migration status is not clean. Check database/config and run npm run db:migrate explicitly if required. No server started.')
except (subprocess.TimeoutExpired, FileNotFoundError):
    raise SystemExit('Preflight could not verify Node/Docker/database/migrations. No server started.')
# Detach from the calling terminal so closing it does not kill the server: Windows process flags, or a new session on macOS/Linux.
detach = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS | subprocess.CREATE_BREAKAWAY_FROM_JOB} if os.name == 'nt' else {'start_new_session': True}
with (runtime / 'production.log').open('ab') as log:
    process = subprocess.Popen([resolved, str(root / 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3001'], cwd=root, env=child_env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, close_fds=True, **detach)
pid_file = runtime / 'production.pid'
pid_file.write_text(str(process.pid))
healthy = False
try:
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline and process.poll() is None:
        try:
            with urllib.request.urlopen('http://127.0.0.1:3001/api/health', timeout=1) as response:
                health = json.load(response)
                healthy = response.status == 200 and health.get('app') == 'ok' and health.get('database') == 'ok'
        except (OSError, ValueError):
            pass
        if healthy:
            break
        time.sleep(.25)
finally:
    if not healthy:
        # Popen handle is this invocation's child, never a process selected just by port.
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
        if pid_file.exists() and pid_file.read_text().strip() == str(process.pid):
            pid_file.unlink()
if not healthy:
    raise SystemExit('OMS did not become app+DB healthy; owned child stopped. See storage/runtime/production.log. Other projects unchanged.')
print('OMS production PID', process.pid, 'http://127.0.0.1:3001; Node/DB/migrations/app health verified; no seed.')

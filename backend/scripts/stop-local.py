"""Stop only the OMS server recorded by start-local.py, after checking its command line."""
from pathlib import Path
import os, re, signal, subprocess, time
root=Path(__file__).resolve().parents[1]
file=root/'storage/runtime/production.pid'
if not file.exists():raise SystemExit('No owned OMS PID file; nothing stopped.')
pid=int(file.read_text().strip())
expected=str(root/'node_modules/next/dist/bin/next')
if os.name=='nt':
    quoted=expected.replace("'","''")
    script=f"$p=Get-CimInstance Win32_Process -Filter 'ProcessId={pid}'; if (!$p) {{ exit 0 }}; if ($p.Name -ne 'node.exe' -or $p.CommandLine -notmatch [regex]::Escape('{quoted}') -or $p.CommandLine -notmatch '--port\\s+3001(?:\\s|$)' -or $p.CommandLine -notmatch 'next[\" ]+start') {{ throw 'PID is not the owned OMS production server; refused to stop.' }}; taskkill /PID {pid} /T /F; exit $LASTEXITCODE"
    subprocess.run(['powershell','-NoProfile','-Command',script],check=True)
else:
    ps=subprocess.run(['ps','-o','command=','-p',str(pid)],capture_output=True,text=True)
    cmd=ps.stdout.strip()
    if cmd:
        # Same ownership checks as Windows: our project's next binary, `start`, port 3001.
        if expected not in cmd or not re.search(r'next\s+start',cmd) or not re.search(r'--port\s+3001(\s|$)',cmd):
            raise SystemExit('PID is not the owned OMS production server; refused to stop.')
        os.killpg(pid,signal.SIGTERM)  # start-local.py made it a session/group leader
        for _ in range(40):
            if subprocess.run(['ps','-p',str(pid)],capture_output=True).returncode:break
            time.sleep(.25)
        else:os.killpg(pid,signal.SIGKILL)
file.unlink(missing_ok=True)
print('Owned OMS server stopped; database and other projects unchanged.')

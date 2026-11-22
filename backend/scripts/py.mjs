// Runs a Python helper with the interpreter each OS ships: `python` on Windows, `python3` on macOS/Linux.
import {spawnSync} from 'node:child_process';
const [script, ...args] = process.argv.slice(2);
const python = process.env.OMS_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const r = spawnSync(python, [`scripts/${script}`, ...args], {stdio: 'inherit'});
if (r.error) {console.error(`Không chạy được ${python}: ${r.error.message}. Cài Python 3 hoặc đặt OMS_PYTHON.`); process.exit(1);}
process.exit(r.status ?? 1);

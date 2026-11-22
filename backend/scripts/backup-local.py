"""Backup oms (default) or oms_test; restore only into a NEW oms_restore_* database."""
from pathlib import Path
import argparse,subprocess,datetime,re,tempfile,os
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--database',choices=['oms','oms_test'],default='oms');p.add_argument('--restore-file',type=Path);p.add_argument('--new-database');args=p.parse_args()
base=['docker','compose','exec','-T','db']
if args.restore_file:
    if not args.new_database or not re.fullmatch(r'oms_restore_[a-z0-9_]{1,40}',args.new_database):raise SystemExit('Restore target must be a NEW oms_restore_* name; oms/oms_test are never overwritten.')
    source=args.restore_file.resolve(strict=True)
    subprocess.run(base+['createdb','-U','oms',args.new_database],cwd=root,check=True)
    with source.open('rb') as f:subprocess.run(base+['pg_restore','-U','oms','-d',args.new_database,'--exit-on-error'],cwd=root,stdin=f,check=True)
    print('Restored into',args.new_database,'; active application database was not changed.')
else:
    dest=root/'storage/backups';dest.mkdir(parents=True,exist_ok=True)
    target=dest/(args.database+'_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')+'.dump')
    subprocess.run(base+['pg_isready','-U','oms','-d',args.database],cwd=root,check=True,stdout=subprocess.DEVNULL)
    temporary=None
    try:
        with tempfile.NamedTemporaryFile(dir=dest,suffix='.partial',delete=False) as f:
            temporary=Path(f.name)
            subprocess.run(base+['pg_dump','-U','oms','-d',args.database,'-Fc'],cwd=root,stdout=f,check=True)
        os.replace(temporary,target)
    finally:
        if temporary and temporary.exists():temporary.unlink()
    print('Backup saved:',target)

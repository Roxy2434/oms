"""Build the deterministic handover ZIP in the user-facing layout:

    backend/  frontend/  docs/  .env.example  .gitignore  README.md  docker-compose.yml

Never includes .env, databases, generated dependencies, logs, traces, or historical demo recordings.
"""
from pathlib import Path
import argparse, hashlib, json, zipfile

ROOT=Path(__file__).resolve().parents[2]  # repo root: backend/ frontend/ docs/ + release files
APP=ROOT/'backend'
# Root of the ZIP: files written for end users, kept at the repo root.
RELEASE_FILES={'README.md','docker-compose.yml','.env.example','.gitignore'}
# backend/: everything needed to build, run, develop and test the Next.js app.
APP_FILES={'package.json','package-lock.json','tsconfig.json','next.config.ts','prisma.config.ts','eslint.config.mjs','playwright.config.ts','.nvmrc','.env.example','Dockerfile','.dockerignore','compose.yaml'}
APP_DIRS={'src','prisma','scripts','tests','docker'}
# docs/: what a reader of the project needs; internal audit logs and working notes stay in the repo.
DOCS={'DESIGN.md','requirements.md','data-model.md','dom-rma.bpmn','checkout-flow.md','financial-cases.md','demo.md','HANDOVER.md','test-report.md','final-acceptance.md','ke-hoach-xay-dung-oms.docx'}
SUFFIXES={'.ts','.tsx','.js','.mjs','.css','.html','.json','.sql','.prisma','.toml','.py','.md','.bpmn','.docx','.webp','.png','.jpg','.jpeg','.svg','.woff','.woff2'}
BLOCK_PARTS={'node_modules','.next','.git','generated','__pycache__','storage','artifacts','test-results','playwright-report'}
BLOCK_SUFFIXES={'.dump','.zip','.log','.pyc','.tsbuildinfo','.pem','.key','.p12','.mp4','.webm'}

def ok(p:Path)->bool:
    rel=p.relative_to(ROOT)
    if not p.is_file() or p.is_symlink() or any(x in BLOCK_PARTS for x in rel.parts):return False
    if p.suffix.lower() in BLOCK_SUFFIXES:return False
    if rel.parts[:2]==('backend','scripts') and p.name.startswith(('demo-','record-')):return False
    return p.resolve().is_relative_to(ROOT.resolve())

def files(root=ROOT):
    """Yield (source path, archive name)."""
    for name in sorted(RELEASE_FILES):
        p=root/name
        if p.is_file():yield p,name
    for name in sorted(APP_FILES):
        p=root/'backend'/name
        if p.is_file() and ok(p):yield p,'backend/'+name
    for d in sorted(['backend/'+x for x in APP_DIRS]+['frontend']):
        for p in sorted((root/d).rglob('*')):
            if ok(p) and p.suffix.lower() in SUFFIXES and not p.name.startswith('.env'):
                yield p,p.relative_to(root).as_posix()
    for name in sorted(DOCS):
        p=root/'docs'/name
        if p.is_file():yield p,'docs/'+name

def private_values():
    env=APP/'.env'
    if not env.exists():return []
    sensitive={'DB_PASSWORD','SESSION_SECRET','BOOTSTRAP_PASSWORD','SEPAY_API_TOKEN','SEPAY_ACCOUNT'}
    result=[]
    for line in env.read_text(encoding='utf-8-sig').splitlines():
        if '=' not in line or line.lstrip().startswith('#'):continue
        key,value=line.split('=',1);value=value.strip().strip('\"\'')
        if key.strip() in sensitive and len(value)>=8:result.append((key.strip(),value.encode()))
    return result

def verify(path, secrets=(), expected=None):
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        assert len(names)==len(set(names)), 'Duplicate archive entry'
        if expected is not None:assert set(names)==set(expected), 'Unexpected archive entries'
        for name in names:
            p=Path(name)
            assert not p.is_absolute() and '..' not in p.parts and ':' not in name
            assert not any(x in BLOCK_PARTS for x in p.parts)
            assert not p.name.startswith('.env') or p.name=='.env.example', 'Private env file: '+name
            data=z.read(name)
            if expected is not None:assert hashlib.sha256(data).hexdigest()==expected[name], 'Content mismatch: '+name
            for key,value in secrets:
                assert value not in data, 'Private value detected in '+name+' ('+key+'; value withheld)'
        top={n.split('/')[0] for n in names}
        assert top=={'backend','frontend','docs','README.md','docker-compose.yml','.env.example','.gitignore'}, 'Unexpected top level: '+str(sorted(top))
        for need in ('backend/Dockerfile','backend/docker/start.mjs','backend/prisma/schema.prisma','frontend/index.html','frontend/assets/js/core/oms.js'):
            assert need in names, 'Missing '+need
        assert any(n.startswith('backend/prisma/migrations/20261113190000_dom_routing/') for n in names)
        return {'entries':len(names),'secretScan':'PASS current configured private values absent','secretValuesCompared':len(secrets),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=APP/'artifacts/release/oms-source.zip');p.add_argument('--verify',type=Path);args=p.parse_args()
    secrets=private_values()
    if args.verify:print(json.dumps(verify(args.verify,secrets),indent=2));return
    dest=args.output.resolve();dest.parent.mkdir(parents=True,exist_ok=True)
    selected=list(files());expected={name:hashlib.sha256(src.read_bytes()).hexdigest() for src,name in selected}
    assert len(expected)==len(selected), 'Two sources map to one archive name'
    # Validate before publishing. Failed scans never leave a final handover archive.
    temporary=dest.with_suffix('.partial')
    try:
        with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED) as z:
            for src,name in selected:
                info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,src.read_bytes())
        result=verify(temporary,secrets,expected);temporary.replace(dest)
    finally:
        if temporary.exists():temporary.unlink()
    print(json.dumps({'archive':str(dest),**result},indent=2))
if __name__=='__main__':main()

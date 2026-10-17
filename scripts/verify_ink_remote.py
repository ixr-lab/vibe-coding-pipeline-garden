"""Read exact pushed ink revision and anonymous files; no account/visibility mutation."""
import argparse,subprocess,json,base64,pathlib,datetime,hashlib,urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT=pathlib.Path(__file__).resolve().parents[1];REPO='ixr-lab/vibe-coding-pipeline-garden'
parser=argparse.ArgumentParser();parser.add_argument('--max-version',type=int,default=14);parser.add_argument('--output',type=pathlib.Path,default=ROOT.parent/'remote-ink-final.json');args=parser.parse_args()
assert 12<=args.max_version<=30
def run(*a):return subprocess.check_output(a,cwd=ROOT)
def api(path):return json.loads(run('gh','api',path))
head=run('git','rev-parse','HEAD').decode().strip();meta=api('repos/'+REPO);remote=api('repos/'+REPO+'/commits/main')
assert meta['private'] is False and meta['visibility']=='public' and not meta['disabled'] and remote['sha']==head
refs={line.split()[1]:line.split()[0] for line in run('git','ls-remote','--heads','--tags','origin').decode().splitlines()}
expected={'refs/heads/main'}|{'refs/tags/v'+str(i) for i in range(args.max_version+1)}
assert set(refs)==expected,'unexpected remote ref; inspect explicitly'
assert not api('repos/'+REPO+'/releases'),'unexpected release asset; inspect explicitly'
paths=['README.md','index.html','styles.css','garden.js','engine.js','flower-art.js','ink-palette.js','plant-renderer.js','petal-paint.js','brush-art.js','reference.html','reference-page.js','reference-data.js','reference-source/ink-paintings.json','scripts/build_references.py','scripts/ink_checks.py','scripts/ink_accessibility.py','docs/ink/plan.md','docs/ink/log.md','docs/ink/comparison.md','docs/ink/tests.md','docs/ink/reproduce.md','docs/ink/eight-stages.md','docs/ink/reference-observations.md','evidence/ink/v12-capture.json','evidence/ink/v13-capture.json',f'evidence/ink/v{args.max_version}-capture.json',f'evidence/ink/v{args.max_version}-garden.png','evidence/ink/before-after.png']
def compare(path):
    item=api('repos/'+REPO+'/contents/'+path+'?ref='+head)
    blob=item if item.get('encoding')=='base64' else api('repos/'+REPO+'/git/blobs/'+item['sha'])
    data=base64.b64decode(blob['content']);assert data==run('git','show','HEAD:'+path),path
    return {'path':path,'blob_sha':item['sha'],'bytes':len(data),'read_back_equal':True}
with ThreadPoolExecutor(max_workers=4) as pool:files=list(pool.map(compare,paths))
tags={}
for version in range(args.max_version+1):
    tag='v'+str(version);sha=api('repos/'+REPO+'/git/ref/tags/'+tag)['object']['sha'];assert sha==run('git','rev-parse',tag).decode().strip();tags[tag]=sha
anonymous=[]
for path in ['README.md','ink-palette.js',f'evidence/ink/v{args.max_version}-garden.png']:
    url='https://raw.githubusercontent.com/'+REPO+'/'+head+'/'+path
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Garden-example-verification'}),timeout=30) as response:data=response.read();status=response.status
    assert status==200 and data==run('git','show','HEAD:'+path)
    anonymous.append({'path':path,'url':url,'http_status':status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'matches_commit':True,'authorization_header':False})
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repository_url':meta['html_url'],'visibility':meta['visibility'],'private':meta['private'],'disabled':meta['disabled'],'commit':head,'remote_refs':refs,'release_count':0,'tags':tags,'files':files,'anonymous_fetches':anonymous}
args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'commit':head,'visibility':'public','files_read_back_equal':len(files),'tags':len(tags),'anonymous_fetches':len(anonymous)}))

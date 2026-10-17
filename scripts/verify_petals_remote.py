"""Read exact pushed revision with existing gh auth; optionally verify anonymous access.
No credential setup, visibility mutations or hosting operations.
"""
import argparse,subprocess,json,base64,pathlib,datetime,hashlib,urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT=pathlib.Path(__file__).resolve().parents[1];REPO='ixr-lab/vibe-coding-pipeline-garden'
parser=argparse.ArgumentParser();parser.add_argument('--visibility',choices=['private','public'],default='private');parser.add_argument('--output',type=pathlib.Path,default=ROOT.parent/'remote-petals-final.json');args=parser.parse_args()
def run(*a):return subprocess.check_output(a,cwd=ROOT)
def api(path):return json.loads(run('gh','api',path))
head=run('git','rev-parse','HEAD').decode().strip();meta=api('repos/'+REPO);remote=api('repos/'+REPO+'/commits/main')
assert meta['private']==(args.visibility=='private') and remote['sha']==head
remote_refs={line.split()[1]:line.split()[0] for line in run('git','ls-remote','--heads','--tags','origin').decode().splitlines()}
expected_refs={'refs/heads/main'}|{'refs/tags/v'+str(i) for i in range(12)}
assert set(remote_refs)==expected_refs,'unexpected publication ref; inspect before visibility change'
releases=api('repos/'+REPO+'/releases');assert not releases,'release assets require a separate publication audit'
paths=['README.md','index.html','garden.js','engine.js','flower-art.js','brush-art.js','petal-paint.js','plant-renderer.js','petal-study.html','petal-study.js','reference.html','reference-page.js','reference-data.js','reference-source/petals.json','scripts/build_references.py','scripts/petal_checks.py','docs/petals/log.md','docs/petals/comparison.md','docs/petals/tests.md','docs/petals/reproduce.md','docs/petals/publication-audit.md','evidence/petals/v11-checks.json','evidence/petals/final-checks.json','evidence/petals/reference-checks.json','evidence/petals/stress.json','evidence/petals/v11-large.png','evidence/petals/v11-basic.png','evidence/petals/v11-garden.png','evidence/petals/before-after.png']
def compare(path):
    item=api('repos/'+REPO+'/contents/'+path+'?ref='+head)
    blob=item if item.get('encoding')=='base64' else api('repos/'+REPO+'/git/blobs/'+item['sha'])
    data=base64.b64decode(blob['content']);local=run('git','show','HEAD:'+path);assert data==local,path
    return {'path':path,'blob_sha':item['sha'],'bytes':len(data),'read_back_equal':True}
with ThreadPoolExecutor(max_workers=4) as pool:files=list(pool.map(compare,paths))
tags={}
for version in range(12):
    tag='v'+str(version);sha=api('repos/'+REPO+'/git/ref/tags/'+tag)['object']['sha'];assert sha==run('git','rev-parse',tag).decode().strip();tags[tag]=sha
assert tags['v0']=='95283a8a251f7aea096b9dc9be23658575899da0'
assert tags['v1']=='e87cbf82616e6f6fb4b5cfd685276197e344cfa9'
assert tags['v2']=='90a835bb1499723045e55aac464965d29e19aa7a'
assert tags['v3']=='fe2a481dcda6e23e1b9024a89c144e2bce703def'
assert tags['v4']=='c68c96d633f5597a82480247de33ee0e3f6b809f'
assert tags['v5']=='6f1d1e8a468d77b74040315ff13a04873e583db4'
anonymous=[]
if args.visibility=='public':
    for path in ['README.md','petal-paint.js','evidence/petals/v11-large.png']:
        url='https://raw.githubusercontent.com/'+REPO+'/'+head+'/'+path
        # urllib has no GitHub credentials or Authorization header in this script.
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Garden-example-verification'}),timeout=30) as response:data=response.read();status=response.status
        assert status==200 and data==run('git','show','HEAD:'+path)
        anonymous.append({'path':path,'url':url,'http_status':status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'matches_commit':True,'authorization_header':False})
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repository_url':meta['html_url'],'visibility':args.visibility,'private':meta['private'],'commit':head,'remote_refs':remote_refs,'release_count':len(releases),'tags':tags,'files':files,'anonymous_fetches':anonymous}
args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'commit':head,'visibility':args.visibility,'files_read_back_equal':len(files),'tags':len(tags),'anonymous_fetches':len(anonymous)}))

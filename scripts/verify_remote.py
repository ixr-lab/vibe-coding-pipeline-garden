"""Read back exact private GitHub revision with the user's existing gh login.
Read only: does not install credentials or grant permissions. Run after push.
"""
import subprocess,json,base64,pathlib,datetime,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];REPO='ixr-lab/vibe-coding-pipeline-garden'
def run(*a):return subprocess.check_output(a,cwd=ROOT)
def api(p):return json.loads(run('gh','api',p))
head=run('git','rev-parse','HEAD').decode().strip();meta=api('repos/'+REPO);remote=api('repos/'+REPO+'/commits/main')
assert meta['private'] is True and remote['sha']==head
paths=['index.html','garden.js','flower-art.js','brush-art.js','plant-renderer.js','reference.html','reference-data.js','reference-page.js','scripts/build_references.py','reference-source/flowers.json','reference-source/brushes.json','docs/references.md','README.md','docs/extension/log.md','docs/extension/comparison.md','docs/extension/tests.md','evidence/extension/v5-checks.json','evidence/extension/final-checks.json','evidence/extension/reference-checks.json','evidence/extension/stress.json','evidence/extension/v5-flowers.png','evidence/extension/v5-brushes.png','evidence/extension/v5-combinations.png']
files=[]
for path in paths:
 item=api('repos/'+REPO+'/contents/'+path+'?ref='+head);data=base64.b64decode(item['content']);local=run('git','show','HEAD:'+path)
 assert data==local,path
 files.append({'path':path,'blob_sha':item['sha'],'bytes':len(data),'read_back_equal':True})
tags={v:api('repos/'+REPO+'/git/ref/tags/'+v)['object']['sha'] for v in ['v0','v1','v2','v3','v4','v5']}
assert tags['v0']=='95283a8a251f7aea096b9dc9be23658575899da0'
assert tags['v1']=='e87cbf82616e6f6fb4b5cfd685276197e344cfa9'
assert tags['v2']=='90a835bb1499723045e55aac464965d29e19aa7a'
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repository_url':meta['html_url'],'private':True,'commit':head,'tags':tags,'files':files}
out=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/'remote-extended-final.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'commit':head,'private':True,'files_read_back_equal':len(files),'tags':tags}))

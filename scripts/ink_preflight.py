"""Check saved evidence JSON and local documentation links without a browser."""
from pathlib import Path
from urllib.parse import unquote
import re,json,datetime
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/ink/preflight.json'
links=[];missing=[];jsons=[];errors=[]
for p in list(ROOT.rglob('*.md'))+list(ROOT.rglob('*.html')):
 if '.git' in p.parts:continue
 text=p.read_text(encoding='utf8')
 targets=re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',text) if p.suffix=='.md' else re.findall(r'(?:href|src)=[\x22\x27]([^\x22\x27]+)',text)
 for target in targets:
  target=target.strip().strip('<>').split(' "')[0]
  if not target or target.startswith(('#','http:','https:','data:','mailto:')):continue
  bare=unquote(target.split('#')[0].split('?')[0]);dest=(p.parent/bare).resolve()
  row={'source':p.relative_to(ROOT).as_posix(),'target':target,'exists':dest.exists()};links.append(row)
  if not dest.is_relative_to(ROOT) or not dest.exists():missing.append(row)
for p in (ROOT/'evidence').rglob('*.json'):
 if p==OUT:continue
 try:json.loads(p.read_text(encoding='utf8'));jsons.append(p.relative_to(ROOT).as_posix())
 except (ValueError,UnicodeError):errors.append(p.relative_to(ROOT).as_posix())
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'local_links_checked':len(links),'json_files_parsed':len(jsons),'missing':missing,'invalid_json':errors,'pass':not missing and not errors}
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False));assert result['pass']

"""Cache attributed Wikipedia introductions explicitly linked by public OSM tags.

Does not infer identities by proximity or overwrite building attributes. Text is
CC BY-SA 4.0; attribution, source article, retrieval date and licence travel with
each entry. Uses small batches and stops on provider rate limits.
"""
import json, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'public/data/delhi.geojson').read_text())
titles=sorted({f['properties'].get('tags',{}).get('wikipedia','')[3:].split('#')[0].replace('_',' ') for f in data['features'] if f['properties'].get('tags',{}).get('wikipedia','').startswith('en:')})
entries={}
for start in range(0,len(titles),10):
    batch=titles[start:start+10]
    query={'action':'query','format':'json','titles':'|'.join(batch),'prop':'extracts','explaintext':1,'exintro':1,'exchars':1500,'exlimit':10,'redirects':1}
    url='https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(query)
    req=urllib.request.Request(url,headers={'User-Agent':'DelhiAtlas/0.2 (https://github.com/argaurshar/delhi-map; educational urban research)'})
    with urllib.request.urlopen(req,timeout=45) as response:
        result=json.load(response)
    pages={p['title']:p for p in result['query']['pages'].values()}
    aliases={p['from']:p['to'] for key in ['normalized','redirects'] for p in result['query'].get(key,[])}
    for title in batch:
        resolved=title
        for _ in range(5):
            if resolved not in aliases:break
            resolved=aliases[resolved]
        page=pages.get(resolved)
        if not page or not page.get('extract'):continue
        entries[title]={'title':page['title'],'text':page['extract'],'url':'https://en.wikipedia.org/wiki/'+urllib.parse.quote(page['title'].replace(' ','_')),'attribution':'Wikipedia contributors','licence':'CC BY-SA 4.0','licenceUrl':'https://creativecommons.org/licenses/by-sa/4.0/','retrieved':datetime.now(timezone.utc).date().isoformat()}
    print('References retrieved:',len(entries),'of',len(titles),flush=True)
    time.sleep(1)
(ROOT/'public/data/building-context.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')

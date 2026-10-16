"""Extract Delhi geometry from a checksum-verified Geofabrik PBF.

Keeps full ways intersecting the extent and complete in-extent multipolygons.
Uses only public feature tags; contributor identities are not copied.
Usage: .venv/bin/python scripts/extract_pbf.py .cache/northern-zone.osm.pbf
"""
import sys, json, hashlib
from pathlib import Path
from xml.sax.saxutils import quoteattr
import osmium
from prepare_data import BOUNDS, ROOT, build

source = Path(sys.argv[1])
reader = osmium.io.Reader(str(source))
timestamp = reader.header().get('osmosis_replication_timestamp')
reader.close()
if not timestamp:
    raise ValueError('PBF is missing its data timestamp')
w, s, e, n = BOUNDS
nodes, ways, relations = {}, {}, []

class Extract(osmium.SimpleHandler):
    def node(self, obj):
        if w <= obj.location.lon <= e and s <= obj.location.lat <= n and obj.tags:
            nodes[obj.id] = (obj.location.lon, obj.location.lat, dict(obj.tags))

    def way(self, obj):
        if not obj.nodes:
            return
        pts = [(v.lon, v.lat) for v in obj.nodes]
        if max(x for x,y in pts)<w or min(x for x,y in pts)>e or max(y for x,y in pts)<s or min(y for x,y in pts)>n:
            return
        ways[obj.id] = ([v.ref for v in obj.nodes], dict(obj.tags))
        for v in obj.nodes:
            if v.ref not in nodes:
                nodes[v.ref] = (v.lon, v.lat, {})

    def relation(self, obj):
        if obj.tags.get('type') == 'multipolygon' and any(v.type == 'w' and v.ref in ways for v in obj.members):
            relations.append((obj.id, [(v.type,v.ref,v.role) for v in obj.members], dict(obj.tags)))

Extract().apply_file(str(source), locations=True, idx='flex_mem')
target = ROOT/'.cache/delhi-current.osm'
def tags(t):
    return ''.join('<tag k='+quoteattr(k)+' v='+quoteattr(v)+'/>' for k,v in t.items())
with target.open('w') as f:
    f.write('<?xml version="1.0"?><osm version="0.6"><meta osm_base='+quoteattr(timestamp)+'/>' )
    for id,(x,y,t) in nodes.items():
        f.write(f'<node id="{id}" lon="{x}" lat="{y}">'+tags(t)+'</node>')
    for id,(refs,t) in ways.items():
        f.write(f'<way id="{id}">'+''.join(f'<nd ref="{v}"/>' for v in refs)+tags(t)+'</way>')
    for id,ms,t in relations:
        f.write(f'<relation id="{id}">'+''.join('<member type='+quoteattr({'w':'way','n':'node','r':'relation'}[typ])+f' ref="{ref}" role='+quoteattr(role)+'/>' for typ,ref,role in ms)+tags(t)+'</relation>')
    f.write('</osm>')
print('Extracted',len(nodes),'nodes,',len(ways),'ways,',len(relations),'relations.',flush=True)
build(target, 'https://download.geofabrik.de/asia/india/northern-zone.html')
manifest_path=ROOT/'public/data/manifest.json'
manifest=json.loads(manifest_path.read_text())
manifest['upstream_file']='https://download.geofabrik.de/asia/india/northern-zone-'+timestamp[2:10].replace('-','')+'.osm.pbf'
manifest['upstream_sha256']=hashlib.file_digest(source.open('rb'),'sha256').hexdigest()
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')

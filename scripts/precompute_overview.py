"""Precompute whole-extent union statistics using the same spherical area as Turf.

Custom boundaries continue to use the browser worker. Edge clipping is retained
for exports; overlapping polygons are unioned, never summed as coverage.
"""
import json, math
from pathlib import Path
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'public/data'
data=json.loads((out/'delhi.geojson').read_text())
manifest=json.loads((out/'manifest.json').read_text())
extent=box(*manifest['bounds'])
def ring_area(ring):
    p=list(ring)[:-1];n=len(p)
    return abs(sum(math.radians(p[(i+2)%n][0]-p[i][0])*math.sin(math.radians(p[(i+1)%n][1])) for i in range(n))*6371008.8**2/2)
def area(g):
    if g.is_empty:return 0
    if g.geom_type=='Polygon':return ring_area(g.exterior.coords)-sum(ring_area(r.coords) for r in g.interiors)
    return sum(area(x) for x in g.geoms)
rows=[];edges={};excluded=[]
for f in data['features']:
    p=f['properties']
    if p['kind']!='building':continue
    g=shape(f['geometry']);clipped=g.intersection(extent);full=area(g);selected=area(clipped)
    if selected<.01:
        excluded.append(p['id'])
        continue
    if not extent.covers(g):edges[p['id']]={'geometry':mapping(clipped),'area':selected}
    rows.append((p,full,clipped))
result={'dataset':manifest['id'],'areaM2':area(extent),'edgeClips':edges,'excluded':excluded,'filters':{}}
for size in ['all','small','medium','large']:
    selected=[(p,a,g) for p,a,g in rows if size=='all' or (size=='small' and a<100) or (size=='medium' and 100<=a<500) or (size=='large' and a>=500)]
    footprint=area(unary_union([g for p,a,g in selected]))
    heights=[p['height_m'] for p,a,g in selected if p['height_m'] is not None]
    result['filters'][size]={'count':len(selected),'footprintM2':footprint,'coverage':100*footprint/result['areaM2'],'knownHeightCount':len(heights),'estimatedHeightCount':sum(p['height_m'] is not None and p['height_method'].startswith('Estimated:') for p,a,g in selected),'heightMean':sum(heights)/len(heights) if heights else None,'unknownHeightCount':len(selected)-len(heights),'bins':[sum((a<100) if i==0 else (100<=a<500) if i==1 else (500<=a<2000) if i==2 else a>=2000 for p,a,g in selected) for i in range(4)]}
    print(size,len(selected),'buildings;',round(footprint),'m² union',flush=True)
(out/'overview.json').write_text(json.dumps(result,separators=(',',':'))+'\n')

"""Build a small, attributed GeoJSON snapshot from OSM XML. No invented buildings."""
import argparse, hashlib, json, re, gzip, xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon, LineString, Point, box, mapping
from shapely.ops import polygonize, unary_union
from shapely.validation import make_valid

ROOT=Path(__file__).resolve().parents[1]
BOUNDS=[77.17,28.515,77.285,28.68]
EXTENT=box(*BOUNDS)
ARCHIVE='https://raw.githubusercontent.com/hassan23/OpenStreetMap-Project-New-Delhi/0d85639cbe08c65433b5cba697c7b2ac66b51169/NewDelhi.osm'

def build(path, source_url):
    nodes, ways, relations={}, {}, []
    snapshot=None
    for _, e in ET.iterparse(path, events=['end']):
        if e.tag=='meta': snapshot=e.attrib.get('osm_base')
        if e.tag=='node':
            tags={t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
            nodes[e.attrib['id']] = ([float(e.attrib['lon']),float(e.attrib['lat'])],tags)
            e.clear()
        elif e.tag=='way':
            ways[e.attrib['id']] = ([n.attrib['ref'] for n in e.findall('nd')],{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')})
            e.clear()
        elif e.tag=='relation':
            relations.append((e.attrib['id'],[dict(m.attrib) for m in e.findall('member')],{t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}))
            e.clear()
    if not snapshot: raise ValueError('Missing snapshot timestamp')
    features=[]; skipped=0; repaired=0; seen=set(); members=set()
    def kind(t):
        if 'building' in t and t['building']!='no': return 'building'
        if 'building:part' in t and t['building:part']!='no': return 'buildingpart'
        if t.get('leisure') in ['park','garden','pitch'] or t.get('landuse') in ['grass','forest','recreation_ground'] or t.get('natural') in ['wood','scrub']:return 'green'
        if t.get('natural')=='water' or t.get('waterway')=='riverbank':return 'water'
        if 'highway' in t and t['highway'] not in ['proposed','construction']:return 'road'
        if t.get('railway') in ['subway','rail','light_rail']:return 'rail'
    def add(g,t,id,k):
        nonlocal skipped,repaired
        if g.is_empty or not g.intersects(EXTENT):return False
        if not g.is_valid:g=make_valid(g);repaired+=1
        if k in ['road','rail','green','water']:g=g.intersection(EXTENT)
        if k in ['building','buildingpart','green','water'] and g.geom_type not in ['Polygon','MultiPolygon']:skipped+=1;return False
        if k in ['road','rail'] and g.geom_type not in ['LineString','MultiLineString']:skipped+=1;return False
        sig=(k,g.normalize().wkb)
        if sig in seen: return False
        seen.add(sig)
        height=None;method='unknown'
        if re.fullmatch(r'\d+(\.\d+)?( m)?',t.get('height','')):
            height=float(t['height'].replace(' m',''));method='OSM height tag (unverified)'
        elif re.fullmatch(r'\d+(\.\d+)?',t.get('building:levels','')):
            height=float(t['building:levels'])*3;method='Estimated: OSM storeys × 3 m'
        if height is not None and not 0<height<400:height=None;method='unknown'
        p={'id':id,'kind':k,'name':t.get('name:en',t.get('name','')),'use':t.get('building:use',t.get('amenity',t.get('shop',t.get('office',t.get('building','unknown'))))),'road_type':t.get('highway',''),'rail_type':t.get('railway',''),'height_m':height,'height_method':method,'levels':t.get('building:levels'),'start_date':t.get('start_date'),'source':'OpenStreetMap','source_url':'https://www.openstreetmap.org/'+id,'snapshot':snapshot[:10]}
        p['center']=[round(g.representative_point().x,7),round(g.representative_point().y,7)]
        keep=['name:hi','alt_name','addr:housenumber','addr:street','addr:suburb','addr:city','addr:postcode','building','building:use','amenity','shop','office','operator','architect','building:architect','building:material','roof:shape','roof:material','roof:height','min_height','building:min_level','heritage','heritage:operator','historic','religion','denomination','wikidata','wikipedia','wheelchair','opening_hours','website','tourism','description']
        p['tags']={key:t[key] for key in keep if key in t}
        if k=='buildingpart':
            try:p['min_height_m']=float(t.get('min_height',0)) or float(t.get('building:min_level',0))*3
            except ValueError:p['min_height_m']=0
        features.append({'type':'Feature','id':len(features)+1,'properties':p,'geometry':mapping(g)})
        return True
    for rid,ms,t in relations:
        k=kind(t)
        if t.get('type')!='multipolygon' or k not in ['building','buildingpart','green','water']:continue
        outer=[];inner=[];refs=[]
        for m in ms:
            if m['type']!='way' or m['ref'] not in ways:continue
            ns,_=ways[m['ref']];coords=[nodes[n][0] for n in ns if n in nodes]
            if len(coords)<2:continue
            (inner if m.get('role')=='inner' else outer).append(LineString(coords));refs.append(m['ref'])
        if not outer or any(m['type']=='way' and m['ref'] not in ways for m in ms):skipped+=1;continue
        g=unary_union(list(polygonize(outer)))
        if inner:g=g.difference(unary_union(list(polygonize(inner))))
        if add(g,t,'relation/'+rid,k):members.update(refs)
    for wid,(ns,t) in ways.items():
        k=kind(t)
        if not k or (wid in members and k in ['building','buildingpart','green','water']):continue
        if any(n not in nodes for n in ns):skipped+=1;continue
        coords=[nodes[n][0] for n in ns]
        if len(coords)<2:continue
        if k in ['building','buildingpart','green','water']:
            if len(coords)<4 or coords[0]!=coords[-1]:skipped+=1;continue
            g=Polygon(coords)
        else:g=LineString(coords)
        add(g,t,'way/'+wid,k)
    for nid,(coords,t) in nodes.items():
        if EXTENT.contains(Point(coords)) and t.get('railway')=='station':
            # Retain station tags; rail stations are distinguished from metro in the UI.
            add(Point(coords),t,'node/'+nid,'station')
    # Named public destinations and trees supply actual mapped context, never synthetic detail.
    for nid,(coords,t) in nodes.items():
        if EXTENT.contains(Point(coords)) and t.get('railway')!='station':
            if t.get('natural')=='tree':add(Point(coords),t,'node/'+nid,'tree')
            elif t.get('name') and any(k in t for k in ['amenity','shop','tourism','historic']):add(Point(coords),t,'node/'+nid,'place')
    collection={'type':'FeatureCollection','features':features}
    counts={k:sum(f['properties']['kind']==k for f in features) for k in ['building','buildingpart','green','water','road','rail','station','tree','place']}
    manifest={'id':'delhi-osm-'+snapshot[:10], 'title':'Delhi urban core · OpenStreetMap snapshot','snapshot':snapshot,'archive':snapshot[:4]=='2017','bounds':BOUNDS,'source_url':source_url,'source_sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'licence':'ODbL 1.0','licence_url':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'© OpenStreetMap contributors','counts':counts,'geometry_repairs':repaired,'skipped_incomplete_or_unsupported':skipped,'notes':['OpenStreetMap snapshot; not a cadastral or measured building survey.','OSM mapping coverage is incomplete and uneven.','Unknown heights use a uniform 8 m visual extrusion, excluded from measured-height statistics.','Buildings outside the pilot that intersect its edge may be retained in full; study-area calculations clip to the pilot extent.','Heritage points are a separate editorial layer, not verified footprint matches.']}
    manifest['building_attributes']={key:sum(bool(f['properties'].get(key)) for f in features if f['properties']['kind']=='building') for key in ['name','height_m','start_date','levels']}
    out=ROOT/'public/data';out.mkdir(parents=True,exist_ok=True)
    (out/'delhi.geojson').write_text(json.dumps(collection,separators=(',',':')))
    with (out/'delhi.geojson.gz').open('wb') as f:
        with gzip.GzipFile(fileobj=f, mode='wb', mtime=0) as compressed:
            compressed.write((out/'delhi.geojson').read_bytes())
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('file');p.add_argument('--source',default=ARCHIVE);a=p.parse_args();build(a.file,a.source)

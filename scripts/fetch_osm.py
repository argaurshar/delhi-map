"""Download an OSM extract with normal TLS verification, then prepare local assets.

--archive reproduces the pinned 2017 dataset, with its SHA-256 checked.
Without --archive, refresh via Overpass; the environment must allow overpass-api.de.
A failed download never replaces the bundled dataset.
"""
import argparse, hashlib, urllib.parse, urllib.request
from pathlib import Path
from prepare_data import ARCHIVE, BOUNDS, ROOT, build

ARCHIVE_SHA='e821747e8c588bc2a14ff3a8681d020d7b6a5a032210a2a2d0c10aeffdc6626f'
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--archive',action='store_true');args=parser.parse_args()
    cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
    target=cache/('delhi-archive.osm' if args.archive else 'delhi-current.osm')
    url=ARCHIVE
    if not args.archive:
        w,s,e,n=BOUNDS;b=f'{s},{w},{n},{e}'
        selectors=[f'way["building"]({b});',f'relation["type"="multipolygon"]["building"]({b});',f'way["highway"]({b});',f'way["leisure"~"^(park|garden|pitch)$"]({b});',f'way["landuse"~"^(grass|forest|recreation_ground)$"]({b});',f'way["natural"~"^(water|wood|scrub)$"]({b});',f'relation["type"="multipolygon"]["natural"="water"]({b});',f'way["railway"~"^(subway|rail|light_rail)$"]({b});',f'node["railway"="station"]({b});']
        query='[out:xml][timeout:60];('+''.join(selectors)+');(._;>;);out meta;'
        url='https://overpass-api.de/api/interpreter?'+urllib.parse.urlencode({'data':query})
    cached=args.archive and target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==ARCHIVE_SHA
    if not cached:
        temp=target.with_suffix('.download')
        try:
            request=urllib.request.Request(url,headers={'User-Agent':'DelhiAtlasResearchPilot/0.1'})
            with urllib.request.urlopen(request,timeout=90) as response, temp.open('wb') as out:
                total=0
                while chunk:=response.read(1024*1024):
                    total+=len(chunk)
                    if total>180*1024*1024:raise RuntimeError('Response exceeds expected extract size (180 MiB).')
                    out.write(chunk)
            if args.archive and hashlib.sha256(temp.read_bytes()).hexdigest()!=ARCHIVE_SHA:raise RuntimeError('Archive checksum mismatch. Keeping existing assets.')
            temp.replace(target)
        finally:
            temp.unlink(missing_ok=True)
    build(target,ARCHIVE if args.archive else url)
if __name__=='__main__':main()

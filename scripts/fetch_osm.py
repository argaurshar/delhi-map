"""Download an OSM extract with normal TLS verification, then prepare local assets.

--archive reproduces the pinned 2017 dataset, with its SHA-256 checked.
By default, refresh from a checksum-verified Geofabrik regional PBF.
--overpass selects the alternative Overpass service.
A failed download never replaces the bundled dataset.
"""
import argparse, hashlib, urllib.parse, urllib.request, subprocess, sys
from pathlib import Path
from prepare_data import ARCHIVE, BOUNDS, ROOT, build

ARCHIVE_SHA='e821747e8c588bc2a14ff3a8681d020d7b6a5a032210a2a2d0c10aeffdc6626f'
def main():
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--archive',action='store_true')
    group.add_argument('--overpass',action='store_true')
    args=parser.parse_args()
    cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
    if not args.archive and not args.overpass:
        url='https://download.geofabrik.de/asia/india/northern-zone-latest.osm.pbf'
        target=cache/'northern-zone.osm.pbf'
        with urllib.request.urlopen(url+'.md5',timeout=45) as response:
            expected=response.read().decode().split()[0]
        if not target.exists() or hashlib.file_digest(target.open('rb'),'md5').hexdigest()!=expected:
            temp=target.with_suffix('.download')
            try:
                with urllib.request.urlopen(url,timeout=90) as response,temp.open('wb') as out:
                    total=0
                    while chunk:=response.read(1024*1024):
                        total+=len(chunk)
                        if total>400*1024*1024:raise RuntimeError('Review regional extract size before downloading more than 400 MiB.')
                        out.write(chunk)
                if hashlib.file_digest(temp.open('rb'),'md5').hexdigest()!=expected:
                    raise RuntimeError('Geofabrik checksum mismatch; keeping existing assets.')
                temp.replace(target)
            finally:temp.unlink(missing_ok=True)
        subprocess.run([sys.executable,str(ROOT/'scripts/extract_pbf.py'),str(target)],check=True)
        subprocess.run([sys.executable,str(ROOT/'scripts/precompute_overview.py')],check=True)
        return
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
    subprocess.run([sys.executable,str(ROOT/'scripts/precompute_overview.py')],check=True)
if __name__=='__main__':main()

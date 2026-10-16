"""Check reviewed histories, geometry reveal and exported provenance in the production app."""
import csv,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:4175/delhi-map/')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-evidence-verified'));OUT.mkdir(parents=True,exist_ok=True)
def ready(page):
 page.locator('.map-loading').wait_for(state='detached',timeout=120000)
 page.wait_for_function('!document.querySelector(".export-trigger").disabled',timeout=90000)
 page.wait_for_function('document.querySelector(".map-canvas").dataset.settled === "true"',timeout=90000)
def search(page,name):
 # The map also contains a metro building named Jama Masjid; select the reviewed mosque ID.
 query='relation/3926057' if name=='Jama Masjid' else name
 page.get_by_role('textbox',name='Search places and mapped buildings').fill(query)
 page.locator('.search-results').get_by_role('button',name=name+' Building · OSM',exact=True).click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='networkidle');ready(page)
 search(page,'Jama Masjid');ready(page)
 card=page.locator('.reviewed-evidence');assert 'Completed 1656' in card.inner_text()
 assert card.get_by_role('link').first.get_attribute('href').startswith('https://www.incredibleindia.gov.in/')
 assert 'OSM start date\nNot recorded' in page.locator('.building-profile').inner_text()
 card.scroll_into_view_if_needed();page.screenshot(path=str(OUT/'jama-history.png'))
 page.get_by_role('checkbox',name='Undated context').uncheck()
 slider=page.get_by_role('slider',name='Building date cutoff')
 for year,visible in [('1655',False),('1656',True)]:
  slider.fill(year)
  page.wait_for_function('([y,visible])=>{const m=document.querySelector(".map-canvas");return m.dataset.chronologyYear===y&&m.dataset.settled==="true"&&JSON.parse(m.dataset.visibleDatedIds).includes("relation/3926057")===visible}',arg=[year,visible],timeout=30000)
 search(page,'National Museum')
 assert 'institutional founding date' in page.locator('.reviewed-evidence').inner_text()
 assert 'Timeline date\nUnknown' in page.locator('.right-panel').inner_text()
 search(page,'Qila-i-Khuna Mosque')
 assert 'Built 1541' in page.locator('.reviewed-evidence').inner_text()
 assert 'Part of this wider site' in page.locator('.linked-profile').inner_text()
 # Export an actual study containing the newly dated mosque.
 page.get_by_role('textbox',name='Search places and mapped buildings').fill('Jama')
 page.locator('.search-results').get_by_role('button',name='Jama Masjid Mosque',exact=True).click()
 page.get_by_role('button',name='Study its surroundings').click();ready(page)
 page.get_by_role('button',name='Export',exact=True).click()
 for name,file in [('Building records','study.csv'),('Spatial selection','study.geojson')]:
  with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name=name).click()
  d.value.save_as(str(OUT/file))
 rows=list(csv.DictReader((OUT/'study.csv').read_text(encoding='utf-8-sig').splitlines()))
 jama=next(r for r in rows if r['id']=='relation/3926057')
 assert jama['construction_date']=='' and jama['timeline_year']=='1656'
 assert jama['timeline_date_basis']=='Reviewed source' and 'incredibleindia.gov.in' in jama['timeline_date_source']
 geo=json.loads((OUT/'study.geojson').read_text())
 jama=next(f['properties'] for f in geo['features'] if f['properties']['id']=='relation/3926057')
 assert jama['start_date'] is None and jama['timeline_date']['year']==1656
 assert jama['reviewed_building_evidence']['sources'][0]['url']==jama['timeline_date']['sourceUrl']
 print('Desktop source cards, actual 1655/1656 geometry and CSV/GeoJSON provenance passed',flush=True)
 mobile=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(URL,wait_until='networkidle');ready(mobile)
 mobile.get_by_role('button',name='Show layer panel',exact=True).click()
 search(mobile,'Jama Masjid')
 mobile.locator('.reviewed-evidence').get_by_role('link').first.scroll_into_view_if_needed()
 assert mobile.locator('.reviewed-evidence').get_by_role('link').first.is_visible()
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(OUT/'mobile-history.png'))
 assert not errors,errors
 print(json.dumps({'result':'passed','exported_records':len(rows),'browser_errors':errors}),flush=True)
 b.close()

"""Exercise exact records, urban filters, saved views and map exports on the production build."""
import json, os
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:4175/delhi-map/')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-urban'));OUT.mkdir(exist_ok=True,parents=True)
def ready(page):
 page.locator('.map-loading').wait_for(state='detached',timeout=120000)
 page.wait_for_function('!document.querySelector(".export-trigger").disabled',timeout=90000)
 page.wait_for_function('document.querySelector(".map-canvas").dataset.settled==="true"',timeout=90000)
def search(page,record):
 page.get_by_role('textbox',name='Search places and mapped buildings').fill(record)
 page.locator('.search-results button').first.click();ready(page)
def close(page):page.get_by_role('button',name='Close feature details',exact=True).click()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce');errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(URL,wait_until='networkidle');ready(page)
 # Inputs must display the committed, clamped filter after blur, including empty edits.
 for label, invalid, expected in [('Built year from','1000','1190'),('Built year through','3000','2026'),('Built year from','','1190')]:
  field=page.get_by_label(label,exact=True);field.fill(invalid);field.press('Tab');assert field.input_value()==expected
 assert page.locator('.colour-section .active').inner_text()=='Use' 
 assert page.locator('.colour-section .period-row').count()==11
 assert 'unknown' in json.loads(page.locator('.map-canvas').get_attribute('data-visible-uses'))
 page.screenshot(path=str(OUT/'01-use-overview.png'))
 page.get_by_label('Building use',exact=True).select_option('education');ready(page)
 assert json.loads(page.locator('.map-canvas').get_attribute('data-visible-uses'))==['education']
 assert int(page.locator('.map-canvas').get_attribute('data-visible-buildings'))>0
 page.get_by_label('Buildings & spaces: access').select_option('private');ready(page)
 assert set(json.loads(page.locator('.map-canvas').get_attribute('data-visible-access'))).issubset({'private'})
 page.get_by_role('button',name='Share this view',exact=True).click()
 link=page.get_by_role('textbox',name='View link').input_value()
 state=json.loads(parse_qs(urlparse(link).fragment)['view'][0]);assert state['research']['use']=='education' and state['research']['access']=='private'
 page.get_by_role('button',name='Close dialog',exact=True).click();page.goto(link,wait_until='networkidle');ready(page)
 assert page.get_by_label('Building use',exact=True).input_value()=='education'
 assert page.get_by_label('Buildings & spaces: access').input_value()=='private'
 page.locator('.research-filters').get_by_role('button',name='Reset',exact=True).click();ready(page)
 search(page,'way/44827278');assert page.locator('.right-panel h2').inner_text()=='Lotus Temple'
 assert 'Recorded name' in page.locator('.right-panel').inner_text()
 close(page)
 page.get_by_label('Built year from',exact=True).fill('1987');page.get_by_label('Built year from',exact=True).press('Tab');ready(page)
 assert 'way/44827278' not in json.loads(page.locator('.map-canvas').get_attribute('data-visible-dated-ids'))
 page.get_by_label('Built year from',exact=True).fill('1986');page.get_by_label('Built year from',exact=True).press('Tab');ready(page)
 assert 'way/44827278' in json.loads(page.locator('.map-canvas').get_attribute('data-visible-dated-ids'))
 page.locator('.research-filters').get_by_role('button',name='Reset',exact=True).click();ready(page)
 # Source ID search must identify an anonymous footprint without a fabricated name.
 data=json.loads(Path('public/data/delhi.geojson').read_text())['features']
 anonymous=next(f for f in data if f['properties']['kind']=='building' and not f['properties']['name'])
 search(page,anonymous['properties']['id']);assert page.locator('.right-panel h2').inner_text()=='Name not recorded'
 assert anonymous['properties']['id'] in page.locator('.right-panel').inner_text()
 assert 'An everyday building' not in page.locator('.right-panel').inner_text();close(page)
 paved=next(f for f in data if f['properties']['kind']=='paved' and f['properties']['surface_status']=='hard')
 search(page,paved['properties']['id']);assert 'Ground & space dossier' in page.locator('.right-panel').inner_text()
 assert paved['properties']['tags']['surface'] in page.locator('.right-panel').inner_text();close(page)
 # A name button selects the same record as its label, not a nearby footprint.
 search(page,'relation/3926057');close(page)
 label=page.locator('.context-map-label').filter(has_text='Jama Masjid').first
 label.click();assert page.locator('.right-panel h2').inner_text()=='Jama Masjid'
 assert 'relation/3926057' in page.locator('.right-panel').inner_text()
 page.screenshot(path=str(OUT/'02-exact-name.png'));close(page)
 page.get_by_role('button',name='Export',exact=True).click()
 assert 'Use, access' in page.get_by_role('dialog').inner_text()
 with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Map image').click()
 d.value.save_as(str(OUT/'urban-map.png'));assert (OUT/'urban-map.png').stat().st_size>10000
 page.get_by_role('button',name='Close dialog',exact=True).click()
 page.emulate_media(reduced_motion='no-preference')
 page.get_by_role('button',name='Guided tour',exact=True).click()
 page.get_by_role('button',name='Play guided tour',exact=True).click()
 page.get_by_label('Building use',exact=True).select_option('education')
 page.get_by_role('button',name='Play guided tour',exact=True).wait_for()
 page.get_by_role('button',name='Close guided tour',exact=True).click()
 mobile=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(URL,wait_until='networkidle');ready(mobile)
 mobile.get_by_role('button',name='Show layer panel',exact=True).click()
 mobile.get_by_label('Building use',exact=True).select_option('worship');ready(mobile)
 assert json.loads(mobile.locator('.map-canvas').get_attribute('data-visible-uses'))==['worship']
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(OUT/'03-mobile-filters.png'))
 assert not errors,errors
 print(json.dumps({'result':'passed','checks':['year input normalization','filters pause guided tour','default bright use palette','rendered use filter','rendered access filter','share restoration','lower date bound','exact source name','anonymous identity','hard-paving dossier','clickable exact-name label','PNG export','mobile filters'],'errors':errors}),flush=True)
 browser.close()

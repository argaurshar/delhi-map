"""Check filter/analysis/export agreement, evidence, research notebook and spaces."""
import os,json,csv,io
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:4176/delhi-map/')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-research'));OUT.mkdir(exist_ok=True,parents=True)
def ready(page):
 page.locator('.map-loading').wait_for(state='detached',timeout=120000)
 page.wait_for_function('document.querySelector(".export-trigger") && !document.querySelector(".export-trigger").disabled',timeout=120000)
def count(page):return int(page.locator('.metric').first.locator('strong').inner_text().replace(',',''))
def search(page,id):
 page.get_by_role('textbox',name='Search places and mapped buildings').fill(id)
 page.locator('.search-results button').first.click();ready(page)
def dismiss(page):page.get_by_role('button',name='Close dialog',exact=True).click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce');errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(URL,wait_until='networkidle');ready(page)
 assert count(page)==63673
 page.get_by_label('Analyse this filtered selection',exact=True).check();ready(page)
 page.get_by_label('Building use',exact=True).select_option('education');ready(page)
 assert count(page)==246,count(page)
 assert page.locator('.analysis-scope-readout').get_attribute('data-analysis-scope')=='filtered'
 page.get_by_role('button',name='Export',exact=True).click()
 with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Building records').click()
 d.value.save_as(str(OUT/'filtered.csv'));rows=list(csv.DictReader((OUT/'filtered.csv').read_text(encoding='utf-8-sig').splitlines()))
 assert len(rows)==246 and all(r['use_category']=='education' and r['analysis_scope']=='filtered' for r in rows)
 assert all(json.loads(r['analysis_filters'])['research']['use']=='education' for r in rows)
 with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Spatial selection').click()
 d.value.save_as(str(OUT/'filtered.geojson'));geo=json.loads((OUT/'filtered.geojson').read_text())
 assert geo['metadata']['analysis_scope']=='filtered'
 assert {f['properties']['id'] for f in geo['features']}=={r['id'] for r in rows}
 dismiss(page)
 # An explicit private-access filter recomputes the study, not just paint.
 page.get_by_label('Buildings & spaces: access').select_option('private');ready(page)
 assert count(page)<246
 page.get_by_label('Buildings & spaces: access').select_option('all')
 page.get_by_label('Building use',exact=True).select_option('all')
 page.get_by_role('checkbox',name='Include undated buildings',exact=True).uncheck()
 field=page.get_by_label('Built year through',exact=True);field.fill('1600');field.press('Tab');ready(page)
 assert count(page)==4,count(page)
 page.get_by_role('button',name='Share this view',exact=True).click()
 link=page.get_by_role('textbox',name='View link').input_value();saved=json.loads(parse_qs(urlparse(link).fragment)['view'][0]);assert saved['analyseFiltered'] is True
 dismiss(page);page.goto(link,wait_until='networkidle');ready(page);assert count(page)==4
 page.screenshot(path=str(OUT/'01-filtered-study.png'))
 page.get_by_label('Analyse this filtered selection',exact=True).uncheck();ready(page);assert count(page)==63673
 # Source reviewed institutional history must not become a construction date.
 search(page,'relation/5507689');assert page.locator('.right-panel h2').inner_text()=='National Archives of India'
 assert 'Reviewed identity association' in page.get_by_label('Record evidence').inner_text()
 assert '1926' in page.locator('.reviewed-evidence').inner_text()
 page.locator('.research-workbench > summary').click()
 page.get_by_role('button',name='Add selected building',exact=True).click()
 page.get_by_label('Your study notes',exact=True).fill('Compare entrance and public approach; verify on site.')
 search(page,'relation/3926057')
 page.get_by_role('button',name='Add selected building',exact=True).click()
 assert page.locator('.research-shortlist article').count()==2
 assert page.get_by_label('Your study notes',exact=True).input_value().startswith('Compare entrance')
 with page.expect_download() as d:page.get_by_role('button',name='Download notebook',exact=True).click()
 d.value.save_as(str(OUT/'notebook.md'));notes=(OUT/'notebook.md').read_text();assert 'relation/5507689' in notes and 'Compare entrance' in notes and 'not walking' in notes
 page.screenshot(path=str(OUT/'02-notebook.png'))
 # The source catalogue must not masquerade as an adopted legal overlay.
 page.locator('.planning-panel > details').first.locator('summary').first.click()
 assert 'No statutory zoning' in page.locator('.planning-panel').inner_text()
 assert page.locator('.planning-source-list a').count()>=4
 page.locator('.planning-panel > details').nth(1).locator('summary').first.click()
 page.get_by_label('Recorded surface',exact=True).select_option('hard')
 with page.expect_download() as d:page.get_by_role('button',name='Export matching spaces',exact=True).click()
 d.value.save_as(str(OUT/'spaces.csv'));spaces=list(csv.DictReader((OUT/'spaces.csv').read_text(encoding='utf-8-sig').splitlines()));assert len(spaces)>=47
 firstid=page.locator('.space-results button').first.locator('small').last.inner_text()
 page.locator('.space-results button').first.click();assert firstid in page.locator('.right-panel').inner_text()
 mobile=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(URL,wait_until='networkidle');ready(mobile)
 mobile.get_by_role('button',name='Show layer panel',exact=True).click()
 mobile.get_by_label('Building use',exact=True).select_option('education')
 mobile.get_by_label('Analyse this filtered selection',exact=True).check();ready(mobile)
 assert count(mobile)==246
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(OUT/'03-mobile-research.png'))
 assert not errors,errors
 print(json.dumps({'result':'passed','filtered_records':246,'date_filtered_records':4,'space_export_records':len(spaces),'checks':['map-filter research scope','CSV and GeoJSON record equality','private access recomputation','dates and unknown exclusion','shared research scope','unfiltered restoration','reviewed identity','persistent shortlist across selections','notes export','planning source limits','space CSV and exact selection','mobile research'],'errors':errors}),flush=True)
 b.close()

"""Functional checks against a running app. Uses the environment's Chromium."""
import csv, io, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:5173')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-browser'));OUT.mkdir(parents=True,exist_ok=True)

def ready(page):
    page.wait_for_function('!document.querySelector(".export-trigger").disabled',timeout=90000)

def dismiss(page):
    page.get_by_role('button',name='Close dialog',exact=True).click()

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    requests=[];page.on('request',lambda r:requests.append(r.url))
    page.goto(URL,wait_until='networkidle');ready(page)
    assert page.locator('canvas').count()==1
    assert page.locator('.map-error').count()==0
    assert '5,185' in page.locator('.metrics').inner_text()
    print('Browser checkpoint',page.locator('.mode-nav .active').inner_text(),flush=True)
    page.screenshot(path=str(OUT/'01-overview.png'))
    page.get_by_role('button',name='Switch to 2D',exact=True).click()
    page.get_by_role('button',name='Switch to 3D',exact=True).wait_for()
    page.get_by_role('button',name='Switch to 3D',exact=True).click()
    page.get_by_role('button',name='Switch to 2D',exact=True).wait_for()
    page.get_by_role('switch',name='Transit & streets').click()
    assert page.get_by_role('switch',name='Transit & streets').get_attribute('aria-checked')=='true'
    page.get_by_role('button',name='Height',exact=True).click()
    assert 'Only 4 records' in page.locator('.colour-section').inner_text()
    page.get_by_role('button',name='Footprint',exact=True).click()
    search=page.get_by_role('textbox',name='Search places and mapped buildings')
    search.fill('Jama')
    page.locator('.search-results').get_by_role('button',name='Jama Masjid Mosque',exact=True).click()
    assert '1656' in page.locator('.right-panel').inner_text()
    assert page.get_by_role('link',name='Wikipedia · Jama Masjid, Delhi').get_attribute('href').startswith('https://')
    print('Browser checkpoint',page.locator('.mode-nav .active').inner_text(),flush=True)
    page.screenshot(path=str(OUT/'02-heritage.png'))
    page.get_by_role('button',name='Study its surroundings').click();ready(page)
    assert '500 m around Jama Masjid' in page.locator('.right-panel').inner_text()
    page.get_by_role('combobox',name='Study area',exact=True).select_option('connaught');ready(page)
    page.get_by_role('combobox',name='Footprint filter',exact=True).select_option('small');ready(page)
    count=int(page.locator('.metric').first.locator('strong').inner_text().replace(',',''))
    assert 0<count<5185
    page.get_by_role('button',name='Export',exact=True).click()
    with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Building records').click()
    d.value.save_as(str(OUT/'selection.csv'))
    rows=list(csv.DictReader((OUT/'selection.csv').read_text(encoding='utf-8-sig').splitlines()))
    assert len(rows)==count
    assert all(float(r['full_footprint_m2'])<=100 for r in rows)
    assert all(r['snapshot']=='2017-08-15' for r in rows)
    with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Spatial selection').click()
    d.value.save_as(str(OUT/'selection.geojson'))
    geo=json.loads((OUT/'selection.geojson').read_text())
    assert len(geo['features'])==count and geo['metadata']['footprint_filter']=='small'
    assert all(f['properties']['selected_area_m2']<=f['properties']['area_m2']+0.1 for f in geo['features'])
    with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Map image').click()
    d.value.save_as(str(OUT/'map-export.png'))
    assert (OUT/'map-export.png').stat().st_size>10000
    with page.expect_download() as d:page.get_by_role('dialog').get_by_role('button',name='Research brief').click()
    d.value.save_as(str(OUT/'brief.md'))
    assert 'Study boundary (WGS 84)' in (OUT/'brief.md').read_text()
    dismiss(page)
    page.get_by_role('button',name='Inspect building records').click()
    assert page.locator('tbody tr').count()==min(count,25)
    page.get_by_role('textbox',name='Filter building table').fill('not-a-real-id')
    assert page.get_by_text('No matching building records.').is_visible()
    dismiss(page)
    page.get_by_role('combobox',name='Footprint filter',exact=True).select_option('all');ready(page)
    page.get_by_role('button',name='Whole pilot',exact=True).click();ready(page)
    page.get_by_role('button',name='Draw boundary',exact=True).click()
    for x,y in [(550,340),(850,350),(830,610),(550,600)]:page.mouse.click(x,y)
    page.get_by_role('button',name='Finish boundary',exact=True).click();ready(page)
    assert 'Drawn study area' in page.locator('.right-panel').inner_text()
    print('Browser checkpoint',page.locator('.mode-nav .active').inner_text(),flush=True)
    page.screenshot(path=str(OUT/'03-analysis.png'))
    invalid={'type':'Polygon','coordinates':[[[0,0],[1,0],[1,1],[0,0]]]}
    page.get_by_label('Import study boundary file').set_input_files({'name':'outside.geojson','mimeType':'application/geo+json','buffer':json.dumps(invalid).encode()})
    assert page.get_by_role('status').filter(has_text='inside the Central Delhi pilot').is_visible()
    valid={'type':'Polygon','coordinates':[[[77.21,28.63],[77.22,28.63],[77.22,28.64],[77.21,28.64],[77.21,28.63]]]}
    page.get_by_label('Import study boundary file').set_input_files({'name':'research.geojson','mimeType':'application/geo+json','buffer':json.dumps(valid).encode()});ready(page)
    assert 'research' in page.locator('.right-panel').inner_text()
    page.get_by_role('button',name='Compare',exact=True).click()
    page.locator('.comparison-table').wait_for(timeout=90000)
    assert 'Footprint coverage' in page.locator('.comparison-table').inner_text()
    page.get_by_role('combobox',name='Comparison window A').select_option('connaught')
    page.locator('.comparison-table').wait_for(timeout=90000)
    print('Browser checkpoint',page.locator('.mode-nav .active').inner_text(),flush=True)
    page.screenshot(path=str(OUT/'04-comparison.png'))
    slider=page.get_by_role('slider',name='Heritage completion year')
    slider.fill('1650')
    page.wait_for_function('document.querySelector(".timeline-year strong").textContent === "1650"')
    assert page.locator('.heritage-marker:visible').count()==2
    page.get_by_role('button',name='Play heritage timeline',exact=True).click()
    page.wait_for_function('Number(document.querySelector(".timeline-year strong").textContent) > 1650')
    page.get_by_role('button',name='Pause heritage timeline',exact=True).click()
    page.get_by_role('button',name='Share this view',exact=True).click()
    shared=page.get_by_role('textbox',name='View link').input_value()
    assert '#view=' in shared
    page.goto(shared,wait_until='networkidle');page.reload(wait_until='networkidle');ready(page)
    assert page.get_by_role('button',name='Compare',exact=True).get_attribute('aria-pressed')=='true'
    assert page.get_by_role('combobox',name='Comparison window A').input_value()=='connaught'
    assert 'research' in page.locator('.right-panel').inner_text()
    page.get_by_role('button',name='Data & sources',exact=True).click()
    assert page.get_by_role('dialog').is_visible()
    page.keyboard.press('Escape');assert page.get_by_role('dialog').count()==0
    assert not errors,errors
    remote=[u for u in requests if not u.startswith(URL) and not u.startswith(('data:','blob:'))]
    assert not remote,remote
    mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.goto(URL,wait_until='networkidle');ready(mobile)
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    mobile.get_by_role('button',name='Show layer panel',exact=True).click()
    assert mobile.get_by_role('textbox',name='Search places and mapped buildings').is_visible()
    mobile.get_by_role('textbox',name='Search places and mapped buildings').fill('Red Fort')
    mobile.locator('.search-results').get_by_role('button',name='Red Fort').click()
    assert mobile.get_by_role('button',name='Show layer panel',exact=True).is_visible()
    mobile.wait_for_function('getComputedStyle(document.querySelector(".left-panel")).opacity === "0"')
    mobile.screenshot(path=str(OUT/'05-mobile.png'))
    assert not errors,errors
    print(json.dumps({'result':'passed','browser_errors':errors,'external_runtime_requests':remote,'csv_rows':count,'checks':['map render','2D/3D','layers','search','heritage sources','radius selection','size filter','CSV export','GeoJSON export','PNG export','brief export','record table','polygon drawing','boundary validation and import','comparison','timeline and playback','share restoration','dialog dismissal','mobile layout and selection']},indent=2))
    browser.close()

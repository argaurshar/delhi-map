"""Check full-resolution PNG capture during adaptive motion and label identity/collisions."""
import json, os, struct
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = os.environ.get('ATLAS_TEST_URL', 'http://127.0.0.1:4176/delhi-map/')
OUT = Path(os.environ.get('ATLAS_TEST_OUTPUT', '/workspace/scratch/research-capture'))
OUT.mkdir(parents=True, exist_ok=True)
def ready(page):
    page.locator('.map-loading').wait_for(state='detached', timeout=120000)
    page.wait_for_function('document.querySelector(".map-canvas")?.dataset.settled === "true"', timeout=90000)
    page.wait_for_function('!document.querySelector(".export-trigger").disabled', timeout=90000)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':1000}, device_scale_factor=1, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='networkidle'); ready(page)
    full = page.locator('canvas').evaluate('e=>({width:e.width,ratio:e.width/e.clientWidth})')
    page.get_by_role('button', name='Replay 3D reveal', exact=True).click()
    # One deliberately slow frame exercises adaptation even on a fast machine.
    page.evaluate('()=>{const end=performance.now()+180; while(performance.now()<end) {}}')
    page.wait_for_function('document.querySelector(".map-canvas").dataset.layerMoving === "true" && document.querySelector("canvas").width/document.querySelector("canvas").clientWidth < 0.99', timeout=15000)
    page.get_by_role('button', name='Export', exact=True).click()
    with page.expect_download(timeout=45000) as download:
        page.get_by_role('dialog').get_by_role('button', name='Map image').click()
    target = OUT/'full-resolution-capture.png'; download.value.save_as(str(target))
    width, height = struct.unpack('>II', target.read_bytes()[16:24])
    assert width == full['width'], (width, full)
    assert page.locator('canvas').evaluate('e=>e.width/e.clientWidth') == full['ratio']
    assert page.locator('.map-canvas').get_attribute('data-layer-moving') == 'false'
    assert int(page.locator('.map-canvas').get_attribute('data-visible-buildings')) > 0
    page.get_by_role('button', name='Close dialog', exact=True).click()
    # The tour scheduler must pause as well as the immediate camera animation.
    page.get_by_role('button', name='Guided tour', exact=True).click()
    page.get_by_role('button', name='Play guided tour', exact=True).click()
    page.get_by_role('button', name='Export', exact=True).click()
    page.get_by_role('button', name='Close dialog', exact=True).click()
    page.get_by_role('button', name='Play guided tour', exact=True).wait_for()
    assert page.get_by_role('button', name='Pause guided tour', exact=True).count() == 0
    page.get_by_role('button', name='Close guided tour', exact=True).click()
    # Labels retain exact record identities and don't overlap each other.
    page.get_by_role('textbox', name='Search places and mapped buildings').fill('relation/3926057')
    page.locator('.search-results').get_by_role('button', name='Jama Masjid Building · OSM', exact=True).click(); ready(page)
    page.get_by_role('button', name='Close feature details', exact=True).click()
    labels = page.locator('.context-map-label').evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect(); return {name:e.textContent,id:e.title,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})')
    assert labels
    for i, a in enumerate(labels):
        for b in labels[i+1:]:
            assert not (a['left'] < b['right'] and a['right'] > b['left'] and a['top'] < b['bottom'] and a['bottom'] > b['top']), (a,b)
    label = page.locator('.context-map-label[title^="relation/3926057 "]')
    label.click()
    assert page.locator('.right-panel h2').inner_text() == 'Jama Masjid'
    assert 'relation/3926057' in page.locator('.right-panel').inner_text()
    assert not errors, errors
    print(json.dumps({'result':'passed','export_pixels':[width,height],'label_count':len(labels),'checks':['mid-flight PNG restores full resolution','settled geometry capture','export pauses guided tour','non-overlapping exact-record labels'],'errors':errors}), flush=True)
    browser.close()

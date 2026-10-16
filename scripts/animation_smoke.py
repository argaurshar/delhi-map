"""Verify linked chronology against actual rendered building IDs, plus context, hover, motion and mobile controls."""
import os,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:5173')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-animation-verified'));OUT.mkdir(parents=True,exist_ok=True)

def settled(page):
    page.wait_for_function('document.querySelector(".map-canvas").dataset.settled === "true"',timeout=90000)
def ready(page):
    page.locator('.map-loading').wait_for(state='detached',timeout=120000)
    page.wait_for_function('!document.querySelector(".export-trigger").disabled',timeout=90000)
    settled(page)
def rendered(page):return json.loads(page.locator('.map-canvas').get_attribute('data-visible-dated-ids') or '[]')
def share(page):
    page.get_by_role('button',name='Share this view',exact=True).click()
    link=page.get_by_role('textbox',name='View link').input_value()
    page.get_by_role('button',name='Close dialog',exact=True).click()
    return link
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto(URL,wait_until='networkidle');ready(page)
    assert page.locator('.chronology').get_attribute('data-total')=='15'
    assert '63,661 undated' in page.locator('.chronology-note').inner_text()
    page.get_by_role('checkbox',name='Undated context').uncheck()
    # A known location gives a direct geometry-level check of historical filtering.
    search=page.get_by_role('textbox',name='Search places and mapped buildings');search.fill('Lotus Temple')
    page.locator('.search-results').get_by_role('button',name='Lotus Temple Bahá’í House of Worship',exact=True).click()
    settled(page)
    slider=page.get_by_role('slider',name='Building date cutoff')
    slider.fill('1985');page.wait_for_function('document.querySelector(".map-canvas").dataset.chronologyYear==="1985"');settled(page)
    assert 'way/44827278' not in rendered(page),rendered(page)
    before=page.screenshot(path=str(OUT/'01-before-lotus.png'))
    slider.fill('1986');page.wait_for_function('document.querySelector(".map-canvas").dataset.chronologyYear==="1986"');settled(page)
    assert 'way/44827278' in rendered(page),rendered(page)
    after=page.screenshot(path=str(OUT/'02-after-lotus.png'));assert before!=after
    print('Actual Lotus footprint appears at its recorded date',flush=True)
    canvas_before=page.locator('canvas').screenshot()
    page.mouse.move(695,520)
    page.wait_for_function('document.querySelector(".map-canvas").dataset.hoveredId==="way/44827278"')
    canvas_hover=page.locator('canvas').screenshot();assert canvas_before!=canvas_hover
    page.mouse.click(695,520)
    assert 'Lotus Temple' in page.locator('.right-panel').inner_text()
    assert page.locator('.right-panel').evaluate('el=>getComputedStyle(el).animationName')=='inspector-enter'
    page.get_by_role('button',name='Close feature details',exact=True).click()
    page.mouse.move(600,400)
    # Two exact dated records through 1600, and 15 total at Today.
    slider.fill('1600');assert page.locator('.chronology').get_attribute('data-revealed')=='2'
    slider.fill('2026');assert page.locator('.chronology').get_attribute('data-revealed')=='15'
    page.get_by_role('checkbox',name='Undated context').check()
    page.get_by_role('combobox',name='Chronology speed').select_option('4')
    page.get_by_role('button',name='Replay chronology',exact=True).click()
    page.wait_for_function('Number(document.querySelector(".chronology").dataset.year)>1250')
    page.get_by_role('button',name='Pause chronology',exact=True).click()
    stopped=page.locator('.chronology').get_attribute('data-year');page.wait_for_timeout(600)
    assert page.locator('.chronology').get_attribute('data-year')==stopped
    page.get_by_role('button',name='Play chronology',exact=True).click()
    page.wait_for_function('document.querySelector(".chronology").dataset.year==="2026"',timeout=30000)
    assert page.get_by_role('button',name='Play chronology',exact=True).is_visible()
    settled(page);page.screenshot(path=str(OUT/'03-chronology-overview.png'))
    page.get_by_role('button',name='Before 1700',exact=False).click()
    assert page.locator('.chronology').get_attribute('data-total')=='2'
    assert page.locator('.period-row[aria-pressed="true"]').count()==1
    page.get_by_role('button',name='Before 1700',exact=False).click()
    page.get_by_role('button',name='Roof forms',exact=False).click();settled(page)
    assert 'Recorded roof shapes' in page.locator('.context-description').inner_text()
    assert page.locator('.map-canvas').get_attribute('data-context')=='roofs'
    page.screenshot(path=str(OUT/'04-roof-context.png'))
    link=share(page);page.goto(link);page.reload(wait_until='networkidle');ready(page)
    assert page.locator('.map-canvas').get_attribute('data-context')=='roofs'
    assert page.get_by_role('checkbox',name='Undated context').is_checked()
    page.get_by_role('button',name='All building contexts',exact=False).click()
    page.get_by_role('button',name='Homes & neighbourhoods',exact=False).click();settled(page)
    assert '4,253' in page.locator('.chronology-note').inner_text()
    assert page.get_by_role('button',name='Play chronology',exact=True).is_disabled()
    assert page.get_by_text('No usable dates in this context',exact=True).is_visible()
    page.get_by_role('button',name='All building contexts',exact=False).click()
    page.get_by_role('button',name='Heritage milestones',exact=True).click()
    page.get_by_role('slider',name='Heritage milestone cutoff').fill('1650')
    assert page.locator('.heritage-marker:not(.marker-hidden)').count()==8
    assert page.locator('.chronology').get_attribute('data-revealed')=='8'
    # Manual camera interaction pauses chronological playback.
    page.get_by_role('button',name='Play chronology',exact=True).click()
    page.mouse.move(790,500);page.mouse.wheel(0,-100)
    page.get_by_role('button',name='Play chronology',exact=True).wait_for()
    # Runtime preference changes disable motion and retain static year navigation.
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function('document.querySelector(".chronology .play-button").disabled')
    assert page.get_by_role('button',name='Play chronology',exact=True).is_disabled()
    page.get_by_role('slider',name='Heritage milestone cutoff').fill('2026')
    assert page.locator('.chronology').get_attribute('data-revealed')=='24'
    mobile=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.goto(URL,wait_until='networkidle');ready(mobile)
    assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert mobile.get_by_role('button',name='Play chronology',exact=True).is_disabled()
    mobile.get_by_role('slider',name='Building date cutoff').fill('1600')
    assert mobile.locator('.chronology').get_attribute('data-revealed')=='2'
    mobile.get_by_role('button',name='Show layer panel',exact=True).click()
    mobile.get_by_role('button',name='Places of worship',exact=False).click();settled(mobile)
    assert mobile.locator('.context-description h3').inner_text()=='Places of worship'
    mobile.screenshot(path=str(OUT/'05-mobile-context.png'))
    assert not page.locator('.map-error').count()
    assert not errors,errors
    print(json.dumps({'result':'passed','checks':['actual geometry appears at recorded date','hover pixel feedback','selected-card entrance','unknown dates kept separate','histogram and count reconciliation','replay','pause and resume','automatic Today stop','period isolation','context highlighting','context share restoration','empty date coverage','separate milestone animation','pause on map interaction','runtime reduced motion','mobile context and slider'],'errors':errors},indent=2),flush=True)
    browser.close()

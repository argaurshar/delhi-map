"""Exercise the live cinematic controls and sourced building profiles."""
import os, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:4175/delhi-map/')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-experience'));OUT.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 started=time.monotonic();page.goto(URL,wait_until='networkidle');page.locator('.map-loading').wait_for(state='detached',timeout=90000)
 page.wait_for_function('!document.querySelector(".export-trigger").disabled',timeout=90000)
 print('Map and overview ready in',round(time.monotonic()-started,1),'seconds',flush=True)
 assert not page.locator('.map-error').count()
 page.screenshot(path=str(OUT/'01-current-map.png'))
 page.get_by_role('button',name='Guided tour',exact=True).click();page.get_by_role('combobox',name='Tour speed').select_option('2')
 page.get_by_role('button',name='Play guided tour').click()
 page.wait_for_function('document.querySelector(".tour-current strong").textContent.includes("Humayun")',timeout=20000)
 page.wait_for_timeout(4000)  # Let the 3.2 s camera flight finish before pausing.
 page.get_by_role('button',name='Pause guided tour').click()
 page.wait_for_function('document.querySelector(".map-canvas").dataset.settled === "true"',timeout=20000)
 assert int(page.locator('.map-canvas').get_attribute('data-visible-buildings'))>0
 page.wait_for_function('document.querySelector(".heritage-photo img")?.naturalWidth>0')
 assert 'Architect' in page.locator('.detail-body').inner_text()
 page.screenshot(path=str(OUT/'02-tour-and-profile.png'))
 page.get_by_role('button',name='Next tour stop').click();assert 'Red Fort' in page.locator('.tour-current').inner_text()
 page.get_by_role('button',name='Close guided tour').click()
 page.wait_for_function('document.querySelector(".map-canvas").dataset.settled === "true"',timeout=30000)
 # Orbit changes the projected position of another landmark, not just button state.
 page.get_by_role('button',name='Orbit map').click()
 old=page.locator('.heritage-marker').nth(1).get_attribute('style')
 page.wait_for_function('(old)=>document.querySelectorAll(".heritage-marker")[1].getAttribute("style")!==old',arg=old,timeout=10000)
 page.get_by_role('button',name='Stop orbit').click()
 page.get_by_role('button',name='Guided tour',exact=True).click();page.get_by_role('button',name='Play guided tour').click()
 page.mouse.move(760,520);page.mouse.down();page.mouse.move(820,570,steps=8);page.mouse.up()
 page.get_by_role('button',name='Play guided tour').wait_for();page.get_by_role('button',name='Close guided tour').click()
 # OSM-linked context is shown separately from the feature's factual tags.
 search=page.get_by_role('textbox',name='Search places and mapped buildings');search.fill('Bharat Mandapam')
 page.locator('.search-results').get_by_role('button',name='Bharat Mandapam Building · OSM',exact=True).click()
 page.locator('.building-profile').scroll_into_view_if_needed()
 page.get_by_text('Read the source overview',exact=True).click()
 assert len(page.locator('.reference-text').inner_text())>100
 assert page.locator('.linked-reference').get_by_role('link',name='CC BY-SA 4.0').count()==1
 assert 'Footprint perimeter' in page.locator('.building-profile').inner_text()
 page.screenshot(path=str(OUT/'03-building-dossier.png'))
 page.get_by_role('button',name='Date',exact=True).click()
 assert 'Grey buildings' in page.locator('.colour-section').inner_text()
 page.get_by_role('button',name='Sacred',exact=True).click()
 assert page.get_by_role('button',name='Sacred',exact=True).get_attribute('aria-pressed')=='true'
 page.get_by_role('button',name='Share this view',exact=True).click()
 shared=page.get_by_role('textbox',name='View link').input_value()
 page.goto(shared);page.reload(wait_until='networkidle');page.locator('.map-loading').wait_for(state='detached',timeout=90000)
 assert page.get_by_role('button',name='Sacred',exact=True).get_attribute('aria-pressed')=='true'
 assert page.get_by_role('button',name='Date',exact=True).get_attribute('class')=='active'
 page.get_by_role('button',name='All stories',exact=True).click()
 page.get_by_role('button',name='Replay 3D reveal',exact=True).click()
 # Reduced-motion preference disables orbital/reveal motion while retaining tours.
 reduced=b.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');reduced.on('pageerror',lambda e:errors.append(str(e)));reduced.goto(URL,wait_until='networkidle');reduced.locator('.map-loading').wait_for(state='detached',timeout=90000)
 assert reduced.get_by_role('button',name='Orbit map').is_disabled()
 assert reduced.get_by_role('button',name='Replay 3D reveal',exact=True).is_disabled()
 reduced.get_by_role('button',name='Guided tour',exact=True).click();reduced.get_by_role('button',name='Play guided tour').click()
 assert 'Qutb Minar' in reduced.locator('.tour-current').inner_text()
 reduced.get_by_role('button',name='Pause guided tour').click()
 assert reduced.evaluate('document.documentElement.scrollWidth<=innerWidth')
 reduced.wait_for_function('document.querySelector(".heritage-photo img")?.naturalWidth>0')
 reduced.wait_for_function('document.querySelector(".map-canvas").dataset.settled === "true"',timeout=30000)
 assert int(reduced.locator('.map-canvas').get_attribute('data-visible-buildings'))>0
 reduced.screenshot(path=str(OUT/'04-mobile-tour.png'))
 assert not errors,errors
 print(json.dumps({'result':'passed','checks':['automatic tour advance','pause','manual next stop','actual orbit movement','pause on drag','credited images','sourced landmark facts','OSM-linked reference and licence','building geometry details','date theme','history lenses','3D reveal','reduced motion','mobile tour layout'],'browser_errors':errors},indent=2),flush=True)
 b.close()

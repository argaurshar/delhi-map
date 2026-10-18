"""Production checks for sky-drop toggles, rapid reversals, markers and reduced motion."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:4175/delhi-map/')
OUT=Path(os.environ.get('ATLAS_TEST_OUTPUT','/workspace/scratch/delhi-layer-motion'));OUT.mkdir(exist_ok=True,parents=True)
def ready(page):
 page.locator('.map-loading').wait_for(state='detached',timeout=120000)
 page.wait_for_function('document.querySelector(".map-canvas").dataset.settled==="true"',timeout=90000)
def progress(page,key,value):
 page.wait_for_function('([key,value])=>JSON.parse(document.querySelector(".map-canvas").dataset.layerProgress)[key]===value',arg=[key,value],timeout=10000)
def intermediate(page,key):
 page.wait_for_function('(key)=>{const v=JSON.parse(document.querySelector(".map-canvas").dataset.layerProgress)[key];return v>0.15&&v<0.85}',arg=key,timeout=5000)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(URL,wait_until='networkidle');ready(page)
 # Inspect close-up massing where a rigid vertical translation is easy to see.
 page.get_by_role('textbox',name='Search places and mapped buildings').fill('relation/3926057')
 page.locator('.search-results').get_by_role('button',name='Jama Masjid Building · OSM',exact=True).click();ready(page)
 page.get_by_role('button',name='Close feature details',exact=True).click()
 fabric=page.get_by_role('switch',name='Built fabric',exact=False)
 fabric.click();intermediate(page,'buildings')
 page.screenshot(path=str(OUT/'01-lifting.png'))
 progress(page,'buildings',0);ready(page)
 assert page.locator('.map-canvas').get_attribute('data-visible-buildings')=='0'
 fabric.click();intermediate(page,'buildings')
 page.screenshot(path=str(OUT/'02-falling.png'))
 progress(page,'buildings',1);ready(page)
 assert int(page.locator('.map-canvas').get_attribute('data-visible-buildings'))>0
 page.screenshot(path=str(OUT/'03-landed.png'))
 # Four quick flips end on, with no stuck feature state or disappearing geometry.
 for _ in range(4):fabric.click();page.wait_for_timeout(90)
 progress(page,'buildings',1);ready(page)
 assert int(page.locator('.map-canvas').get_attribute('data-visible-buildings'))>0
 heritage=page.get_by_role('switch',name='Heritage & history',exact=False)
 heritage.click();page.wait_for_timeout(400)
 moving=page.locator('.heritage-marker').evaluate_all('els=>els.map(e=>({motion:e.dataset.motion,translate:getComputedStyle(e).translate,hidden:e.getAttribute("aria-hidden"),pointer:getComputedStyle(e).pointerEvents}))')
 assert any(m['motion']=='rising' and m['translate']!='0px' for m in moving),moving
 assert len({m['translate'] for m in moving})>2
 assert all(m['hidden']=='true' and m['pointer']=='none' for m in moving)
 page.wait_for_function('[...document.querySelectorAll(".heritage-marker")].every(e=>e.dataset.motion==="idle"&&getComputedStyle(e).visibility==="hidden")')
 heritage.click();page.wait_for_timeout(350)
 assert page.locator('.heritage-marker[data-motion="falling"]').count()>0
 page.wait_for_function('[...document.querySelectorAll(".heritage-marker")].every(e=>e.dataset.motion==="idle"&&getComputedStyle(e).visibility==="visible")')
 for name,key,initial in [('Landscape & water','landscape',1),('Transit & streets','transit',0),('Street network','streets',1)]:
  button=page.get_by_role('switch',name=name,exact=False)
  button.click();intermediate(page,key);progress(page,key,1-initial)
  button.click();progress(page,key,initial)
 print('Five layer toggles, staggered marker movement and rapid reversals passed',flush=True)
 # A manual layer choice pauses the tour so it cannot override the new scene.
 page.get_by_role('button',name='Guided tour',exact=True).click()
 page.get_by_role('button',name='Play guided tour',exact=True).click()
 fabric.click()
 page.get_by_role('button',name='Play guided tour',exact=True).wait_for()
 page.get_by_role('button',name='Close guided tour',exact=True).click()
 fabric.click();progress(page,'buildings',1);ready(page)
 # Replay uses the same falling masses, and changing 2D/3D does not leave translated layers behind.
 page.get_by_role('button',name='Replay 3D reveal',exact=True).click();intermediate(page,'buildings');progress(page,'buildings',1)
 page.get_by_role('button',name='Switch to 2D',exact=True).click();page.get_by_role('button',name='Switch to 3D',exact=True).wait_for();ready(page)
 fabric.click();progress(page,'buildings',0);fabric.click();intermediate(page,'buildings');progress(page,'buildings',1);ready(page)
 page.get_by_role('button',name='Switch to 3D',exact=True).click();ready(page)
 # A preference change mid-flight immediately commits the user's desired visibility.
 fabric.click();page.emulate_media(reduced_motion='reduce');progress(page,'buildings',0)
 fabric.click();progress(page,'buildings',1)
 assert page.locator('.map-canvas').get_attribute('data-layer-moving')=='false'
 heritage.click();page.wait_for_function('[...document.querySelectorAll(".heritage-marker")].every(e=>e.dataset.motion==="idle"&&getComputedStyle(e).visibility==="hidden")')
 assert not page.locator('.map-error').count()
 # Mobile keeps both layer toggles and source cards reachable.
 mobile=browser.new_page(viewport={'width':390,'height':844});mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(URL,wait_until='networkidle');ready(mobile)
 mobile.get_by_role('button',name='Show layer panel',exact=True).click()
 mf=mobile.get_by_role('switch',name='Built fabric',exact=False)
 mf.click();intermediate(mobile,'buildings');progress(mobile,'buildings',0)
 mf.click();progress(mobile,'buildings',1);ready(mobile)
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(OUT/'04-mobile.png'))
 assert not errors,errors
 print(json.dumps({'result':'passed','errors':errors,'checks':['rigid massing drop','five toggles','staggered heritage','rapid reversal','replay','2D and 3D','runtime reduced motion','mobile']}),flush=True)
 browser.close()

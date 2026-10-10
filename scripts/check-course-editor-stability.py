# Run with temporary app/ui-course-workspace/page.js exporting scripts/CourseWorkspaceReview.
# Uses simulated saves; verifies editor state and layout, not production storage.
from playwright.sync_api import sync_playwright
from pathlib import Path
Path('.review/course-spacing').mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3000/ui-course-workspace',wait_until='networkidle',timeout=120000)
 title=page.locator('input[name=title]')
 title.fill('Stable editing test')
 page.evaluate('window.originalInput=document.querySelector("input[name=title]");window.testRefreshServerProps()')
 page.wait_for_timeout(2200)
 assert page.evaluate('window.originalInput===document.querySelector("input[name=title]")')
 assert not page.get_by_text('Unsaved changes were found on this browser.',exact=True).count()
 assert title.input_value()=='Stable editing test'
 count=page.evaluate('window.testSaves.length')
 page.wait_for_timeout(2200)
 assert page.evaluate('window.testSaves.length')==count,'repeated autosave when idle'
 title.fill('Enter must keep this title')
 title.press('Enter')
 page.wait_for_timeout(1500)
 assert title.input_value()=='Enter must keep this title'
 assert page.evaluate('window.originalInput===document.querySelector("input[name=title]")')
 page.get_by_role('button',name='Modules & lessons').click()
 page.get_by_role('button',name='Add module',exact=True).click()
 page.get_by_role('button',name='Add lesson',exact=True).click()
 lesson=page.get_by_label('Lesson title',exact=True)
 lesson.fill('Retained lesson text');lesson.press('Enter')
 page.wait_for_timeout(1600)
 assert lesson.input_value()=='Retained lesson text'
 assert page.locator('.lesson-editor').evaluate('(node)=>node.open')
 page.get_by_text('Module options',exact=True).click()
 for width in [1440,768,390]:
  page.set_viewport_size({'width':width,'height':1000})
  buttons=page.locator('.reorder-buttons').first.locator('button')
  a=buttons.nth(0).bounding_box();b=buttons.nth(1).bounding_box()
  assert b['x']-(a['x']+a['width'])>=7,'reorder buttons touching'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  bar=page.locator('.cw-save-bar');before=bar.bounding_box()
  lesson.fill('Typing at width '+str(width))
  page.wait_for_timeout(1300)
  during=bar.bounding_box()
  page.wait_for_timeout(900)
  after=bar.bounding_box()
  assert before['height']==during['height']==after['height'],'save bar changes height'
  page.screenshot(path=f'.review/course-spacing/{width}.png',full_page=True)
 assert not errors,errors
 print('PASS: server prop refresh does not pause or replace editor; Enter retains fields; no idle autosave loop; stable save bar and button spacing at 1440/768/390')
 browser.close()

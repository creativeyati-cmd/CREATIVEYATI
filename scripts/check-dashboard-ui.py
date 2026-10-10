from playwright.sync_api import sync_playwright
from pathlib import Path
import os
Path('.review').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH', r'C:\Program Files\Google\Chrome\Application\chrome.exe'),headless=True)
 page=b.new_page()
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 for view in ['ui-admin','ui-student','live-admin','live-student']:
  page.goto(os.environ.get('DASHBOARD_TEST_URL','http://localhost:3000')+'/design-review?view='+view)
  for width in [1440,1024,768,390]:
   page.set_viewport_size({'width':width,'height':1000})
   page.locator('.dashboard-page-header').wait_for()
   page.wait_for_timeout(300)
   overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
   assert not overflow,(view,width,page.evaluate('document.documentElement.scrollWidth'))
   page.screenshot(path='.review/unified-'+view+'-'+str(width)+'.png',full_page=True)
   if view=='ui-admin' and width==1440:
    nav=page.locator('.dashboard-sidebar-item').first
    before=nav.locator('span').bounding_box()
    nav.evaluate("el=>el.classList.add('is-active')")
    after=nav.locator('span').bounding_box()
    assert before==after,(before,after)
    assert page.locator('tbody tr').count()==20
    page.get_by_role('button',name='Next',exact=True).click()
    assert page.locator('tbody tr').count()==5
    page.get_by_placeholder('Search projects').fill('Project 25')
    assert page.locator('tbody tr').count()==1
    page.get_by_role('button',name='View details',exact=True).click()
    assert page.locator('dialog[open]').count()==1
    page.keyboard.press('Escape')
    assert page.locator('dialog[open]').count()==0
    page.get_by_placeholder('Search projects').fill('no-match')
    page.get_by_text('No matching records',exact=True).first.wait_for()
    page.get_by_placeholder('Search projects').fill('')
    page.locator('.dashboard-table-tools').get_by_label('Status',exact=True).select_option('draft')
    assert page.locator('tbody tr').count()==12
    page.locator('.dashboard-table-tools').get_by_label('Status',exact=True).select_option('')
    page.locator('.dashboard-table-tools').get_by_label('Sort text A-Z',exact=True).select_option('0')
    assert page.locator('tbody tr').first.inner_text().startswith('An unusually long')
    page.get_by_role('button',name='Delete sample',exact=True).click()
    page.locator('dialog[open]').get_by_role('button',name='Cancel',exact=True).click()
    assert page.locator('dialog[open]').count()==0
    assert page.get_by_role('button',name='Delete sample',exact=True).evaluate('el=>el===document.activeElement')
    colors=[page.locator('#form .row-actions').get_by_role('button',name=name,exact=True).evaluate('(el)=>getComputedStyle(el).backgroundColor') for name in ['Save changes','Cancel','Delete']]
    assert colors==['rgb(44, 84, 60)','rgb(255, 255, 255)','rgb(255, 245, 244)'],colors
    page.get_by_role('button',name='Collapse sidebar',exact=True).click();page.wait_for_timeout(400)
    nav=page.locator('.dashboard-sidebar-item').first
    before=nav.locator('svg').bounding_box();nav.evaluate("el=>el.classList.toggle('is-active')");assert before==nav.locator('svg').bounding_box()
    page.get_by_role('button',name='Expand sidebar',exact=True).click();page.wait_for_timeout(400)
   if view=='ui-student' and width==390:
    page.get_by_role('button',name='Open navigation',exact=True).click()
    assert page.locator('.admin-shell').evaluate("el=>el.classList.contains('is-nav-open')")
    page.get_by_role('button',name='Close navigation',exact=True).first.click()
   print('PASS',view,width,flush=True)
 assert not errors,errors
 b.close()

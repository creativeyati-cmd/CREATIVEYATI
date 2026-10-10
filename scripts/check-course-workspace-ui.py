from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",headless=True)
 page=browser.new_page(viewport={"width":1440,"height":1000})
 errors=[]
 page.on("pageerror",lambda error: errors.append(str(error)))
 page.goto("http://localhost:3000/ui-course-workspace",wait_until="networkidle",timeout=120000)
 page.wait_for_timeout(3000)
 page.locator('input[name="title"]').fill("An unfinished course")
 page.wait_for_timeout(2400)
 assert page.evaluate("window.testSaves?.length") == 1, page.evaluate("window.testSaves")
 assert page.evaluate("window.testSaves[0].document.title") == "An unfinished course"
 page.get_by_role("button",name="Modules & lessons").click()
 page.get_by_role("button",name="Add module",exact=True).click()
 page.get_by_label("Module title",exact=True).fill("First module")
 page.get_by_role("button",name="Add lesson",exact=True).click()
 page.locator('.lesson-editor summary').click()
 page.locator('input[name="title"]').fill("First lesson")
 page.locator('input[name="slug"]').fill("first-lesson")
 page.get_by_text("Text",exact=True).click()
 page.locator('textarea[name="body"]').fill("Written content")
 page.wait_for_timeout(2200)
 assert page.evaluate("window.testSaves.at(-1).document.sections[0].lessons[0].body") == "Written content"
 page.evaluate("window.testFail=true")
 page.locator('input[name="title"]').fill("Recovered lesson")
 page.wait_for_timeout(2200)
 assert page.get_by_text("Save failed",exact=True).count()
 key="avc-course:fixture:00000000-0000-4000-8000-000000000099"
 recovered=page.evaluate("key=>JSON.parse(localStorage.getItem(key))",key)
 assert recovered['document']['sections'][0]['lessons'][0]['title']=='Recovered lesson'
 # Simulate refresh with the last server revision, then recover the local copy.
 recovered['revision']=1
 page.evaluate("([key,value])=>localStorage.setItem(key,JSON.stringify(value))",[key,recovered])
 page.on("dialog",lambda dialog:dialog.accept())
 page.add_init_script("localStorage.setItem("+json.dumps(key)+","+json.dumps(json.dumps(recovered))+");")
 page.reload(wait_until="networkidle")
 page.wait_for_timeout(3000)
 page.get_by_role("button",name="Recover changes",exact=True).click()
 page.wait_for_timeout(2200)
 assert page.evaluate("window.testSaves.at(-1).document.sections[0].lessons[0].title") == "Recovered lesson"
 for width in [1440,768,390]:
  page.set_viewport_size({"width":width,"height":1000})
  page.screenshot(path=f".review/course-workspace/{width}.png",full_page=True)
  assert page.evaluate("document.documentElement.scrollWidth<=window.innerWidth"),f"overflow at {width}"
 assert not errors, errors
 browser.close()
 print("PASS browser autosave, incomplete draft, lesson capture, failed-save retention, refresh recovery, responsive widths")

from playwright.sync_api import sync_playwright
import base64,json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",headless=True)
 page=b.new_page(viewport={"width":390,"height":1000});errors=[];page.on("pageerror",lambda e:errors.append(str(e)))
 page.goto("http://localhost:3000/ui-course-workspace",wait_until="networkidle",timeout=120000);page.wait_for_timeout(3000)
 data=page.evaluate("()=>{const c=document.createElement('canvas');c.width=1920;c.height=1280;const ctx=c.getContext('2d');ctx.fillStyle='green';ctx.fillRect(0,0,1920,1280);return c.toDataURL('image/png').split(',')[1];}")
 calls=[]
 def upload(route):
  calls.append(route.request.post_data_buffer)
  route.fulfill(status=200,content_type="application/json",body=json.dumps({"url":"https://example.com/cover.webp","width":1920,"height":1080}))
 page.route("**/api/admin/course-cover",upload)
 page.locator('input[type="file"]').set_input_files({"name":"cover.png","mimeType":"image/png","buffer":base64.b64decode(data)})
 dialog=page.get_by_role("dialog",name="Crop course cover",exact=True);dialog.wait_for()
 page.get_by_label("Vertical position",exact=True).fill("80")
 page.get_by_role("button",name="Use crop & upload",exact=True).click()
 page.wait_for_timeout(2600)
 assert len(calls)==1 and b"course-cover.webp" in calls[0]
 assert page.evaluate("window.testSaves.at(-1).document.coverWidth")==1920
 page.get_by_role("button",name="Review & publish",exact=False).click()
 assert page.get_by_role("button",name="Update published course",exact=True).is_disabled()
 page.get_by_role("button",name="Add a full description.",exact=False).click()
 page.wait_for_timeout(300)
 assert page.evaluate("document.activeElement.name")=="description"
 for width in [1440,768,390]:
  page.set_viewport_size({"width":width,"height":1000});page.screenshot(path=f".review/course-workspace/styled-{width}.png",full_page=True)
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"),width
 assert not errors,errors
 b.close();print("PASS 16:9 crop upload, durable media reference autosave, publishing checklist focus and responsive shared dashboard styles")

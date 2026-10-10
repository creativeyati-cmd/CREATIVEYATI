from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",headless=True)
 page=b.new_page(viewport={"width":390,"height":900});errors=[];page.on("pageerror",lambda e:errors.append(str(e)))
 page.goto("http://localhost:3000/ui-course-workspace",wait_until="networkidle",timeout=120000);page.wait_for_timeout(3000)
 page.get_by_role("button",name="Resources",exact=False).click()
 calls=[0]
 def upload(route):
  calls[0]+=1
  if calls[0]==1:route.fulfill(status=502,content_type="application/json",body=json.dumps({"error":"Interrupted upload"}))
  else:route.fulfill(status=200,content_type="application/json",body=json.dumps({"id":"00000000-0000-4000-8000-000000000098","title":"Notes","storageKey":"00000000-0000-4000-8000-000000000099/draft/notes.pdf","fileSize":18,"allowDownload":True,"previewAllowed":False}))
 page.route("**/api/admin/course-draft-resource",upload)
 page.get_by_label("Upload PDF",exact=True).set_input_files({"name":"notes.pdf","mimeType":"application/pdf","buffer":b"%PDF-1.4 test"})
 page.get_by_text("Interrupted upload",exact=True).wait_for()
 page.get_by_role("button",name="Retry upload",exact=True).click()
 page.get_by_label("Document title",exact=True).wait_for();page.wait_for_timeout(2400)
 assert page.evaluate("window.testSaves.at(-1).document.materials[0].title")=="Notes"
 # Offline changes do not issue a request and are sent once reconnected.
 before=page.evaluate("window.testSaves.length");page.context.set_offline(True)
 page.get_by_label("Document title",exact=True).fill("Offline notes");page.wait_for_timeout(2200)
 assert page.evaluate("window.testSaves.length")==before
 page.context.set_offline(False);page.wait_for_timeout(2200)
 assert page.evaluate("window.testSaves.at(-1).document.materials[0].title")=="Offline notes"
 # A rejected optimistic revision never silently overwrites another editor.
 page.evaluate("window.testFail=true;window.testConflict=true")
 page.get_by_label("Document title",exact=True).fill("Conflicted copy");page.wait_for_timeout(2200)
 page.get_by_role("button",name="Reload latest draft",exact=True).wait_for()
 count=page.evaluate("window.testSaves.length");page.get_by_role("button",name="Retry save",exact=True).click();page.wait_for_timeout(1800)
 assert page.evaluate("window.testSaves.length")==count
 assert not errors,errors
 b.close();print("PASS interrupted PDF upload/retry, offline reconnect and conflict stop")

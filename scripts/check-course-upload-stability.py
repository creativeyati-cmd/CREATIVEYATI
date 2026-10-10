from playwright.sync_api import sync_playwright
# Temporary /ui-course-upload-stability renders CourseWorkspaceReview with httpSave.
# Exercises actual JSON save transport with simulated database/storage responses.
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1280,'height':1000})
 saves=[]; held=[]; errors=[];finalize_fail=[True]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def save(route):
  data=route.request.post_data_json;saves.append(data)
  route.fulfill(json={'ok':True,'revision':data['revision']+1})
 page.route('**/api/admin/course-workspace',save)
 page.goto('http://localhost:3000/ui-course-upload-stability',wait_until='networkidle')
 page.locator('input[name=title]').fill('Upload continuity')
 page.wait_for_timeout(2200)
 assert saves and '/new?draft=' in page.url
 page.get_by_role('button',name='Modules & lessons').click()
 page.get_by_role('button',name='Add module',exact=True).click()
 page.get_by_role('button',name='Add lesson',exact=True).click()
 lesson=page.get_by_label('Lesson title',exact=True);lesson.fill('Before upload')
 key='00000000-0000-4000-8000-000000000099/11111111-1111-4111-8111-111111111111/video.mp4'
 def video(route):
  if route.request.post_data_json['action']=='sign':route.fulfill(json={'provider':'r2','headers':{'Content-Type':'video/mp4','If-None-Match':'*'},'signedUrl':'http://localhost:3000/held-video','storageKey':key})
  elif finalize_fail[0]:route.fulfill(status=502,json={'error':'Verification interrupted. Retry.'})
  else:route.fulfill(json={'storageKey':key,'processingStatus':'ready','width':640,'height':360,'durationSeconds':2,'orientation':'landscape','aspectRatio':16/9})
 page.route('**/api/admin/course-video',video)
 page.route('**/held-video',lambda route:held.append(route))
 page.get_by_label('Upload lesson video',exact=True).set_input_files('.review/course-upload/sample.mp4')
 page.wait_for_function('document.querySelector("[data-course-uploading=true]")!==null')
 page.wait_for_timeout(2000)
 assert held
 page.evaluate('window.originalUploader=document.querySelector(".direct-video-upload");window.testRefreshServerProps()')
 lesson.fill('Edited during upload');page.wait_for_timeout(2200)
 assert saves[-1]['document']['sections'][0]['lessons'][0]['title']=='Edited during upload'
 assert page.evaluate('window.originalUploader===document.querySelector(".direct-video-upload")')
 assert not page.get_by_role('button',name='Recover changes',exact=True).count()
 accept=lambda d:d.accept()
 page.on('dialog',accept)
 page.get_by_role('button',name='Remove lesson',exact=True).click()
 assert page.locator('.lesson-editor').count()==1
 assert page.locator('[data-course-uploading=true]').count()
 page.remove_listener('dialog',accept)
 page.on('dialog',lambda d:d.dismiss())
 page.get_by_role('link',name='Back to courses',exact=True).click()
 assert page.locator('[data-course-uploading=true]').count()
 assert held[0].request.headers['content-type']=='video/mp4'
 assert held[0].request.headers['if-none-match']=='*'
 held[0].fulfill(status=200,body='{}')
 page.get_by_text('Verification interrupted. Retry.',exact=True).wait_for()
 finalize_fail[0]=False
 page.get_by_role('button',name='Retry upload',exact=True).click()
 page.wait_for_function('document.querySelector("input[name=processingStatus]").value==="ready"')
 page.wait_for_timeout(2200)
 assert saves[-1]['document']['sections'][0]['lessons'][0]['storageKey']==key
 assert len(held)==1, "Verification retry uploaded duplicate video bytes"
 assert not errors,errors
 print('PASS: JSON autosave during delayed upload, stable draft URL/uploader, no recovery prompt, cancelled navigation preserves upload, media saved after completion')
 b.close()

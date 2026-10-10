from playwright.sync_api import sync_playwright
import urllib.request
from pathlib import Path
# Temporary dev route: export { default } from "@/scripts/CourseWorkspaceReview";
# Storage responses are mocked; this does not verify production credentials.
Path('.review/course-upload').mkdir(parents=True,exist_ok=True)
if not Path('.review/course-upload/sample.mp4').exists():
 urllib.request.urlretrieve('https://storage.googleapis.com/stream-example-bucket/video.mp4','.review/course-upload/sample.mp4')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3000/ui-course-workspace',wait_until='networkidle',timeout=120000)
 page.get_by_role('button',name='Modules & lessons').click()
 page.get_by_role('button',name='Add module',exact=True).click()
 page.get_by_label('Module title',exact=True).fill('Getting started')
 page.get_by_role('button',name='Add lesson',exact=True).click()
 page.get_by_label('Lesson title',exact=True).fill('Your first film')
 assert page.get_by_label('Lesson URL slug',exact=True).input_value()=='your-first-film'
 assert page.get_by_role('radio',name='Upload video',exact=True).is_checked()
 assert not page.get_by_label('Transcript',exact=True).is_visible()
 requests=[]; fail=[True]
 key='00000000-0000-4000-8000-000000000099/11111111-1111-4111-8111-111111111111/video.webm'
 def video_api(route):
  data=route.request.post_data_json;requests.append(data)
  if data['action']=='sign':
   if fail[0]: route.fulfill(status=502,json={'error':'Test storage connection failed. Retry.'})
   else: route.fulfill(json={'provider':'r2','headers':{'Content-Type':'video/mp4','If-None-Match':'*'},'signedUrl':'http://localhost:3000/test-storage-video','storageKey':key})
  else: route.fulfill(json={'storageKey':key,'previewUrl':'','processingStatus':'ready','width':640,'height':360,'durationSeconds':2,'orientation':'landscape','aspectRatio':16/9})
 page.route('**/api/admin/course-video',video_api)
 page.route('**/test-storage-video',lambda route:route.fulfill(status=200,body='{}'))
 page.get_by_label('Upload lesson video',exact=True).set_input_files('.review/course-upload/sample.mp4')
 page.get_by_text('Test storage connection failed. Retry.',exact=True).wait_for(timeout=30000)
 fail[0]=False
 page.get_by_role('button',name='Retry upload',exact=True).click()
 page.wait_for_function("document.querySelector('input[name=processingStatus]')?.value==='ready'",timeout=30000)
 page.wait_for_timeout(2400)
 assert page.evaluate("window.testSaves.at(-1).document.sections[0].lessons[0].storageKey")==key
 pdf_calls=[]
 def pdf_api(route):
  body=route.request.post_data_json;pdf_calls.append(body)
  assert len(route.request.post_data)<2000
  if body['action']=='sign':route.fulfill(json={'storageKey':'00000000-0000-4000-8000-000000000099/draft/33333333-3333-4333-8333-333333333333.pdf','provider':'r2','headers':{'Content-Type':'video/mp4','If-None-Match':'*'},'signedUrl':'http://localhost:3000/test-storage-pdf'})
  else:route.fulfill(json={'id':'33333333-3333-4333-8333-333333333333','title':'Workbook','storageKey':body['storageKey'],'fileSize':body['fileSize'],'allowDownload':True,'previewAllowed':False})
 page.route('**/api/admin/course-draft-resource',pdf_api)
 page.route('**/test-storage-pdf',lambda r:r.fulfill(status=200,body='{}'))
 page.get_by_label('Upload PDF',exact=True).set_input_files({'name':'Workbook.pdf','mimeType':'application/pdf','buffer':b'%PDF-'+b'0'*(8*1024*1024)})
 page.get_by_label('Document title',exact=True).wait_for(timeout=30000)
 assert [x['action'] for x in pdf_calls]==['sign','finalize']
 page.get_by_role('button',name='Duplicate lesson',exact=True).click()
 assert page.locator('.lesson-editor').count()==2
 for width in [1440,768,390]:
  page.set_viewport_size({'width':width,'height':1000})
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'overflow {width}'
  page.screenshot(path=f'.review/course-upload/after-{width}.png',full_page=True)
 assert not errors,errors
 print('PASS: automatic lesson slug, direct-upload default, collapsed options, video failure/retry and autosave, 8MB direct PDF transfer, lesson duplication, 1440/768/390 widths, no browser errors')
 b.close()

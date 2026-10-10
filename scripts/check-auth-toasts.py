import os
from urllib.parse import quote
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH',r'C:\Program Files\Google\Chrome\Application\chrome.exe'),headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000})
 base=os.environ.get('AUTH_TEST_URL','http://localhost:3000')
 for path in ['/login','/admin/login','/reset-password','/verify-email']:
  message='Invalid email or password.' if 'login' in path else 'The code is invalid or expired.'
  page.goto(base+path+'?error='+quote(message),wait_until='commit')
  toast=page.locator('.app-toast.is-error')
  toast.get_by_text(message,exact=True).wait_for()
  toast.get_by_role('button',name='Dismiss notification').click();page.wait_for_timeout(350)
  # A new server render must announce the same error again on the same DOM node.
  page.locator('.fm-auth').evaluate("el=>el.dataset.toastCycle=crypto.randomUUID()")
  toast.get_by_text(message,exact=True).wait_for()
  assert page.locator('.fm-auth .form-error').count()==0
  assert page.locator('.fm-auth [data-toast-kind=error]').is_hidden()
  print('PASS error and repeated error',path,flush=True)
 page.goto(base+'/login',wait_until='commit')
 page.get_by_role('button',name='Sign in',exact=True).click()
 page.locator('.app-toast').get_by_text('Email is required.',exact=True).wait_for()
 page.get_by_label('Email',exact=True).fill('invalid-address')
 page.get_by_role('button',name='Sign in',exact=True).click()
 page.locator('.app-toast').get_by_text('Enter a valid email address.',exact=True).wait_for()
 page.goto(base+'/register',wait_until='networkidle')
 page.locator('input[name=fullName]').fill('Test learner')
 page.locator('input[name=email]').fill('test@example.invalid')
 page.locator('input[name=password]').fill('test-password-12345')
 page.locator('input[name=confirmPassword]').fill('different-password-12345')
 page.get_by_role('button',name='Create account',exact=True).click()
 page.locator('.app-toast').get_by_text('Your passwords do not match.',exact=True).wait_for()
 page.set_viewport_size({'width':390,'height':900})
 rect=page.locator('.app-toast-stack').bounding_box()
 assert abs(rect['x']+rect['width']/2-195)<2
 print('PASS required/email/password-match validation and mobile toast placement',flush=True)
 b.close()

# Browser verification

`scripts/verify.mjs` drives real headless Chrome over the DevTools Protocol and reports what a
build cannot: layout overflow, runtime errors, and whether the responsive rules actually resolve.
It has no dependencies — it uses Node's built-in `fetch` and `WebSocket`.

## Run it

```bash
npm run verify                                     # against http://localhost:3000
VERIFY_BASE_URL=https://aivideocreator.cv npm run verify
VERIFY_ROUTES=/courses,/contact npm run verify     # a subset
```

Start the app first (`npm run dev` or `npm run start`). The harness exits non-zero when it finds a
problem, so it can gate a deploy.

## What it checks

For every route at 390px, 768px and 1440px:

- **no horizontal overflow** — `scrollWidth` against `innerWidth`, the objective test for "is it
  responsive";
- **no uncaught exceptions or console errors**;
- **the responsive rules resolved** — the dashboard navigation trigger is present on a phone, the
  sidebar is present on a wide viewport, and tables report whether their header is visually hidden.

It writes a screenshot per route and viewport plus `report.json` (default output: a temp folder,
override with `VERIFY_OUT`).

## Signed-in routes

`/learn`, `/admin`, `/admin/courses`, `/admin/invoices` and `/admin/certificates` are only checked
when you pass a session cookie, because they redirect otherwise:

```bash
VERIFY_SESSION_COOKIE="sb-<project>-auth-token=…" npm run verify
```

Copy the cookie from your browser's devtools once signed in. Treat that value as a secret; it is
only read from the environment and never written to the report.

## What it does not do

- It does not click through flows or submit forms; it is a rendering and layout check, not an
  end-to-end test suite.
- It does not verify payments. Bachs settlement needs a sandbox key and a real signed webhook.
- Screenshots are for a human to look at. The harness cannot judge whether a page looks right.

## Requirements

Node 22 or newer (for the built-in `WebSocket`), and Chrome or Edge installed. Set `VERIFY_CHROME`
if yours is somewhere unusual.

# Dashboard and platform roadmap

Current status: see [Production TODO](PRODUCTION-TODO.md), reviewed 2026-10-04.
The phase definitions below remain the plan; historical status statements below
are superseded by that review where they differ from the current source.

Phases for closing the gap between this app and the attached KORO reference
(`_reference-design/play around/dist/settings-dashboard`). Evidence for the
comparison is in `docs/DASHBOARD-DESIGN.md` and the keyword inventory below:
`audit 346 · filter 326 · member 188 · role 187 · session 115 · drawer 55 ·
confirm 52 · modal 48 · password 44 · theme 41 · search 37 · toast 22 ·
skeleton 20 · notification 18`.

The reference is a **workspace settings admin**. This app is a **content and
commerce admin**. So the phases below borrow its operations layer — audit,
filtering, interaction primitives — and deliberately ignore its team layer.

## Rules that apply to every phase

- One phase per branch, one pull request, deployed through the deploy hook.
- Build against the design tokens from phase 1a. No new hard-coded values.
- Verification each time: `npm run build`, `npx eslint Components lib app`, and a
  live probe on the deployed URL. A phase is not done until it is on the live site.
- Never touch `lib/carousel/*` or `engine.js` invariants.
- Styling only where a phase says so; behaviour changes ship with their own note.

## Phase 1 — Audit log

The reference's centrepiece (346 references) and this app's most embarrassing gap:
the `activity_logs` table has existed since the first migration and has no UI.

- `lib/data/activity.js` — read the log with actor, action, target, metadata, time.
- `app/admin/(protected)/activity/page.js` — reverse-chronological list.
- `AdminNavigation` entry.
- Detail opens in the **`Drawer`** (its first real use) rather than a cell.
- Filters: actor, action, date range. Query-string driven, server-rendered.
- Acceptance: a publish, a certificate revocation and an invoice settlement each
  appear with who did it and when; filters narrow the list; empty state explains
  what will appear.

## Phase 2 — Filtering across the admin tables

The reference's heaviest investment (326) and this app has none anywhere.
Videos, invoices, orders, certificates all need it before they grow.

- Shared, query-string driven filter bar; no client state, no page reload cost.
- Per entity: text search, status, date range, and a count of what is filtered out.
- Acceptance: each list can be narrowed to "unpaid invoices this month" in one step.

## Phase 3 — Loading and pending states

The app has **zero** skeletons. Server actions give no feedback between submit
and revalidate, which is what makes forms feel dead.

- Skeleton components for tables, cards and detail panels.
- Adopt `SubmitButton` in every form (currently one adoption: the revoke dialog).
- `aria-busy` on the regions that are loading.
- Acceptance: no view ever renders a blank space where content is coming.

## Phase 4 — Adopt and consolidate the primitives

- `Drawer` into invoice detail (line items, receipts, record payment),
  certificate detail, order detail.
- One confirmation pattern for destructive actions, replacing the overlap between
  `ConfirmActionForm` and `ConfirmSubmitButton`.
- One feedback standard: `AdminToast` for completed actions, inline for validation.
  Retire the `?saved=1` query-string notices.
- Acceptance: no detail view is crushed into a table cell; no action finishes silently.

## Phase 5 — Admin search

- A command sheet (the reference sizes it at `--layout-search-width: 810px`).
- Searches videos, invoices, certificates, orders and students; keyboard first.
- Acceptance: ⌘K, type three characters, reach any record without the sidebar.

## Phase 6 — Account security

Reference: session 115, password 44, 2fa 21, device 21. This matters more here
than in a design mock, because the admin can move money and issue credentials.

- Supabase MFA enrolment and enforcement.
- Active sessions and devices, with revoke.
- Password change with re-authentication.
- Acceptance: 2FA can be enabled and is required for destructive actions.

## Phase 7 — Appearance

- Dashboard theme (light, dark, system) built on the existing token layer, so it
  is a token swap rather than a second stylesheet.
- Acceptance: switching theme changes no layout, only values.

## Deliberately not built

| Feature | Reference weight | Why not |
| --- | --- | --- |
| Members, roles, invites | 188 + 187 + 22 | A team system for a studio run alone adds permission complexity to every page for no user. Revisit if staff are hired. |
| Workspaces | 109 | Same reason; one brand, one dashboard. |
| API keys | 4 | Nothing consumes them yet. |

## Current state at the time of writing

Phase 0 (spec), 1a (tokens), 1b (admin shell) and 2a (admin page patterns) are
merged and live. The offline delivery layer (watermark, service worker, cache
purge), certificates with PDF download, client invoicing with PDF documents, the
academy home and the redesigned navigation are also live.

Primitives exist but are barely adopted: `Drawer` is used nowhere, `SubmitButton`
in one place. Phase 3 and 4 are mostly adoption, not construction.

---

## Content boundaries (do not cross these)

Studio work and student work are separate content, with separate sources.

| | Source | Appears on |
| --- | --- | --- |
| **Studio work** - client films made by Frame / Motion | `public.videos` (14 published rows) | `/`, `/work`, the studio portfolio, the home hero gallery |
| **Student work** - films made by students during a course | **its own table, not yet built** | Academy home showcase, `/academy/student-work`, "Student work from this course" on course detail |

Rules that follow from this:

1. **Never read `videos` for an Academy student-work section.** The 14 published rows are client
   commissions. Presenting them as student output would be an untrue claim to a prospective
   student, which is the one thing this site cannot afford.
2. **Never merge the two into one gallery**, not even with a filter or a tag. They answer
   different questions - "can this studio do the work?" versus "can I learn to do this?" - and a
   mixed grid answers neither.
3. **A student work item needs**: student name, course, the film itself, a poster frame, an
   optional note about the project, and the consent of the student to be shown publicly.
   Consent is a field, not an assumption.
4. Until that table exists, the Academy student-work sections render a **labelled placeholder**
   (`[Student film still]` per the design brief), not borrowed studio stills.

### Effect on the build order

The Academy student-work phase becomes **schema first**: a `student_work` table, an admin screen
to add and publish items with a consent flag, then the public gallery. It cannot be built as a
pure UI phase, and it must not be unblocked by reusing `videos`.

### Note on editing this repository's text files

PowerShell text writes in this environment are only safe for ASCII. Appending or rewriting a file
that contains a non-ASCII character (an em dash, a middle dot, the naira sign) writes a single-byte
sequence and leaves the file invalid UTF-8, which breaks the build with
`invalid utf-8 sequence of 1 bytes`. Use the editor tool for any file containing non-ASCII, or keep
the content ASCII.

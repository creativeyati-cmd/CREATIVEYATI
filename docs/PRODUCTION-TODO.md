## Course authoring workspace - 9 October 2026

- [x] Private persistent course revisions, draft autosave, local recovery, conflict checks and atomic publication implemented.
- [x] Unified editor, curriculum actions, upload/crop improvements, publishing checklist, archive/trash/restore and version history.
- [x] Administrator reported applying `supabase/production-course-workspaces.sql` on 9 October 2026; production database verification remains part of acceptance testing.
- [ ] Complete authenticated production acceptance tests with real media and student progress.

Release and acceptance details: [COURSE-WORKSPACE-RELEASE.md](COURSE-WORKSPACE-RELEASE.md).

## Dashboard UI consistency - 7 October 2026

- [x] Shared admin/student page shell, headers, metrics and stable selected sidebar geometry.
- [x] Shared table controls, status treatment, form controls, buttons and confirmation styling.
- [x] Existing settings and website content routes grouped for navigation.
- [x] Desktop/laptop/tablet/mobile component checks, build and lint (existing image warnings only).
- [ ] Signed-in production QA of real CRUD, uploads, payments and course completion with account sessions.

Audit and reuse guidance: [DASHBOARD-CONSISTENCY.md](DASHBOARD-CONSISTENCY.md).

## 7 October 2026 ? dashboard integration

The redesigned layouts now render on the authenticated `/admin` and `/learn` routes through `AdminWorkspace` and `StudentWorkspace`. The `/design-review` samples remain development-only and are not the production entry points.

- Admin: real course/student/certificate counts, successful course-payment charts separated by currency, student growth, completion metrics, course spotlight, and actual action links.
- Student: real progress, next lessons, certificates, completion-day streaks, learning chart, and weekly goals saved to the signed-in account metadata.
- New `/admin/students` directory supports name search and pagination; enrolment management remains on each course's Students page.
- Totals are paginated past database row limits. Data failures surface through the existing error boundaries rather than returning sample numbers.
- Browser fixture checks: populated and empty dashboards at 390px and 1440px, chart controls, lesson links, and no horizontal overflow or browser exceptions.
- Automated checks: Lagos calendar boundaries, minor-unit conversion, streaks, duplicate/draft lesson handling, pagination over 1,000 records, and administrator guard.
- Outstanding: authenticated production walkthrough using actual admin MFA and student accounts, including saving a weekly goal and comparing production chart totals against orders. Browser fixtures do not prove live RLS or record completeness.
- No database migration required for this integration. Existing tables, RLS, and Auth user metadata are used.

---

# Dashboard production TODO

## Current implementation — 2026-10-05

### Academy redesign and supplied content

- [x] Rebuild `/academy` with the reference's pale green/forest palette, editorial
  hero, existing visual assets, instructor story, learning steps, course cards,
  FAQs and closing CTA. Desktop/mobile layouts reviewed at 1440px and 390px.
- [x] Remove public placeholder instructions and unsupported lesson counts,
  lifetime-access/refund claims. Display published course prices from the existing
  course data, including active sale pricing; no invented course catalogue.
- [x] Fix Academy navigation links to real sections/pages.
- [x] Apply supplied AI creator/editor/tutor identity copy to home, about and
  services; add descriptive titles and canonicals to the main public pages.
- [x] Add Person/ProfessionalService relationships, Academy education schema and
  Course schema for actual published courses; add robots.txt and dynamic sitemap.
- [ ] Connect the staging catalogue and verify populated course cards and sitemap
  entries. Current local preview has no database-backed course records.
- [ ] Write dedicated service/training landing pages and factual project case
  studies from the supplied longer SEO plan. Do not invent client credits/results.
- [ ] Validate deployed canonical URLs, structured data and crawl/index status
  after rollout. No ranking or AI-search placement is guaranteed by these changes.

The dashboard/document/security changes are on `feat/dashboard-documents-and-access`.
They have **not been deployed or applied to the production database**. See
[release checks and rollout](DASHBOARD-RELEASE.md). The October 4 audit below is
retained as the baseline; its unchecked items are superseded by this status list.

- [x] AI VIDEO CREATOR receipt and certificate layouts, downloadable PDFs,
  embedded Unicode fonts, certificate verification QR and configurable branding.
- [x] Student payment receipt download with ownership checks; client receipts
  after settlement; separate displayed totals by currency.
- [x] Transactional, retry-safe invoice settlement implemented in SQL and wired
  to manual/provider settlement. Database execution remains to be verified.
- [x] Grouped admin navigation; student mobile tabs; shared focus trap, Escape,
  collapse persistence and corrected desktop/mobile CSS breakpoints.
- [x] Registration, login, email verification, recovery and checkout presentation.
  Preserve checkout destination through registration and verification.
- [x] Admin authenticator setup/challenge and application-level AAL2 enforcement;
  database enforcement migration; retire legacy password-only admin bypass.
- [x] Recovery grant restricted to an exchanged recovery link; session refresh;
  verified-user profile creation; admin session sign-out controls.
- [x] Multiple-module curriculum retained; module deletion confirmation; Students
  workflow link; progress ignores lessons no longer in the published curriculum.
- [x] Published lesson access enforced for media/resources/completion; shared
  offline media caching disabled and old caches cleared.
- [x] Dashboard route loading/error boundaries; invoice/certificate query errors
  surfaced; audit writes check returned errors and validate actor UUIDs.
- [ ] Configure a real staging environment: current local `.env.local` contains
  a placeholder Supabase URL, so authenticated integration QA is not possible.
- [ ] Verify migrations, admin Auth account mappings, SMTP/confirmation settings,
  TOTP and callback allowlist before deploying this authentication change.
- [ ] Execute paid/free purchase, module playback, certificate issuance, receipt,
  recovery, MFA, cross-account isolation and webhook replay acceptance tests.
- [ ] Finish remaining planned filters/pagination, detail drawers, admin search,
  themes, student-work publishing and newsletter delivery. These remain scope.
- [x] Replace capped financial summaries with database aggregation by currency;
  distinguish overview query failures from zero counts. Migration
  `202610050001_admin_finance_summary.sql` must be applied before deployment.
  Outstanding/overdue exclude drafts, quotes, declined and void documents.
- [x] Upgrade Next.js/ESLint config to 16.3.8, Sharp to 0.35.5 and Nodemailer to
  10.0.14; update compatible transitive dependencies. Production dependency audit
  reports zero known vulnerabilities on 2026-10-05.
- [ ] Resolve the remaining development-only `braces` advisory in the ESLint
  dependency chain (five package findings). Do not apply the suggested automatic
  downgrade to `eslint-config-next@14.2.35` in this Next 16 project.
- [ ] Production rollout, deployment SHA, monitoring and operational sign-off.

## Baseline audit — 2026-10-04

Reviewed 2026-10-04 against local `main` at `26f2041`, the dashboard roadmap,
design document, work log, and public production route responses.

This is the reconciled checklist. Older documents describe earlier snapshots;
their unchecked or "unbuilt" statements are not reliable current status.
Code presence is not proof that a feature has passed authenticated production QA.

## Verified in this review

- [x] `npm run build` passes, including generation of all dashboard routes.
- [x] `eslint Components lib app` passes with zero errors and two existing
  `no-img-element` warnings in the home and hero-preview pages.
- [x] Live `/admin` redirects to `/admin/login` (307).
- [x] Live `/learn` redirects to `/login?next=/learn` (307).
- [x] Live `/login` and `/academy` return 200.
- [x] Live certificate download API rejects an unauthenticated request (401).

Authenticated visual testing, live database migration status, current lesson
counts, provider configuration and payment execution were not verified in this
review. No production records, configuration or deployments were changed.

## Already implemented in the reviewed source

| Area | Present | Remaining scope |
| --- | --- | --- |
| Admin shell | Token styling, persisted collapsing sidebar, mobile overlay | Authenticated keyboard/mobile review; finish adoption across screens |
| Admin overview | Project, enquiry, student, course, order and revenue counts | Surface database failures; validate totals beyond query row limits |
| Enquiries | Two-pane inbox, status tabs/counts, notes and email retry | Full delivery/retry test and responsive review |
| Activity | List, actor/action/entity filters, detail drawer | Reliable writes, migration verification, date filter and pagination |
| Courses | Details/pricing/curriculum/materials/preview/publish workflow; separate Students route | Integrate Students into workflow navigation and finish shared states |
| Payments | Encrypted credential form, environment/readiness indicators, test connection, webhook URL, transaction list | Live configuration verification, webhook evidence, transaction filters and pending states |
| Invoices | Line-item creation, client link, settlement paths, receipts and PDFs | Correctness fixes below, filters and detail drawer |
| Certificates | Issuance, list, revocation dialog, public verification and PDF | End-to-end completion test, filters, detail drawer and Unicode support |
| Student shell | Shared sidebar, collapse persistence, mobile overlay, sign-out/cache purge | Planned mobile bottom tabs; keyboard and account-switch review |
| Student dashboard | Resume card, progress, statistics, materials and history | Progress edge cases, loading/error states and duplicate profile/history cleanup |
| Student pages | My courses with status tabs, orders, profile, certificates | Finish planned presentation, pending/error states and authenticated QA |
| Auth and checkout | Redesigned sign-in; registration/reset and checkout routes exist | Bring remaining auth/checkout screens to the agreed design; test complete journey |
| Offline lessons | Watermark, service worker and media caching code | Access lifecycle, byte-range handling and real offline playback verification |

The work log's statement that the whole student side is unbuilt is obsolete.
Its assertion that Bachs has no structural settings screen is also obsolete.
Do not rebuild these features from scratch.

## P0 - Correctness and access before production sign-off

- [ ] **Make audit writes reliable.** `lib/data/activity.js:55` forwards every
  truthy admin ID into a UUID column. Direct login returns `direct-admin`
  (`lib/admin-session.js:51`), which is not a UUID. Preserve actor email and use a
  valid UUID or null. Inspect Supabase's returned `error`, not just rejected
  promises. If the actor migration is absent, the current insert sends missing
  columns and can fail completely; it does not fall back to an actorless row as
  the old handoff implies. Verify the migration and exercise both login modes.
- [ ] **Keep invoice totals separate by currency.**
  `lib/data/invoices.js:116` adds amounts across currencies, while
  `app/admin/(protected)/invoices/page.js:16` labels the result using the first
  invoice's currency. Group totals by currency; test NGN plus USD together.
  Move financial aggregation beyond the 300-row list cap.
- [ ] **Unify invoice settlement and receipt issuance.**
  `app/admin/actions.js:51` allows `paid` through the generic status action without
  calling receipt issuance. Route paid transitions through settlement. Check
  database update errors in `lib/payments/invoices.js`; a paid row followed by a
  failed receipt insert currently causes webhook retries to return already
  settled without repairing the receipt. Test retry, duplicate delivery and
  failure between the two writes; prefer transactional/idempotent settlement.
- [ ] **Enforce published media access for students.**
  `app/api/learn/media/[kind]/[lessonId]/route.js` checks published status for public
  previews, but the active-enrolment branch grants access without that check.
  Verify intended policy and block draft/archived lesson media for students,
  while preserving explicit admin preview access. Test the media endpoint
  directly, not only lesson navigation.
- [ ] **Define and enforce offline entitlement lifetime.** `public/sw.js:53`
  serves cached media without consulting the server and uses one cache shared
  across accounts on the origin. Explicit sign-out purges it, but expiry,
  account switching and access revocation need handling. Test those paths;
  define a bounded offline policy or disable offline delivery until validated.
  Also implement/test Range requests and seeking; cached full responses do not
  implement byte-range semantics.
- [ ] **Expose operational failures.** Certificate and invoice readers return
  empty lists on database errors (`lib/data/certificates.js:26,33`,
  `lib/data/invoices.js:66`). Admin overview queries similarly collapse failed
  counts to zero. Show an error/retry state distinct from a real empty account.
- [ ] **Verify database/content readiness.** Confirm production application of
  `202609070001_activity_actor.sql` and `202609070002_academy_content.sql`.
  The old work log reports zero lessons; this is historical, not a fresh count.
  Verify current content and publish representative lessons/resources before
  claiming the learning, offline and certificate journeys are ready.

## P1 - Finish the agreed dashboard plan

- [ ] Phase 1: add activity date-range filtering, pagination and audit coverage
  for course publishing, access changes and gateway settlement. Currently only
  selected actions call `recordActivity`; filtering uses the latest 120 rows.
- [ ] Phase 2: standardise text/status/date filters and filtered counts across
  projects, invoices, orders and certificates. Orders already have text/status;
  enquiries already have status tabs. Add server pagination rather than filtering
  a capped snapshot. Do not count existing filters as missing.
- [ ] Phase 3: connect skeletons to actual route/Suspense loading states, add
  error/retry boundaries, use pending controls consistently, and mark loading
  regions. `Skeleton`/`SkeletonTable` exist but are not adopted by page routes;
  no `loading.js` or `error.js` route files were found.
- [ ] Phase 4: adopt invoice/certificate/order detail drawers, consolidate
  `ConfirmActionForm` and `ConfirmSubmitButton`, and standardise success and
  validation feedback. Drawer adoption currently appears only on Activity.
- [ ] Add the Students entry to `CourseWorkflowNav`; its page already exists.
- [ ] Finish Bachs presentation and verification checklist using the existing
  settings screen, including evidence that a signed webhook was processed.
- [ ] Finish student mobile bottom navigation, lesson player/certificate layouts,
  registration/reset/checkout consistency and pending/error states. Verify that
  progress only counts currently relevant lessons and never exceeds 100%.
- [ ] Phase 5: build keyboard-first admin search across the planned entities.
- [ ] Phase 6: implement MFA enrolment/enforcement, session revocation and password
  change with re-authentication. Cover direct-admin authentication as well as
  Supabase login so an alternate login cannot bypass enforcement.
- [ ] Phase 7: implement light/dark/system dashboard themes using tokens.
- [ ] Embed Unicode fonts in PDFs so student/client names are preserved.

## Academy content work carried over

- [ ] Verify/apply the Academy content migration. The schema file already exists;
  the roadmap's statement that the student-work table has not been built is stale.
- [ ] Build student-work admin management, consent/publication controls and public
  gallery. No application reads/writes of `student_work` were found in this review.
- [ ] Connect newsletter signup to storage and delivery, with validation and
  appropriate duplicate/abuse handling; the migration alone is not a working flow.
- [ ] Replace placeholder Academy copy with approved content. Keep student work
  separate from studio `videos`, as required by the existing roadmap.

## P2 - Release evidence and operating readiness

- [ ] Authenticated desktop/mobile QA for every admin and student screen: empty,
  populated, loading, failure, overflow, focus, keyboard and reduced motion.
- [ ] Registration -> email verification -> sign-in -> recovery -> sign-out.
- [ ] Free and paid enrolment -> signed webhook -> course access -> confirmation
  email -> lesson progress -> certificate -> PDF -> public verification.
- [ ] Failed/cancelled payment, coupon, webhook replay, refund and access revoke;
  prove one student's records/media cannot be accessed by another.
- [ ] Client quotation/invoice -> checkout/manual settlement -> exactly one
  receipt; verify totals, currencies and document rendering.
- [ ] Uploaded video playback, seeking, offline reload, expired session, account
  switching and cache cleanup. Test real media on supported mobile browsers.
- [ ] Review and merge `feat/verification-tooling` if still applicable. The local
  branch exists; `scripts/verify.mjs` is absent from this checkout. Recheck the
  historically reported contact honeypot overflow instead of assuming it remains.
- [ ] Confirm production build/lint and deployed artifact for each implementation
  phase. Use the existing one-phase-per-branch/PR workflow.
- [ ] Record deployment SHA, migration versions, monitoring/error reporting,
  recovery procedure and ownership of failed-payment/email support.

## Suggested execution order

1. Audit reliability, settlement/receipt correctness, currency totals and access.
2. Database/content verification and a complete paid-learning acceptance test.
3. Loading/error states, filters and consolidated dashboard interactions.
4. Remaining student experience, Academy content management and account security.
5. Search/theme work, authenticated responsive QA and release sign-off.

The public site is already deployed. These tasks are the remaining work for a
verified dashboard/commerce release and completion of the agreed plan, not a
claim that the current production site is offline.

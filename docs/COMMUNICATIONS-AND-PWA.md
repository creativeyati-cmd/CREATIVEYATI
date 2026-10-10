# Communications and PWA release

## Activation
1. Apply `supabase/production-communications.sql` in the production Supabase SQL Editor. It is repeatable and does not backfill welcome emails for existing enrollments. Existing subscriber rows are retained; no unproven marketing consent is inferred from that legacy list.
2. Configure a random server-only `COMMUNICATIONS_JOB_SECRET` of at least 32 characters in Vercel. Keep the existing Sendhiiv API key and verified sender settings. Redeploy after environment changes.
3. Connect the existing scheduler (user will provide details): GET or POST `https://www.aivideocreator.cv/api/jobs/communications` once per minute with `Authorization: Bearer <COMMUNICATIONS_JOB_SECRET>`. A run claims at most 20 recipients; do not run more often than once per minute because of provider limits. Scheduling is UTC internally; the admin picker converts the device's local time to UTC. Scheduled time is earliest processing time, not guaranteed inbox arrival time.
4. Queue a test from the admin editor, verify it in Sendhiiv, then explicitly approve the intended campaign audience. No real test or student email was sent by the implementation agent.

Without the schema, communications displays a setup error and existing course flows remain available. Without the job secret, campaign and test queue actions are disabled server-side. An existing scheduler is still required even after setting the secret. Monitor scheduler failures and queue backlog.

## Implemented
- Admin Messages, Newsletters, Templates and History; paid-recipient filters, searchable manual selection, course/status/date segmentation, persistent revision-checked drafts, preview, formatting/link/image/CTA tools, test queue, schedule, duplicate, cancel queued recipients, audit trail and safe rejection retry.
- Paid means successful positive-value payment for the enrolled course, or an explicitly approved paid manual enrollment. Revoked enrollment is not eligible for the paid segment.
- Marketing consent is optional during registration, activated after verified sign-in, and editable in Profile. Existing preference rows are not reset on login. Newsletter unsubscribe requires a confirmation POST; email scanners do not unsubscribe by visiting a link. Essential course messages remain enabled unless an admin explicitly suppresses a confirmed invalid address.
- Separate private course-community table. Admin saves links in the course workspace Community step; changes apply immediately. Student dashboard and lessons check active enrollment before rendering links. No community link is serialized in public course payloads.
- Enrollment trigger queues one welcome per enrollment in the same database transaction; worker rechecks current enrollment/payment and community links. Supabase data and Sendhiiv credentials stay server-side.
- PWA manifest, 192/512 icons, maskable icon, Apple metadata, install control, service worker and static offline fallback. Only the generic offline page and app icons are cached. No private HTML, course video, API response, checkout, or authentication data is stored by the worker. Existing sign-out purging preserves only these public assets.

## Delivery semantics and limits
Sendhiiv's documented 202 response means queued/accepted, not delivered. History shows only observed states. Delivered/bounced/opened/clicked metrics are not fabricated; a documented authenticated provider event interface is needed before adding them. Provider docs: https://sendhiiv.com/docs/api

Concurrent workers use database claims with row locks. Repeated queue clicks reuse campaign/recipient identity. Confirmed HTTP 429 rejections are retried with delay, up to four attempts; other definitive 4xx rejections require admin retry after fixing the cause. Network/5xx/abandoned processing outcomes are marked unknown and never blindly resent because provider acceptance may already have occurred. Exactly-once external delivery cannot be guaranteed without provider idempotency; this implementation favors avoiding duplicates. Cancellation cannot recall in-flight or accepted mail.

Queue throughput is 20 emails per minute at a one-minute scheduler interval. Existing legacy newsletter-only contacts without verified student accounts are not silently added to student segments. Remote images must be public HTTPS URLs; no email-image uploader was added. Community editing is an immediate course setting, not part of the unpublished content revision.

## Verification
- `node scripts/check-communications.mjs`: repeatable migration, role isolation, paid eligibility, consent, welcome/campaign deduplication, claim isolation and abandoned claims.
- `node scripts/check-communication-worker.mjs`: mocked provider acceptance, rate limit, rejection, 5xx and network ambiguity, consent withdrawal and escaped email content.
- Browser checks in installed Chrome: campaign draft/preview/recipient/confirmation with mocked APIs at 1440/768/390; real service worker registration, manifest, offline navigation, and cache contents restricted to public assets.
- Production build and targeted ESLint.
- Safari/iOS installation and real provider delivery remain manual acceptance checks; do not claim they were tested on unavailable devices.

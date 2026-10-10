# Course workspace release - 9 October 2026

## Audit

The previous course editor already had a six-part workflow, course cover processing, private direct video uploads (with progress and retry), PDF uploads, lesson source parsing, curriculum reordering, public pricing and publishing checks. Those integrations and dashboard controls were reused.

The old draft indicator only meant sessionStorage had been written; it did not persist drafts to the database or restore that storage. Submission cleared recovery before success, incomplete covers/titles blocked drafts, published edits changed live records immediately, and removing modules cascaded through lessons and student progress.

## Implementation

- A single private `course_workspaces` JSON document holds details, modules, lesson content, durable storage references, materials and pricing. Existing public course rows remain the published version.
- Server-side administrator checks on every action; workspace/history tables deny direct anonymous and authenticated client access. No new role hierarchy has been invented.
- A stable course UUID, serialized client saves, compare-and-swap revisions and a locked database transaction prevent repeated requests from creating duplicate courses or silently overwriting another editor.
- Autosave defaults to 1.2 seconds. `NEXT_PUBLIC_COURSE_AUTOSAVE_MS` can configure 500-10,000 ms. Draft data is capped below the 2 MB server action request limit.
- Unsaved changes are synchronously backed up to browser localStorage, scoped to administrator and course. Refresh recovery is explicit. Offline reconnect retries saves. Failed saves retain recovery data. Conflicts require downloading the local copy and reloading rather than force-overwriting newer work.
- Publishing validates the saved document, checks external video sources and uploaded video metadata, then applies all rows in one transaction. Lesson IDs, enrolments, progress and resource download logs survive. Removed lessons/modules/resources are archived, not physically deleted.
- Publication checkpoints and retained working-version history can be restored into a private draft; it does not immediately change live content. Historical versions begin with this release, not retroactively.
- Course/module/lesson duplication, module/lesson drag order and keyboard move buttons, moving lessons between modules, searchable/status-filtered lists, trash and restore.
- Cover cropping and previews, upload validation/progress/retry, safe written-content formatting, collapsible optional details, publishing requirement links, confirmation dialogs and existing dashboard components.
- Existing lesson types are video, text, PDF, external and mixed. The platform has no quiz engine. Existing enrolment management remains on each course's Students page.

## Apply before deploying

1. In the production Supabase SQL Editor run `supabase/production-course-workspaces.sql` (the same SQL as migration `202610090001_course_workspaces.sql`). It is repeatable. It adds two private tables, archived flags and transactional RPCs; it does not drop existing records or change admin membership.
2. Deploy the application after SQL succeeds. The old course editor URLs route into the unified workspace. Old-tab mutation actions refuse direct live writes and ask administrators to reopen the editor.
3. With an actual admin account, run the production acceptance checks below. Existing email verification, sign-in and payments are not changed by this release.

The administrator reported applying the production SQL on 9 October 2026. This has not been independently verified through a production database connection.

## Verification

- `node scripts/check-course-workspaces.mjs`: real PostgreSQL semantics through PGlite; repeatable migration, blank drafts, idempotent retries, conflicts, private published edits, atomic publication, preserved progress, archive/restore, history restoration and RPC access restrictions, ownership-mismatch rollback and direct-edit conflict recovery.
- Development browser fixture: incomplete drafts, debounce, lesson field capture, save failure, local recovery after refresh, responsive 1440/768/390 widths, interrupted PDF retry, offline reconnect, stale-revision stop, 16:9 cropping and checklist focus. Fixture is removed before production builds.
- Browser regression sources are retained as `scripts/CourseWorkspaceReview.jsx` and `scripts/check-course-workspace-*.py`; mount the fixture at a development-only `/ui-course-workspace` route when rerunning them, and remove that route afterward.
- Build and targeted lint are run after changes.

## Production acceptance / operational limits

- [ ] Apply migration and verify an admin can save/reopen a blank draft against production RLS and configuration.
- [ ] Upload real cover/video/PDF files, interrupt and retry; verify private media links as admin and deny them as student.
- [ ] Open the same course in two tabs and verify the second save raises a conflict.
- [ ] Edit a published course, confirm students still see the previous version, publish, and verify an existing student's lesson completion is retained.
- [ ] Archive, restore, move to trash, restore from trash, and restore a historical version.
- [ ] Verify the configured Bachs paid-course publishing/checkout path.

Browser tests use simulated responses, not real production email, storage, payments or admin sessions. Upload recovery retries the file; it does not resume a multi-gigabyte upload byte-for-byte after a browser crash. Reselect the local file if the browser was closed. Media blobs are deliberately retained for draft/history recovery; a retention-aware cleanup job is future operational work. Course duplication copies private media and can require retry/manual cleanup if provider copy operations fail. Existing scheduled course rows continue to be served by their stored schedule; this workspace publishes revisions explicitly and does not introduce scheduled revision publishing.


## Course upload usability review

- Previewed the real course editor with the local `CourseWorkspaceReview` fixture.
- New lessons default to direct upload and open immediately. Lesson URL slugs
  derive from titles until manually edited. Save, duplicate and remove actions
  use shared buttons; workspace actions no longer submit/reset the lesson form.
- Optional poster/caption/transcript settings collapse without unmounting fields.
  Module controls, lesson status, upload panels and mobile options have scoped
  dashboard styling; the shared sidebar is unchanged.
- Video inspection has a timeout and can be cancelled. Upload preparation handles
  non-JSON error responses. Existing Supabase and gated Stream paths are retained.
- PDF files transfer directly to private Supabase storage, avoiding Vercel's
  request-body limit. Finalization verifies size, type and PDF signature, and
  returns a stable resource ID on retry. Legacy small multipart requests remain
  compatible. Poster images resize below 3 MB before sending to the server.
- Pasted cover-image URLs populate dimensions after loading; unreadable URLs show
  an error instead of leaving publishing blocked without an explanation.
- Browser test: `scripts/check-course-upload-ui.py` (temporary development fixture
  route described in the script), video failure/retry/autosave, 8 MB PDF transport,
  duplicate lessons, 1440/768/390 px layouts. Storage responses are mocked.
- Server test: `node scripts/check-course-resource-upload.mjs`, plus existing
  Stream and workspace regression suites. Targeted lint and production build pass.
- No new migration. Actual signed-in production storage upload still needs to be
  verified with the deployed project's credentials; local credentials are placeholders.

### Editor spacing and autosave stability
- Added spacing between reorder controls, formatting tools and helper text; reserved
  save-status space so background saving does not move action buttons.
- Private draft saves no longer revalidate the editor route tree. Browser recovery
  is checked once on opening a course; subsequent server props preserve editing.
- Enter saves without resetting course or lesson forms. Changing course IDs still
  mounts a fresh editor.
- `scripts/check-course-editor-stability.py` covers server-prop refresh, Enter,
  idle autosave, button gaps and stable save-bar height at 1440/768/390 px.

### Upload continuity review
- Autosave uses an authenticated same-origin JSON endpoint, keeping cookie refresh
  responses separate from React Server Component navigation/rendering.
- New courses keep a stable `new?draft=ID` URL; reopening it loads the actual saved
  workspace revision. Autosave no longer rewrites it to a different route segment.
- Navigation warns during uploads even when text has saved; active lessons cannot
  be removed or moved into another module until their upload finishes/cancels.
- Module organization controls and optional lesson metadata are collapsed while
  remaining mounted, keeping the upload and lesson title easy to reach.
- `check-course-upload-stability.py` exercises real JSON client transport with
  simulated database/storage: delayed upload, concurrent edits/autosave, prop
  refresh, removal/navigation protection, and final media-reference persistence.
  Live signed-in storage delivery is not covered by these simulated responses.

### Signed-upload diagnostics
- Preserve actionable size, MIME, expiry and permission categories from storage rejections without displaying signed URLs or tokens.
- Check the live course-videos bucket size/MIME settings before signing. Project-wide limits remain independently enforced by Supabase.
- Tests: check-storage-upload-error.mjs and check-video-upload-limits.mjs. Actual user rejection is not yet classified without file size or storage response.


### Cloudflare-only course video uploads
- All new video signing uses Cloudflare Stream, including MOV. Removed the default
  Supabase signing path; authorization failure does not fall back to another provider.
- Existing Supabase video references and playback remain supported.
- Production and Preview provider flags are set to cloudflare.
- Read-only probe with production Vercel credentials returned HTTP 403/code 10002.
  The subsequently supplied token also returned the same error for the supplied account.
  A working Stream-authorized credential is still required before actual uploads work.
- verify-cloudflare-access.mjs prints only HTTP status and API error codes, not secrets.

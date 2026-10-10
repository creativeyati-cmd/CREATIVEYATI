# Cloudflare course uploads

The lesson editor supports direct, private Cloudflare Stream uploads, alongside
existing Supabase files and external video links. No database migration is needed:
Stream media uses the existing `upload` lesson type and `media_assets` table with
bucket `cloudflare-stream` and a course-scoped `.stream` reference.

## Enable

1. Activate Stream and give the account token Stream Edit permission.
2. Store `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_STREAM_API_TOKEN` as Vercel secrets.
3. Verify the token can list Stream videos. An active token alone is insufficient.
4. Set `COURSE_VIDEO_UPLOAD_PROVIDER=cloudflare` in Preview, deploy, and test a
   private draft upload. Enable the same setting in Production after it passes.
5. Redeploy after environment changes. Without this switch, Supabase remains active.

## Behavior and verification

- Admin sign-in is required to create an upload or check processing.
- Save the initial course draft first. The server records the Stream UID before
  returning the one-time tus upload URL; API credentials stay on the server.
- Uploads use 50 MiB chunks with retry/resume on the current page, up to 2 GiB.
- Videos require signed playback from creation. Processing must finish before
  publishing; a second provider check protects against stale ready metadata.
- Processing references survive draft saves and reloads. Interrupted transfers
  can resume on the current page; after closing the page, reselect the file to
  start a new transfer. Unfinished reservations/retained orphan videos need a
  future retention cleanup policy; do not delete assets used by version history.
- Student playback checks live publication and active enrollment (or explicit
  public preview) before issuing a signed HLS URL. Browser playback uses native
  HLS where available, otherwise hls.js; existing progress callbacks remain active.
- Duplicating a course creates a new course-owned media reference to the same
  private Stream video. It does not make that video public or delete the original.
- Download links require the lesson's download permission. The first request may
  report that Cloudflare is generating the MP4; retry after processing.

Run `node scripts/check-cloudflare-stream.mjs`, targeted ESLint, and `npm run build`.
Provider tests use mocked Cloudflare responses. Real upload, playback, and retry
verification remain blocked by the configured account token's HTTP 403 response
as of this implementation. Production keeps Supabase active until resolved.

Reference: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/

# R2 course videos

## Audit and scope
The existing product has admin course/lesson authoring, media_assets, enrolled-student playback and lesson progress. No AI-generation provider, generation callback, or personal generated-video library exists in this repository. No pretend generation integration was added. A future generation provider should upload to a separately authenticated owner-scoped flow or a background worker, not proxy large responses through Vercel.

## Configuration
Server-only variables: R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY. R2_ACCOUNT_ID can derive the endpoint. CLOUDFLARE_R2_* aliases are supported. No Stream token is required. The configured bucket is createbeyondprompt. Keep public bucket access disabled for paid lessons.

Apply supabase/production-r2-video-storage.sql before release. It only adds uploaded_by and original_filename to media_assets. RLS stays unchanged. Course title, lesson title, duration, poster references, user attribution, creation timestamp and status remain in existing course/lesson/asset tables.

## Data flow
Admin authentication -> random course/lesson-scoped object key -> metadata row -> 15-minute presigned PUT -> raw MP4 body directly to R2 -> server HEAD checks expected size/type and range-reads the MP4 container signature -> mark ready. If-None-Match:* prevents reusing the URL to overwrite uploaded media. Retrying metadata finalization reuses the completed object. Failed transfers retry with a fresh key. No automatic transcoding or chunk-level resume is claimed.

Only MP4 accepted for new videos. Export H.264 video/AAC audio with web optimization (fast start). Header validation and browser metadata checks cannot guarantee every codec plays on every device. MOV must be converted before upload. R2 does not transcode.

Student endpoints retain course publication, enrollment, preview and allow_download checks. Only then are 1-hour R2 GET links generated. Downloads set attachment disposition and preserve sanitized original filenames. URLs are bearer links until expiry. Native HTML5 controls, seek and playback retry remain available.

## CORS
Bucket policy allows PUT/GET/HEAD from https://www.aivideocreator.cv, https://aivideocreator.cv and http://localhost:3000. Allowed headers: content-type, content-length, if-none-match, range. Exposed headers: ETag, Content-Length, Content-Range, Accept-Ranges. Add exact preview origins when needed; arbitrary Vercel previews are not allowlisted.

## Existing media
Supabase references keep their existing playback route. Stream calls, processing polling, HLS player and dependencies were removed. Stream records are preserved and show a migration message. Export/download originals through the authorized Cloudflare dashboard if available, upload MP4 into the same lesson's private workspace, preview and publish. Do not delete/recreate the lesson: retaining its ID preserves student progress. No Stream asset is copied automatically. Keep old objects until the replacement is verified; any deletion needs an explicit retention decision.

## Validation
- check-video-upload-limits.mjs: admin ownership, size/type/container validation, finalize retries.
- check-r2-access.mjs: student authorization and download policy.
- check-course-upload-stability.py / check-course-upload-ui.py: browser UI with simulated service responses.
- verify-r2-storage.mjs FILE: live presigned upload, CORS, HEAD, overwrite prevention, Range, signed download; deletes only its own random diagnostic object.

R2 free-tier allowances are usage limits, not unlimited storage. No paid plan was purchased. Monitor Cloudflare storage and operation usage; application file-size validation does not enforce an account-wide free-tier budget.

Release status: real R2 verification passed using existing credentials. Vercel server-side R2/CORS checks also passed. The live media_assets column check returned HTTP 400 before the migration was applied; production promotion must wait for that prerequisite.

import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "course-videos";
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const MIME_EXTENSIONS = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message, status = 400) { return Response.json({ error: message }, { status }); }
function safeStorageKey(value, courseId, lessonId) { const key = String(value || ""); return key.startsWith(`${courseId}/${lessonId}/`) && /^[A-Za-z0-9/_-]+\.(mp4|webm|mov)$/.test(key) && !key.includes("..") ? key : ""; }

export async function POST(request) {
  if (!(await getAdminUser())) return fail("Your administrator session has expired.", 401);
  const service = createSupabaseServiceClient();
  if (!service) return fail("Course video storage is not configured.", 503);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "sign");
  const courseId = String(body.courseId || "");
  const lessonId = String(body.lessonId || "");
  if (!UUID.test(courseId) || !UUID.test(lessonId)) return fail("Save the course before uploading lesson videos.");

  if (action === "sign") {
    const mimeType = String(body.mimeType || "");
    const extension = String(body.fileName || "").split(".").pop()?.toLowerCase();
    const fileSize = Number(body.fileSize);
    if (!MIME_EXTENSIONS[mimeType] || extension !== MIME_EXTENSIONS[mimeType]) return fail("Use an MP4, WebM or MOV file whose extension matches its content type.");
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_BYTES) return fail("Video files must be no larger than 2GB.");
    const storageKey = `${courseId}/${lessonId}/${randomUUID()}.${extension}`;
    const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(storageKey);
    if (error || !data?.signedUrl) return fail("The signed upload could not be created. Apply the course workflow migration and retry.", 502);
    return Response.json({ signedUrl: data.signedUrl, storageKey, token: data.token });
  }

  const storageKey = safeStorageKey(body.storageKey, courseId, lessonId);
  if (!storageKey) return fail("The uploaded video reference is invalid.");

  if (action === "delete") {
    const [{ error }] = await Promise.all([
      service.storage.from(BUCKET).remove([storageKey]),
      service.from("media_assets").delete().eq("storage_key", storageKey),
    ]);
    if (error) return fail("The uploaded video could not be removed.", 502);
    return Response.json({ ok: true });
  }

  if (action !== "finalize") return fail("Unknown upload action.");
  const parts = storageKey.split("/");
  const fileName = parts.pop();
  const { data: objects = [], error: listError } = await service.storage.from(BUCKET).list(parts.join("/"), { search: fileName, limit: 2 });
  const stored = objects.find((item) => item.name === fileName);
  if (listError || !stored) return fail("Supabase did not confirm the uploaded video.", 502);
  const mimeType = String(body.mimeType || stored.metadata?.mimetype || "");
  const fileSize = Number(body.fileSize || stored.metadata?.size || 0);
  if (!MIME_EXTENSIONS[mimeType] || fileSize <= 0 || fileSize > MAX_BYTES) return fail("The stored video metadata did not pass validation.");
  const width = Math.round(Number(body.width));
  const height = Math.round(Number(body.height));
  const duration = Math.round(Number(body.durationSeconds));
  if (![width, height, duration].every((value) => Number.isFinite(value) && value > 0)) return fail("The browser could not read this video's duration or dimensions.");
  const { data: lesson } = await service.from("course_lessons").select("id").eq("id", lessonId).maybeSingle();
  const record = {
    course_id: courseId, lesson_id: lesson?.id || null, asset_type: "video", bucket: BUCKET, storage_key: storageKey,
    mime_type: mimeType, file_size: fileSize, width, height, duration_seconds: duration,
    orientation: width >= height ? "landscape" : "portrait", aspect_ratio: width / height, processing_status: "ready", updated_at: new Date().toISOString(),
  };
  const { error: metadataError } = await service.from("media_assets").upsert(record, { onConflict: "storage_key" });
  if (metadataError) return fail("The upload completed, but its metadata could not be saved. Apply the course workflow migration.", 502);
  const { data: preview } = await service.storage.from(BUCKET).createSignedUrl(storageKey, 3600);
  return Response.json({ storageKey, previewUrl: preview?.signedUrl || "", width, height, durationSeconds: duration, orientation: record.orientation, aspectRatio: record.aspect_ratio, processingStatus: "ready" });
}

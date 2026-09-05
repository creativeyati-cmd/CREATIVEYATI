import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "course-posters";
const MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = { "image/jpeg": new Set(["jpeg"]), "image/png": new Set(["png"]), "image/webp": new Set(["webp"]), "image/avif": new Set(["avif", "heif"]) };
const UUID = /^[0-9a-f-]{36}$/i;

function fail(message, status = 400) { return Response.json({ error: message }, { status }); }

export async function POST(request) {
  if (!(await getAdminUser())) return fail("Your administrator session has expired.", 401);
  const service = createSupabaseServiceClient();
  if (!service) return fail("Course poster storage is not configured.", 503);
  const form = await request.formData();
  const file = form.get("file");
  const courseId = String(form.get("courseId") || "");
  const lessonId = String(form.get("lessonId") || "");
  const orientation = form.get("orientation") === "portrait" ? "portrait" : "landscape";
  if (!UUID.test(courseId) || !UUID.test(lessonId)) return fail("Save the course before uploading lesson posters.");
  if (!(file instanceof File) || !file.size || !FORMATS[file.type] || file.size > MAX_BYTES) return fail("Use a JPG, PNG, WebP or AVIF image no larger than 8MB.");
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 60_000_000 }).rotate();
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height || !FORMATS[file.type].has(metadata.format)) return fail("The poster is corrupted or does not match its file type.");
    const size = orientation === "portrait" ? [1080, 1920] : [1920, 1080];
    const output = await source.resize(size[0], size[1], { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
    const storageKey = `${courseId}/${lessonId}/poster-${randomUUID()}.webp`;
    const { error } = await service.storage.from(BUCKET).upload(storageKey, output, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) throw error;
    const { data: preview } = await service.storage.from(BUCKET).createSignedUrl(storageKey, 3600);
    await service.from("media_assets").upsert({ course_id: courseId, asset_type: "poster", bucket: BUCKET, storage_key: storageKey, mime_type: "image/webp", file_size: output.length, width: size[0], height: size[1], orientation, aspect_ratio: size[0] / size[1], processing_status: "ready", updated_at: new Date().toISOString() }, { onConflict: "storage_key" });
    return Response.json({ storageKey, previewUrl: preview?.signedUrl || "" });
  } catch {
    return fail("The poster could not be processed. Apply the course workflow migration and retry.", 422);
  }
}

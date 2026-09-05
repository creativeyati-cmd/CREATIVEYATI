import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "project-covers";
const MAX_BYTES = 8 * 1024 * 1024;
const MIME_FORMATS = {
  "image/jpeg": new Set(["jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "image/avif": new Set(["avif", "heif"]),
};
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

function safeCourseId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9-]{8,80}$/.test(id) ? id : randomUUID();
}

export async function POST(request) {
  const admin = await getAdminUser();
  if (!admin) return jsonError("Your administrator session has expired.", 401);
  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Course cover storage is not configured.", 503);

  const formData = await request.formData();
  const file = formData.get("file");
  const courseId = safeCourseId(formData.get("courseId"));
  if (!(file instanceof File) || !file.size) return jsonError("Choose an image to upload.");
  if (!MIME_FORMATS[file.type]) return jsonError("Use a JPG, JPEG, PNG, WebP or AVIF image.");
  if (file.size > MAX_BYTES) return jsonError("Course covers must be 8MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) return jsonError("The image file extension is not supported.");

  let source;
  let metadata;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    source = sharp(bytes, { failOn: "error", limitInputPixels: 60_000_000 }).rotate();
    metadata = await source.metadata();
  } catch {
    return jsonError("The selected image is corrupted or could not be decoded.");
  }
  if (!metadata.width || !metadata.height || !MIME_FORMATS[file.type].has(metadata.format)) return jsonError("The image contents do not match its file type.");
  if (metadata.width < 640 || metadata.height < 360) return jsonError("Course covers must be at least 640 × 360px.");

  const key = `courses/${courseId}/cover-${randomUUID()}.webp`;
  try {
    const output = await source.resize(1600, 900, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
    const { error } = await service.storage.from(BUCKET).upload(key, output, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw error;
  } catch {
    return jsonError("The course cover upload did not complete. Your existing cover has been kept.", 502);
  }

  const url = service.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  return Response.json({ url, storageKey: key, width: metadata.width, height: metadata.height });
}

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getAdminUser, createSupabaseServiceClient } from "@/lib/supabase/server";

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
const VARIANT_WIDTHS = { mobile: 640, tablet: 1280, desktop: 1920, og: 1200 };

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

function safeUploadId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9-]{8,80}$/.test(id) ? id : randomUUID();
}

export async function POST(request) {
  const admin = await getAdminUser();
  if (!admin) return jsonError("Your administrator session has expired.", 401);
  const supabase = createSupabaseServiceClient();
  if (!supabase) return jsonError("Cover storage is not configured.", 503);

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "mobile" ? "mobile" : "main";
  const uploadId = safeUploadId(formData.get("uploadId"));
  if (!(file instanceof File) || !file.size) return jsonError("Choose an image to upload.");
  if (!MIME_FORMATS[file.type]) return jsonError("Use a JPG, JPEG, PNG, WebP or AVIF image.");
  if (file.size > MAX_BYTES) return jsonError("Cover images must be 8MB or smaller.");
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

  if (!metadata.width || !metadata.height || !MIME_FORMATS[file.type].has(metadata.format)) {
    return jsonError("The image contents do not match its file type.");
  }
  const expected = { width: 1280, height: 720 };
  const warnings = [];
  if (metadata.width < expected.width || metadata.height < expected.height) {
    return jsonError(`Cover images must be at least ${expected.width} × ${expected.height}px.`);
  }
  const ratio = metadata.width / metadata.height;
  if (Math.abs(ratio - 16 / 9) / (16 / 9) > 0.015) warnings.push("This image is not 16:9 and will use the saved focal point when cropped.");

  const uploadedKeys = [];
  const variants = {};
  try {
    for (const [label, width] of Object.entries(VARIANT_WIDTHS)) {
      const key = `${uploadId}/${kind}-${label}-${randomUUID()}.webp`;
      const output = await source.clone().resize({ width, withoutEnlargement: true, fit: "inside" }).webp({ quality: label === "og" ? 84 : 82 }).toBuffer();
      const { error } = await supabase.storage.from(BUCKET).upload(key, output, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (error) throw error;
      uploadedKeys.push(key);
      variants[label] = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    }
  } catch {
    if (uploadedKeys.length) await supabase.storage.from(BUCKET).remove(uploadedKeys);
    return jsonError("The cover upload did not complete. Your existing cover has been kept.", 502);
  }

  return Response.json({
    url: variants.desktop || variants.tablet || variants.mobile,
    storageKey: uploadedKeys.find((key) => key.includes("-desktop-")) || uploadedKeys[0],
    storageKeys: uploadedKeys,
    variants,
    width: metadata.width,
    height: metadata.height,
    warnings,
  });
}

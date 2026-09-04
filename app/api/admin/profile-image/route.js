import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getAdminUser, createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "profile-images";
const MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/avif": "heif" };

export async function POST(request) {
  if (!(await getAdminUser())) return Response.json({ error: "Your administrator session has expired." }, { status: 401 });
  const supabase = createSupabaseServiceClient();
  if (!supabase) return Response.json({ error: "Profile image storage is not configured." }, { status: 503 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!FORMATS[file.type] || file.size > MAX_BYTES) return Response.json({ error: "Use a JPG, PNG, WebP or AVIF image no larger than 8MB." }, { status: 400 });
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height || metadata.width < 256 || metadata.height < 256) return Response.json({ error: "Profile images must be at least 256 × 256px." }, { status: 400 });
    if (FORMATS[file.type] !== metadata.format) return Response.json({ error: "The image contents do not match its file type." }, { status: 400 });
    const key = `avatars/${randomUUID()}.webp`;
    const output = await source.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(key, output, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return Response.json({ url: supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl, storageKey: key, width: metadata.width, height: metadata.height });
  } catch {
    return Response.json({ error: "The profile image could not be processed. Your current image has been kept." }, { status: 422 });
  }
}

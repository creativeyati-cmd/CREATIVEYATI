import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";
import { SERVICE_MEDIA_BUCKET, serviceMediaSlots, serviceMediaTypes, serviceMediaLimit, validServiceMediaKey } from "@/lib/service-media";

export const runtime = "nodejs";
const fail = (error, status = 400) => Response.json({ error }, { status });

export async function POST(request) {
  if (!await getAdminUser()) return fail("Sign in with your administrator authenticator to upload media.", 401);
  const db = createSupabaseServiceClient();
  if (!db) return fail("Media storage is not configured.", 503);
  const body = await request.json().catch(() => ({}));
  const slot = body.slot;
  if (!serviceMediaSlots.some(item => item.id === slot)) return fail("Choose a valid service.");
  const storage = db.storage.from(SERVICE_MEDIA_BUCKET);
  if (body.action === "sign") {
    const type = body.type, size = Number(body.size);
    if (!serviceMediaTypes[type] || !Number.isSafeInteger(size) || size <= 0 || size > serviceMediaLimit(type)) return fail("Use a JPG, PNG, WebP or AVIF up to 8MB, or an MP4/WebM up to 100MB.");
    // A dedicated public bucket: only signed admin uploads can write to it.
    const { data: bucket } = await db.storage.getBucket(SERVICE_MEDIA_BUCKET);
    if (!bucket) {
      const { error } = await db.storage.createBucket(SERVICE_MEDIA_BUCKET, { public: true, fileSizeLimit: 100 * 1024 * 1024, allowedMimeTypes: Object.keys(serviceMediaTypes) });
      if (error && !(await db.storage.getBucket(SERVICE_MEDIA_BUCKET)).data) return fail("Service media storage could not be prepared.", 502);
    }
    const storageKey = `${slot}/${randomUUID()}.${serviceMediaTypes[type]}`;
    const { data, error } = await storage.createSignedUploadUrl(storageKey);
    if (error) return fail("The upload could not be started.", 502);
    return Response.json({ signedUrl: data.signedUrl, storageKey });
  }
  if (body.action === "reset") {
    const { error } = await db.from("site_content").delete().eq("key", `service-media:${slot}`);
    if (error) return fail("The service could not be reset.", 502);
  } else if (body.action === "publish") {
    if (!validServiceMediaKey(body.storageKey, slot)) return fail("Invalid media reference.");
    const name = body.storageKey.split("/")[1];
    const { data: objects, error } = await storage.list(slot, { search: name, limit: 10 });
    const object = objects?.find(item => item.name === name);
    const type = object?.metadata?.mimetype, size = Number(object?.metadata?.size);
    if (error || !object || !serviceMediaTypes[type] || !Number.isFinite(size) || size <= 0 || size > serviceMediaLimit(type) || !name.endsWith(`.${serviceMediaTypes[type]}`)) return fail("Upload verification failed. The current media has been kept.");
    const value = { storageKey: body.storageKey, type: type.startsWith("video/") ? "video" : "image", alt: String(body.alt || "").trim().slice(0, 240) };
    const { error: saveError } = await db.from("site_content").upsert({ key: `service-media:${slot}`, value, updated_at: new Date().toISOString() });
    if (saveError) return fail("The upload completed but could not be published. Please retry.", 502);
  } else return fail("Unknown media action.");
  revalidatePath("/services"); revalidatePath("/admin/content/services");
  return Response.json({ ok: true });
}

import { randomUUID } from "node:crypto";
import { getAdminUser, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request) {
  if (!(await getAdminUser())) return Response.json({ error: "Administrator access required." }, { status: 401 });
  const service = createSupabaseServiceClient(); const form = await request.formData(); const file = form.get("file"); const lessonId = String(form.get("lessonId") || ""); const courseId = String(form.get("courseId") || ""); const replacementId = String(form.get("replacementId") || ""); const title = String(form.get("title") || "").trim();
  if (!(file instanceof File) || !title || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf") || file.size > 25 * 1024 * 1024) return Response.json({ error: "Choose a valid PDF no larger than 25MB and add a title." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer()); if (bytes.subarray(0, 5).toString() !== "%PDF-") return Response.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
  let previous = null;
  if (replacementId) {
    const { data } = await service.from("course_resources").select("id,storage_key,display_order").eq("id", replacementId).eq("lesson_id", lessonId).maybeSingle();
    if (!data) return Response.json({ error: "The resource selected for replacement was not found." }, { status: 404 });
    previous = data;
  }
  const key = `${courseId}/${lessonId}/${randomUUID()}.pdf`; const { error: uploadError } = await service.storage.from("course-resources").upload(key, bytes, { contentType: "application/pdf", upsert: false }); if (uploadError) return Response.json({ error: "The private PDF upload failed." }, { status: 502 });
  const record = { lesson_id: lessonId, title, storage_key: key, mime_type: "application/pdf", file_size: file.size, allow_download: form.get("allowDownload") === "on" };
  let result;
  if (previous) result = await service.from("course_resources").update({ ...record, updated_at: new Date().toISOString() }).eq("id", previous.id).eq("lesson_id", lessonId);
  else { const { data: last } = await service.from("course_resources").select("display_order").eq("lesson_id", lessonId).order("display_order", { ascending: false }).limit(1).maybeSingle(); result = await service.from("course_resources").insert({ ...record, display_order: Number(last?.display_order ?? -1) + 1 }); }
  const { error } = result;
  if (error) { await service.storage.from("course-resources").remove([key]); return Response.json({ error: "The PDF metadata could not be saved." }, { status: 500 }); }
  if (previous?.storage_key) await service.storage.from("course-resources").remove([previous.storage_key]);
  return Response.redirect(new URL(`/admin/courses/${courseId}/curriculum?saved=resource`, request.url), 303);
}

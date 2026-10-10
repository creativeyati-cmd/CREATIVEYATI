import { randomUUID } from "node:crypto";
import {
  createSupabaseServiceClient,
  getAdminUser,
} from "@/lib/supabase/server";
import { UUID } from "@/lib/course-workspace";
export async function POST(request) {
  if (!(await getAdminUser()))
    return Response.json(
      { error: "Administrator access required." },
      { status: 401 },
    );
  const db = createSupabaseServiceClient();
  if (!db) return Response.json({ error: "Resource storage is unavailable." }, { status: 503 });
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    const courseId = String(body.courseId || "");
    const size = Number(body.fileSize);
    if (!UUID.test(courseId) || !Number.isInteger(size) || size <= 0 || size > 25 * 1024 * 1024 || body.mimeType !== "application/pdf")
      return Response.json({ error: "Choose a PDF no larger than 25 MB." }, { status: 400 });
    const { data: course } = await db.from("courses").select("id").eq("id", courseId).is("deleted_at", null).maybeSingle();
    if (!course) return Response.json({ error: "Save the draft before uploading resources." }, { status: 400 });
    if (body.action === "sign") {
      const key = `${courseId}/draft/${randomUUID()}.pdf`;
      const { data, error } = await db.storage.from("course-resources").createSignedUploadUrl(key);
      return error ? Response.json({ error: "A private upload link could not be created. Retry." }, { status: 502 }) : Response.json({ storageKey: key, signedUrl: data.signedUrl });
    }
    const key = String(body.storageKey || "");
    const id = key.split("/").pop()?.replace(/\.pdf$/, "");
    if (body.action !== "finalize" || !UUID.test(id || "") || key !== `${courseId}/draft/${id}.pdf`)
      return Response.json({ error: "Invalid resource reference." }, { status: 400 });
    const { data: files, error: listError } = await db.storage.from("course-resources").list(`${courseId}/draft`, { search: `${id}.pdf`, limit: 2 });
    const stored = files?.find(file => file.name === `${id}.pdf`);
    if (listError || !stored || Number(stored.metadata?.size) !== size || stored.metadata?.mimetype !== "application/pdf")
      return Response.json({ error: "The stored PDF could not be verified. Retry the upload." }, { status: 422 });
    const { data: blob, error } = await db.storage.from("course-resources").download(key);
    if (error || !blob || await blob.slice(0, 5).text() !== "%PDF-")
      return Response.json({ error: "This file is not a valid PDF." }, { status: 422 });
    return Response.json({ id, title: String(body.fileName || "Document").replace(/\.pdf$/i, "").slice(0, 200), description: "", storageKey: key, fileSize: size, allowDownload: true, previewAllowed: false });
  }
  const form = await request.formData();
  const courseId = String(form.get("courseId") || "");
  const file = form.get("file");
  if (
    !UUID.test(courseId) ||
    !(file instanceof File) ||
    file.type !== "application/pdf" ||
    !file.size ||
    file.size > 25 * 1024 * 1024
  )
    return Response.json(
      { error: "Choose a PDF no larger than 25 MB." },
      { status: 400 },
    );
  const { data: course } = await db
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!course)
    return Response.json(
      { error: "Save the draft before uploading resources." },
      { status: 400 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-")
    return Response.json(
      { error: "The file is not a valid PDF." },
      { status: 400 },
    );
  const key = `${courseId}/draft/${randomUUID()}.pdf`;
  const { error } = await db.storage
    .from("course-resources")
    .upload(key, bytes, { contentType: "application/pdf", upsert: false });
  if (error)
    return Response.json(
      { error: "Upload failed. Please retry." },
      { status: 502 },
    );
  return Response.json({
    id: randomUUID(),
    title: file.name.replace(/\.pdf$/i, ""),
    description: "",
    storageKey: key,
    fileSize: file.size,
    allowDownload: true,
    previewAllowed: false,
  });
}
export async function GET(request) {
  if (!(await getAdminUser()))
    return Response.json(
      { error: "Administrator access required." },
      { status: 401 },
    );
  const url = new URL(request.url);
  const id = url.searchParams.get("courseId");
  const key = url.searchParams.get("key") || "";
  if (!UUID.test(id || "") || !key.startsWith(`${id}/`) || key.includes(".."))
    return Response.json({ error: "Invalid resource." }, { status: 400 });
  const { data, error } = await createSupabaseServiceClient()
    .storage.from("course-resources")
    .createSignedUrl(key, 120);
  return error
    ? Response.json({ error: "Resource unavailable." }, { status: 404 })
    : Response.redirect(data.signedUrl);
}

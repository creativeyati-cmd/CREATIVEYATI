import { NextResponse } from "next/server";
import { getAdminUser, getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  const url = new URL(request.url); const adminPreview = url.searchParams.get("admin") === "1"; const [user, admin] = await Promise.all([getStudentUser(), adminPreview ? getAdminUser() : null]);
  if (!user && !admin) return Response.json({ error: "Sign in required." }, { status: 401 });
  const service = createSupabaseServiceClient(); const { id } = await params;
  const { data: resource } = await service.from("course_resources").select("*").eq("id", id).maybeSingle();
  if (!resource) return Response.json({ error: "Resource not found." }, { status: 404 });
  const { data: lesson } = await service.from("course_lessons").select("section_id").eq("id", resource.lesson_id).maybeSingle();
  const { data: section } = lesson ? await service.from("course_sections").select("course_id").eq("id", lesson.section_id).maybeSingle() : { data: null };
  const { data: enrolment } = user && section ? await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", section.course_id).eq("active", true).maybeSingle() : { data: null };
  if (!admin && !enrolment) return Response.json({ error: "Course access is required." }, { status: 403 });
  const download = url.searchParams.get("download") === "1";
  if (download && !resource.allow_download) return Response.json({ error: "Downloading is disabled for this resource." }, { status: 403 });
  const { data, error } = await service.storage.from("course-resources").createSignedUrl(resource.storage_key, 60, download ? { download: `${resource.title}.pdf` } : undefined);
  if (error || !data?.signedUrl) return Response.json({ error: "Resource access could not be created." }, { status: 502 });
  if (user && !admin) { const { data: order } = await service.from("orders").select("reference").eq("student_id", user.id).eq("course_id", section.course_id).eq("payment_status", "successful").order("paid_at", { ascending: false }).limit(1).maybeSingle(); await service.from("download_logs").insert({ student_id: user.id, resource_id: resource.id, order_reference: order?.reference || null }); }
  return NextResponse.redirect(data.signedUrl);
}

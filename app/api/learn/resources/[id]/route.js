import { NextResponse } from "next/server";
import { getAdminUser, getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  const url = new URL(request.url); const adminPreview = url.searchParams.get("admin") === "1"; const [user, admin] = await Promise.all([getStudentUser(), adminPreview ? getAdminUser() : null]);
  const service = createSupabaseServiceClient(); const { id } = await params;
  if (!service) return Response.json({ error: "Resources are unavailable." }, { status: 503 });
  const { data: resource } = await service.from("course_resources").select("*").eq("id", id).maybeSingle();
  if (!resource || resource.archived) return Response.json({ error: "Resource not found." }, { status: 404 });
  const courseId = resource.course_id;
  if (!admin) {
    const {data:owner}=await service.from("courses").select("status,scheduled_for,deleted_at").eq("id",courseId).maybeSingle();
    if(!owner || owner.deleted_at || !(owner.status==="published" || (owner.status==="scheduled" && owner.scheduled_for && new Date(owner.scheduled_for).getTime()<=Date.now()))) return Response.json({error:"Course unavailable."},{status:404});
  }
  if (!admin && resource.lesson_id) {
    const { data: lesson } = await service.from("course_lessons").select("status").eq("id", resource.lesson_id).eq("course_id", courseId).maybeSingle();
    if (lesson?.status !== "published") return Response.json({ error: "Resource not found." }, { status: 404 });
  }
  const { data: enrolment } = user ? await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", courseId).eq("active", true).maybeSingle() : { data: null };
  let publicPreview = false;
  if (!admin && !enrolment && resource.preview_allowed) { const { data: course } = await service.from("courses").select("status,scheduled_for").eq("id", courseId).maybeSingle(); publicPreview = course?.status === "published" || (course?.status === "scheduled" && course.scheduled_for && new Date(course.scheduled_for).getTime() <= Date.now()); }
  if (!admin && !enrolment && !publicPreview) return Response.json({ error: user ? "Course access is required." : "Sign in required." }, { status: user ? 403 : 401 });
  const download = url.searchParams.get("download") === "1";
  if (download && !resource.allow_download) return Response.json({ error: "Downloading is disabled for this resource." }, { status: 403 });
  const { data, error } = await service.storage.from("course-resources").createSignedUrl(resource.storage_key, 60, download ? { download: `${resource.title}.pdf` } : undefined);
  if (error || !data?.signedUrl) return Response.json({ error: "Resource access could not be created." }, { status: 502 });
  if (user && !admin) { const { data: order } = await service.from("orders").select("reference").eq("student_id", user.id).eq("course_id", courseId).eq("payment_status", "successful").order("paid_at", { ascending: false }).limit(1).maybeSingle(); await service.from("download_logs").insert({ student_id: user.id, resource_id: resource.id, order_reference: order?.reference || null }); }
  return NextResponse.redirect(data.signedUrl);
}

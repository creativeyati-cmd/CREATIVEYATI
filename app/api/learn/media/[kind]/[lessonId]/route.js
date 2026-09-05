import { NextResponse } from "next/server";
import { createSupabaseServiceClient, getAdminUser, getStudentUser } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  const { kind, lessonId } = await params;
  if (!['video', 'poster'].includes(kind)) return Response.json({ error: "Media type not found." }, { status: 404 });
  const url = new URL(request.url);
  const wantsAdmin = url.searchParams.get("admin") === "1";
  const [admin, user] = await Promise.all([wantsAdmin ? getAdminUser() : null, getStudentUser()]);
  const service = createSupabaseServiceClient();
  if (!service) return Response.json({ error: "Media storage is unavailable." }, { status: 503 });
  const { data: lesson } = await service.from("course_lessons").select("id,course_id,is_preview,status,storage_key,poster_storage_key,allow_download").eq("id", lessonId).maybeSingle();
  if (!lesson) return Response.json({ error: "Lesson media not found." }, { status: 404 });
  let publicPreview = false;
  if (lesson.is_preview && lesson.status === "published") { const { data: course } = await service.from("courses").select("status,scheduled_for,deleted_at").eq("id", lesson.course_id).maybeSingle(); publicPreview = Boolean(course && !course.deleted_at && (course.status === "published" || (course.status === "scheduled" && course.scheduled_for && new Date(course.scheduled_for).getTime() <= Date.now()))); }
  let authorised = Boolean(admin) || publicPreview;
  if (!authorised && user) {
    const { data: enrolment } = await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", lesson.course_id).eq("active", true).maybeSingle();
    authorised = Boolean(enrolment);
  }
  if (!authorised) return Response.json({ error: user ? "Course access is required." : "Sign in to access this lesson." }, { status: user ? 403 : 401 });
  const storageKey = kind === "video" ? lesson.storage_key : lesson.poster_storage_key;
  const bucket = kind === "video" ? "course-videos" : "course-posters";
  if (!storageKey) return Response.json({ error: "This media file is unavailable." }, { status: 404 });
  const download = kind === "video" && url.searchParams.get("download") === "1";
  if (download && !lesson.allow_download) return Response.json({ error: "Downloading is disabled for this lesson." }, { status: 403 });
  const { data, error } = await service.storage.from(bucket).createSignedUrl(storageKey, 120, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) return Response.json({ error: "A temporary media link could not be created." }, { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}

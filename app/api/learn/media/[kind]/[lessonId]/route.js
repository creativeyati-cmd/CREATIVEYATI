import { r2Playback } from "@/lib/r2";
import { isR2Video } from "@/lib/r2-reference";
import { streamVideoId } from "@/lib/stream-reference";
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
  if (!admin) {
    const {data:owner}=await service.from("courses").select("status,scheduled_for,deleted_at").eq("id",lesson.course_id).maybeSingle();
    if(!owner || owner.deleted_at || !(owner.status==="published" || (owner.status==="scheduled" && owner.scheduled_for && new Date(owner.scheduled_for).getTime()<=Date.now()))) return Response.json({error:"Course unavailable."},{status:404});
  }
  let publicPreview = false;
  if (lesson.is_preview && lesson.status === "published") { const { data: course } = await service.from("courses").select("status,scheduled_for,deleted_at").eq("id", lesson.course_id).maybeSingle(); publicPreview = Boolean(course && !course.deleted_at && (course.status === "published" || (course.status === "scheduled" && course.scheduled_for && new Date(course.scheduled_for).getTime() <= Date.now()))); }
  let authorised = Boolean(admin) || publicPreview;
  if (!authorised && user) {
    const { data: enrolment } = await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", lesson.course_id).eq("active", true).maybeSingle();
    authorised = Boolean(enrolment) && lesson.status === "published";
  }
  if (!authorised) return Response.json({ error: user ? "Course access is required." : "Sign in to access this lesson." }, { status: user ? 403 : 401 });
  const storageKey = kind === "video" ? lesson.storage_key : lesson.poster_storage_key;
  const bucket = kind === "video" ? "course-videos" : "course-posters";
  if (!storageKey) return Response.json({ error: "This media file is unavailable." }, { status: 404 });
  const download = kind === "video" && url.searchParams.get("download") === "1";
  if (download && !lesson.allow_download) return Response.json({ error: "Downloading is disabled for this lesson." }, { status: 403 });
  if (kind === "video" && streamVideoId(storageKey)) return Response.json({error:"This legacy Stream video needs migration. Upload its original MP4 in the course editor."},{status:409});
  if (kind === "video" && isR2Video(storageKey)) {
    try {
      const link=await r2Playback(service, storageKey, lesson.course_id, download);
      if(url.searchParams.get("link")==="1") return Response.json({url:link},{headers:{"Cache-Control":"private, no-store"}});
      return new Response(null,{status:302,headers:{Location:link,"Cache-Control":"private, no-store"}});
    } catch {return Response.json({error:"R2 playback is unavailable. Check the saved video and storage configuration."},{status:502});}
  }

  const { data, error } = await service.storage.from(bucket).createSignedUrl(storageKey, 120, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) return Response.json({ error: "A temporary media link could not be created." }, { status: 502 });
  if(url.searchParams.get("link")==="1") return Response.json({url:data.signedUrl},{headers:{"Cache-Control":"private, no-store"}});
  return NextResponse.redirect(data.signedUrl);
}

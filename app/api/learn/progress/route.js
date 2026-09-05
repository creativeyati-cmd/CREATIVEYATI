import { createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const user = await getStudentUser(); if (!user) return Response.json({ error: "Sign in required." }, { status: 401 }); const body = await request.json().catch(() => ({})); const courseId = String(body.courseId || ""); const lessonId = String(body.lessonId || ""); const position = Math.max(0, Math.floor(Number(body.position) || 0)); if (!UUID.test(courseId) || !UUID.test(lessonId) || position > 86400) return Response.json({ error: "Invalid lesson progress." }, { status: 400 });
  const service = createSupabaseServiceClient(); const [{ data: enrolment }, { data: lesson }] = await Promise.all([service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", courseId).eq("active", true).maybeSingle(), service.from("course_lessons").select("id").eq("id", lessonId).eq("course_id", courseId).eq("status", "published").maybeSingle()]); if (!enrolment || !lesson) return Response.json({ error: "Course access is required." }, { status: 403 });
  const { error } = await service.from("lesson_progress").upsert({ student_id: user.id, course_id: courseId, lesson_id: lessonId, last_position: position, updated_at: new Date().toISOString() }, { onConflict: "student_id,lesson_id" }); return error ? Response.json({ error: "Progress could not be saved." }, { status: 502 }) : Response.json({ ok: true });
}

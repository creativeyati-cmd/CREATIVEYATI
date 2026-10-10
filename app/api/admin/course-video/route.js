import { courseR2Upload } from "@/lib/course-r2-upload";
import { createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message, status = 400) { return Response.json({ error: message }, { status }); }

export async function POST(request) {
  const actor = await getAdminUser();
  if (!actor) return fail("Your administrator session has expired.", 401);
  const service = createSupabaseServiceClient();
  if (!service) return fail("Course video storage is not configured.", 503);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "sign");
  const courseId = String(body.courseId || "");
  const lessonId = String(body.lessonId || "");
  if (!UUID.test(courseId) || !UUID.test(lessonId)) return fail("Save the course before uploading lesson videos.");

  if (!["sign", "finalize"].includes(action)) return fail("Replace legacy Stream videos with an MP4 upload to R2. Existing records have been preserved.",409);
  try { return Response.json(await courseR2Upload(service, actor, {...body,action,courseId,lessonId})); }
  catch (error) { return fail(error.message?.includes("R2") || error.message?.includes("upload") || error.message?.includes("video") || error.message?.includes("MP4") || error.message?.includes("course") ? error.message : "R2 request failed. Check the bucket credentials and retry.",400); }
}

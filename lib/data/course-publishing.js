import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getBachsConfiguration } from "@/lib/payments/provider";
import { getCourseVideoSource } from "@/lib/course-video-source";
import { checkExternalCourseVideo } from "@/lib/course-video-validation";

export async function getCoursePublishIssues(courseId) {
  const service = createSupabaseServiceClient();
  if (!service) return ["Database access is not configured."];
  const { data: course } = await service.from("courses").select("*").eq("id", courseId).is("deleted_at", null).maybeSingle();
  if (!course) return ["Course not found."];
  const { data: sectionRows } = await service.from("course_sections").select("id,title").eq("course_id", courseId);
  const sections = sectionRows || [];
  const sectionIds = sections.map((section) => section.id);
  const lessonResult = sectionIds.length ? await service.from("course_lessons").select("*,course_resources(id,storage_key)").in("section_id", sectionIds) : { data: [] };
  const lessons = lessonResult.data || [];
  const issues = [];
  if (!course.title?.trim()) issues.push("Add a course title.");
  if (!course.description?.trim()) issues.push("Add the full course description.");
  if (!course.cover_image_url) issues.push("Upload a 16:9 course cover.");
  else if (Number(course.cover_width) < 1280 || Number(course.cover_height) < 720 || Math.abs(Number(course.cover_width) / Number(course.cover_height) - 16 / 9) > 0.02) issues.push("Re-upload the course cover at a minimum processed size of 1280 x 720 (16:9).");
  if (!course.is_free) {
    if (!Number.isFinite(Number(course.price_minor)) || Number(course.price_minor) <= 0) issues.push("Set a valid paid-course price.");
    if (!/^[A-Z]{3}$/.test(course.currency || "")) issues.push("Use a valid three-letter currency.");
    const bachs = await getBachsConfiguration();
    if (!bachs.ready) issues.push("Complete the Bachs checkout and webhook configuration.");
  }
  if (!sections.length) issues.push("Add at least one course section.");
  const published = lessons.filter((lesson) => (lesson.status || "published") === "published");
  if (!published.length) issues.push("Publish at least one lesson.");
  for (const lesson of published) {
    if (["video", "mixed"].includes(lesson.lesson_type)) {
      const sourceType = lesson.source_type || lesson.video_provider;
      if (!sourceType) issues.push(`“${lesson.title}” needs a video source.`);
      else if (sourceType === "upload" && (!lesson.storage_key || lesson.processing_status !== "ready")) issues.push(`“${lesson.title}” has not finished uploading and processing.`);
      else if (sourceType !== "upload" && (!lesson.source_url || !lesson.source_id || !lesson.embed_url || lesson.processing_status !== "ready")) issues.push(`“${lesson.title}” has an invalid or unverified external video.`);
      else if (sourceType !== "upload") { const checked = await checkExternalCourseVideo(getCourseVideoSource(lesson.source_url, sourceType)); if (!checked.ok) issues.push(`“${lesson.title}”: ${checked.error}`); }
    }
    if (lesson.lesson_type === "pdf" && !(lesson.course_resources || []).some((resource) => resource.storage_key)) issues.push(`“${lesson.title}” needs an uploaded PDF.`);
    if (lesson.is_preview && (lesson.status || "published") !== "published") issues.push(`“${lesson.title}” cannot be a free preview while it is a draft.`);
  }
  return [...new Set(issues)];
}

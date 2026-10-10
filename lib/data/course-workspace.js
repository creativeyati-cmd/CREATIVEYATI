import "server-only";
import {
  createSupabaseServiceClient,
  getAdminUser,
} from "@/lib/supabase/server";
import { getAdminCourse } from "@/lib/data/courses";
export async function loadCourseWorkspace(id, { live = false } = {}) {
  const actor = await getAdminUser();
  if (!actor) return null;
  const db = createSupabaseServiceClient();
  if (!db) return null;
  const course = await getAdminCourse(id);
  if (!course) return null;
  const [
    { data: workspace, error },
    { data: materials, error: resourceError },
  ] = await Promise.all([
    db.from("course_workspaces").select("*").eq("course_id", id).maybeSingle(),
    db
      .from("course_resources")
      .select("*")
      .eq("course_id", id)
      .is("lesson_id", null)
      .order("display_order"),
  ]);
  if (error && !["42P01", "PGRST205"].includes(error.code))
    throw new Error(
      "The saved draft could not be loaded. Retry before editing.",
    );
  if (resourceError) throw new Error("Course materials could not be loaded.");
  return {
    document: (!live && workspace?.document) || {
      ...course,
      materials: (materials || [])
        .filter((r) => !r.archived)
        .map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          storageKey: r.storage_key,
          fileSize: r.file_size,
          allowDownload: r.allow_download,
          previewAllowed: r.preview_allowed,
        })),
    },
    revision: workspace?.revision || 0,
    liveUpdatedAt: course.updatedAt,
    liveConflict: Boolean(
      workspace && workspace.base_updated_at !== course.updatedAt,
    ),
    status: course.status,
    userId: actor.id,
    migrationMissing: Boolean(error),
    deleted: false,
  };
}

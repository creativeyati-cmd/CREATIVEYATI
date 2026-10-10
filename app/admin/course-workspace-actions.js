"use server";
import { streamVideoId } from "@/lib/stream-reference";
import { isR2Video } from "@/lib/r2-reference";
import { r2Copy } from "@/lib/r2";
import { randomUUID } from "node:crypto";
import { loadCourseWorkspace } from "@/lib/data/course-workspace";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  getAdminUser,
} from "@/lib/supabase/server";
import {
  validateDocument,
  publishingIssues,
  normalizeWorkspace,
  UUID,
} from "@/lib/course-workspace";
import { getBachsConfiguration } from "@/lib/payments/provider";
import { checkExternalCourseVideo } from "@/lib/course-video-validation";
import { getCourseVideoSource } from "@/lib/course-video-source";
async function context() {
  const actor = await getAdminUser();
  if (!actor)
    throw new Error(
      "Your administrator session expired. Sign in again, then retry your saved draft.",
    );
  const db = createSupabaseServiceClient();
  if (!db) throw new Error("Database unavailable.");
  return { actor, db };
}
function failure(error) {
  return {
    ok: false,
    conflict: error?.code === "40001",
    error:
      error?.code === "40001"
        ? "Another session changed this course. Download your recovery copy, then reload the latest draft before continuing."
        : error?.code === "23505"
          ? "That URL slug is already in use. Choose another slug and try again."
          : error?.code === "PGRST202" || error?.code === "42P01"
            ? "Apply production-course-workspaces.sql in Supabase before saving drafts."
            : error?.message ||
              "The course could not be saved. Your recovery copy is still available.",
  };
}
export async function saveWorkspace(id, revision, document) {
  try {
    const { actor, db } = await context();
    validateDocument(document, id);
    if (!Number.isInteger(revision) || revision < 0)
      throw new Error("Invalid revision.");
    const { data, error } = await db.rpc("save_course_workspace", {
      target_id: id,
      expected_revision: revision,
      draft: document,
      actor: UUID.test(actor.id) ? actor.id : null,
    });
    if (error) return failure(error);
    // Private autosaves must not refresh the editor tree. The course list reads live data.
    return { ok: true, revision: data };
  } catch (error) {
    return failure(error);
  }
}
export async function publishWorkspace(id, revision) {
  try {
    const { db } = await context();
    const { data: w, error } = await db
      .from("course_workspaces")
      .select("document,revision")
      .eq("course_id", id)
      .single();
    if (error) return failure(error);
    if (w.revision !== revision) return failure({ code: "40001" });
    const doc = validateDocument(w.document, id);
    const issues = publishingIssues(doc);
    if (!doc.isFree && !(await getBachsConfiguration()).ready)
      issues.push({
        step: "pricing",
        message: "Complete the Bachs payment and webhook settings first.",
      });
    const normalized = normalizeWorkspace(doc);
    for (const section of normalized.sections)
      for (const lesson of section.lessons) {
        if (lesson.status !== "published") continue;
        if (lesson.source_type === "upload") {
          const { data: asset, error: e } = await db
            .from("media_assets")
            .select("id")
            .eq("course_id", id)
            .eq("storage_key", lesson.storage_key)
            .eq("processing_status", "ready")
            .maybeSingle();
          if (streamVideoId(lesson.storage_key)) issues.push({step:"curriculum",field:lesson.id,message:`${lesson.title}: replace this legacy Stream video with an MP4 upload to R2 before publishing.`});
          if (e || !asset)
            issues.push({
              step: "curriculum",
              field: lesson.id,
              message: `${lesson.title}: video upload has not been verified.`,
            });
        } else if (lesson.source_type) {
          const checked = await checkExternalCourseVideo(
            getCourseVideoSource(lesson.source_url, lesson.source_type),
          );
          if (!checked.ok)
            issues.push({
              step: "curriculum",
              field: lesson.id,
              message: `${lesson.title}: ${checked.error}`,
            });
        }
      }
    for (const resource of normalized.resources) {
      const key = resource.storage_key;
      if (!key.startsWith(`${id}/`) || key.includes("..")) {
        issues.push({
          step: "materials",
          message: `${resource.title || "Document"}: upload this PDF to the course first.`,
        });
        continue;
      }
      const parts = key.split("/");
      const name = parts.pop();
      const { data: objects, error: storageError } = await db.storage
        .from("course-resources")
        .list(parts.join("/"), { search: name, limit: 2 });
      if (storageError || !objects?.some((item) => item.name === name))
        issues.push({
          step: "materials",
          message: `${resource.title || "Document"}: the uploaded PDF is unavailable. Upload it again.`,
        });
    }
    if (issues.length)
      return {
        ok: false,
        error: "Complete the publishing checklist first.",
        issues,
      };
    const { data, error: publishError } = await db.rpc(
      "publish_course_workspace",
      { target_id: id, expected_revision: revision, normalized },
    );
    if (publishError) return failure(publishError);
    revalidatePath("/courses", "layout");
    revalidatePath("/learn", "layout");
    revalidatePath("/admin/courses", "layout");
    revalidatePath("/");
    return { ok: true, revision: data, status: "published" };
  } catch (error) {
    return failure(error);
  }
}
export async function courseLifecycle(id, revision, intent) {
  try {
    const { db } = await context();
    if (!["archive", "unpublish", "restore", "delete"].includes(intent))
      throw new Error("Unknown course action.");
    const { data, error } = await db.rpc("course_workspace_lifecycle", {
      target_id: id,
      expected_revision: revision,
      intent,
    });
    if (error) return failure(error);
    revalidatePath("/admin/courses", "layout");
    revalidatePath("/courses", "layout");
    revalidatePath("/");
    return {
      ok: true,
      revision: data,
      status:
        intent === "unpublish"
          ? "unpublished"
          : intent === "restore"
            ? "draft"
            : "archived",
    };
  } catch (error) {
    return failure(error);
  }
}
export async function workspaceHistory(id) {
  try {
    const { db } = await context();
    const { data, error } = await db
      .from("course_workspace_history")
      .select("id,revision,created_at")
      .eq("course_id", id)
      .order("revision", { ascending: false })
      .limit(20);
    if (error) return failure(error);
    return { ok: true, items: data };
  } catch (error) {
    return failure(error);
  }
}
export async function restoreWorkspaceVersion(id, historyId, revision) {
  try {
    const { db } = await context();
    const { data, error } = await db
      .from("course_workspace_history")
      .select("document")
      .eq("course_id", id)
      .eq("id", historyId)
      .single();
    if (error) return failure(error);
    const result = await saveWorkspace(id, revision, data.document);
    return { ...result, document: result.ok ? data.document : undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function duplicateWorkspace(id) {
  try {
    const { db } = await context();
    const source = await loadCourseWorkspace(id);
    if (!source) throw new Error("Course not found.");
    const document = structuredClone(source.document);
    const nextId = randomUUID();
    document.id = nextId;
    document.title = `${document.title || "Untitled course"} copy`;
    document.slug = `${document.slug || "course"}-copy-${nextId.slice(0, 8)}`;
    // Make the copy resumable before copying potentially large assets.
    const prepared = await saveWorkspace(nextId, 0, {
      ...document,
      sections: [],
      materials: [],
    });
    if (!prepared.ok) return prepared;
    async function copy(bucket, key) {
      if (!key) return "";
      if (bucket === "course-videos" && streamVideoId(key)) return `${nextId}/${randomUUID()}/${streamVideoId(key)}.stream`;
      if (bucket === "course-videos" && isR2Video(key)) {
        const destination=`${nextId}/r2/${randomUUID()}/${randomUUID()}.mp4`;
        await r2Copy(key,destination);
        return destination;
      }
      const destination = `${nextId}/copied/${randomUUID()}.${key.split(".").pop()}`;
      const { error } = await db.storage.from(bucket).copy(key, destination);
      if (error)
        throw new Error(
          "A media file could not be copied. The partial private copy is available in Courses; retry or remove it.",
        );
      return destination;
    }
    async function resources(items) {
      return Promise.all(
        (items || []).map(async (r) => ({
          ...r,
          id: randomUUID(),
          storageKey: await copy("course-resources", r.storageKey),
        })),
      );
    }
    document.materials = await resources(document.materials);
    for (const section of document.sections) {
      section.id = randomUUID();
      for (const lesson of section.lessons) {
        lesson.id = randomUUID();
        lesson.status = "draft";
        lesson.isPreview = false;
        lesson.resources = await resources(lesson.resources);
        if (lesson.posterStorageKey)
          lesson.posterStorageKey = await copy(
            "course-posters",
            lesson.posterStorageKey,
          );
        if (lesson.storageKey) {
          const oldKey = lesson.storageKey;
          lesson.storageKey = await copy("course-videos", oldKey);
          const { data: asset, error } = await db
            .from("media_assets")
            .select("*")
            .eq("storage_key", oldKey)
            .single();
          if (error) throw new Error("Video metadata could not be copied.");
          const { id: ignored, created_at, updated_at, ...record } = asset;
          void ignored;
          void created_at;
          void updated_at;
          const { error: insertError } = await db
            .from("media_assets")
            .insert({
              ...record,
              course_id: nextId,
              lesson_id: null,
              storage_key: lesson.storageKey,
            });
          if (insertError)
            throw new Error("Copied video metadata could not be saved.");
        }
      }
    }
    const result = await saveWorkspace(nextId, prepared.revision, document);
    return { ...result, id: nextId };
  } catch (error) {
    return failure(error);
  }
}

export async function reloadWorkspaceFromLive(id, revision) {
  try {
    const { db } = await context();
    const live = await loadCourseWorkspace(id, { live: true });
    if (!live) throw new Error("Course unavailable.");
    const { data, error } = await db.rpc("rebase_course_workspace", {
      target_id: id,
      expected_revision: revision,
      expected_live_updated: live.liveUpdatedAt,
      live_document: live.document,
    });
    if (error) return failure(error);
    return { ok: true, revision: data, document: live.document };
  } catch (error) {
    return failure(error);
  }
}

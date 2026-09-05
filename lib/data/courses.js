import "server-only";
import { createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";

const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function coursePrice(course) {
  if (course.isFree) return 0;
  const now = Date.now();
  const saleActive = course.discountedPriceMinor != null
    && (!course.saleStartsAt || new Date(course.saleStartsAt).getTime() <= now)
    && (!course.saleEndsAt || new Date(course.saleEndsAt).getTime() >= now);
  return saleActive ? Math.min(course.priceMinor, course.discountedPriceMinor) : course.priceMinor;
}

export function formatMoney(amountMinor, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format((Number(amountMinor) || 0) / 100);
}

function mapResource(row) {
  return { id: row.id, courseId: row.course_id, lessonId: row.lesson_id, title: row.title, description: row.description || "", storageKey: row.storage_key, mimeType: row.mime_type, fileSize: Number(row.file_size) || 0, allowDownload: row.allow_download !== false, previewAllowed: Boolean(row.preview_allowed), displayOrder: row.display_order || 0 };
}

function mapLesson(row, protectedAccess = false) {
  return {
    id: row.id, courseId: row.course_id, sectionId: row.section_id, title: row.title, slug: row.slug,
    lessonType: row.lesson_type, description: row.description || "", body: protectedAccess || row.is_preview ? row.body || "" : "",
    videoProvider: protectedAccess || row.is_preview ? row.video_provider || "" : "",
    videoAssetId: protectedAccess || row.is_preview ? row.video_asset_id || "" : "",
    videoUrl: protectedAccess || row.is_preview ? row.video_url || "" : "",
    sourceType: protectedAccess || row.is_preview ? row.source_type || row.video_provider || "" : "",
    sourceUrl: protectedAccess || row.is_preview ? row.source_url || row.video_url || "" : "",
    sourceId: protectedAccess || row.is_preview ? row.source_id || row.video_asset_id || "" : "",
    storageKey: protectedAccess || row.is_preview ? row.storage_key || "" : "",
    embedUrl: protectedAccess || row.is_preview ? row.embed_url || "" : "",
    externalUrl: protectedAccess || row.is_preview ? row.external_url || "" : "",
    orientation: row.orientation || "landscape", aspectRatio: Number(row.aspect_ratio) || (row.orientation === "portrait" ? 9 / 16 : 16 / 9), width: row.width || 0, height: row.height || 0,
    posterUrl: protectedAccess || row.is_preview ? row.poster_url || "" : "", posterStorageKey: protectedAccess || row.is_preview ? row.poster_storage_key || "" : "",
    captionsUrl: protectedAccess || row.is_preview ? row.captions_url || "" : "", transcript: protectedAccess || row.is_preview ? row.transcript || "" : "",
    privacy: row.privacy || "unlisted", allowDownload: Boolean(row.allow_download), status: row.status || "published", processingStatus: row.processing_status || "ready", processingError: row.processing_error || "",
    durationSeconds: row.duration_seconds || 0, isPreview: Boolean(row.is_preview), displayOrder: row.display_order || 0,
    resources: protectedAccess ? (row.course_resources || []).sort((a, b) => a.display_order - b.display_order).map(mapResource) : [],
  };
}

function mapCourse(row, protectedAccess = false, includeDraftLessons = false) {
  const sections = (row.course_sections || []).sort((a, b) => a.display_order - b.display_order).map((section) => ({
    id: section.id, courseId: section.course_id, title: section.title, description: section.description || "", displayOrder: section.display_order || 0,
    lessons: (section.course_lessons || []).filter((lesson) => includeDraftLessons || !lesson.status || lesson.status === "published").sort((a, b) => a.display_order - b.display_order).map((lesson) => mapLesson(lesson, protectedAccess)),
  }));
  return {
    id: row.id, title: row.title, slug: row.slug, shortDescription: row.short_description || "", description: row.description || "",
    coverImageUrl: row.cover_image_url || "", coverFocalX: Number(row.cover_focal_x) || 50, coverFocalY: Number(row.cover_focal_y) || 50, coverWidth: Number(row.cover_width) || 0, coverHeight: Number(row.cover_height) || 0, instructor: row.instructor || "", category: row.category || "",
    difficulty: row.difficulty || "All levels", language: row.language || "English", estimatedDuration: row.estimated_duration || "",
    priceMinor: Number(row.price_minor) || 0, discountedPriceMinor: row.discounted_price_minor == null ? null : Number(row.discounted_price_minor),
    currency: row.currency || "NGN", isFree: Boolean(row.is_free), status: row.status || "draft", featured: Boolean(row.featured),
    saleStartsAt: row.sale_starts_at || "", saleEndsAt: row.sale_ends_at || "", paymentGateway: row.payment_gateway || "bachs", scheduledFor: row.scheduled_for || "", publishedAt: row.published_at || "",
    promotionalVideoSource: row.promotional_video_source || "", promotionalVideoUrl: row.promotional_video_url || "", promotionalVideoId: row.promotional_video_id || "", promotionalEmbedUrl: row.promotional_embed_url || "", promotionalOrientation: row.promotional_orientation || "landscape", promotionalAspectRatio: Number(row.promotional_aspect_ratio) || 16 / 9,
    learningOutcomes: asList(row.learning_outcomes), requirements: asList(row.requirements), targetAudience: asList(row.target_audience),
    seoTitle: row.seo_title || "", seoDescription: row.seo_description || "", ogImageUrl: row.og_image_url || "", displayOrder: row.display_order || 0,
    createdAt: row.created_at, updatedAt: row.updated_at, sections,
  };
}

const courseSelect = "*, course_sections(*, course_lessons(*, course_resources(*)))";

export async function getPublishedCourses({ featured = false, limit } = {}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  let query = supabase.from("courses").select("*").in("status", ["published", "scheduled"]).is("deleted_at", null).order("display_order");
  if (featured) query = query.eq("featured", true);
  if (limit) query = query.limit(limit);
  const { data = [], error } = await query;
  return error ? [] : data.filter((row) => row.status === "published" || (row.scheduled_for && new Date(row.scheduled_for).getTime() <= Date.now())).map((row) => mapCourse(row));
}

export async function getPublicCourse(slug) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("courses").select(courseSelect).eq("slug", slug).in("status", ["published", "scheduled"]).is("deleted_at", null).maybeSingle();
  if (error || !data || (data.status === "scheduled" && (!data.scheduled_for || new Date(data.scheduled_for).getTime() > Date.now()))) return null;
  const { data: materials = [] } = await supabase.from("course_resources").select("*").eq("course_id", data.id).is("lesson_id", null).eq("preview_allowed", true).order("display_order");
  return { ...mapCourse(data, false), materials: materials.map(mapResource) };
}

export async function getPublicCourseById(id) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("courses").select(courseSelect).eq("id", id).in("status", ["published", "scheduled"]).is("deleted_at", null).maybeSingle();
  if (error || !data || (data.status === "scheduled" && (!data.scheduled_for || new Date(data.scheduled_for).getTime() > Date.now()))) return null;
  return mapCourse(data, false);
}

export async function getAdminCourses() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data = [] } = await supabase.from("courses").select("*").is("deleted_at", null).order("display_order");
  return data.map((row) => mapCourse(row));
}

export async function getAdminCourse(id) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("courses").select(courseSelect).eq("id", id).maybeSingle();
  return data ? mapCourse(data, true, true) : null;
}

export async function getStudentDashboard() {
  const user = await getStudentUser();
  const supabase = createSupabaseServiceClient();
  if (!user || !supabase) return { user: null, profile: null, enrolments: [], orders: [] };
  const [{ data: enrolments = [] }, { data: orders = [] }, { data: progress = [] }, { data: profile }] = await Promise.all([
    supabase.from("enrolments").select("*").eq("student_id", user.id).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("orders").select("*, courses(title,slug,cover_image_url)").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("lesson_progress").select("course_id,lesson_id,completed,updated_at").eq("student_id", user.id),
    supabase.from("student_profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle(),
  ]);
  const courseIds = [...new Set(enrolments.map((item) => item.course_id))];
  const { data: courseRows = [] } = courseIds.length ? await supabase.from("courses").select(courseSelect).in("id", courseIds) : { data: [] };
  const courses = new Map(courseRows.map((row) => [row.id, mapCourse(row, true)]));
  return { user, profile, enrolments: enrolments.map((item) => ({ ...item, course: courses.get(item.course_id) || null, progress: progress.filter((entry) => entry.course_id === item.course_id) })), orders, progress };
}

export async function getEnrolledCourse(slug) {
  const user = await getStudentUser();
  const supabase = createSupabaseServiceClient();
  if (!user || !supabase) return { user, course: null, enrolment: null, progress: [] };
  const { data: courseRow } = await supabase.from("courses").select(courseSelect).eq("slug", slug).in("status", ["published", "scheduled"]).maybeSingle();
  if (!courseRow || (courseRow.status === "scheduled" && (!courseRow.scheduled_for || new Date(courseRow.scheduled_for).getTime() > Date.now()))) return { user, course: null, enrolment: null, progress: [] };
  const [{ data: enrolment }, { data: progress = [] }, { data: materials = [] }] = await Promise.all([
    supabase.from("enrolments").select("*").eq("student_id", user.id).eq("course_id", courseRow.id).eq("active", true).maybeSingle(),
    supabase.from("lesson_progress").select("*").eq("student_id", user.id).eq("course_id", courseRow.id),
    supabase.from("course_resources").select("*").eq("course_id", courseRow.id).is("lesson_id", null).order("display_order"),
  ]);
  const course = { ...mapCourse(courseRow, true), materials: materials.map(mapResource) };
  return { user, course: enrolment ? course : null, enrolment, progress };
}

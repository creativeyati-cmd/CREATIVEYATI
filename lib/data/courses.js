import "server-only";
import { createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";

const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function coursePrice(course) {
  if (course.isFree) return 0;
  return course.discountedPriceMinor == null ? course.priceMinor : Math.min(course.priceMinor, course.discountedPriceMinor);
}

export function formatMoney(amountMinor, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format((Number(amountMinor) || 0) / 100);
}

function mapResource(row) {
  return { id: row.id, lessonId: row.lesson_id, title: row.title, storageKey: row.storage_key, mimeType: row.mime_type, fileSize: Number(row.file_size) || 0, allowDownload: row.allow_download !== false, displayOrder: row.display_order || 0 };
}

function mapLesson(row, protectedAccess = false) {
  return {
    id: row.id, sectionId: row.section_id, title: row.title, slug: row.slug,
    lessonType: row.lesson_type, body: protectedAccess || row.is_preview ? row.body || "" : "",
    videoProvider: protectedAccess || row.is_preview ? row.video_provider || "" : "",
    videoAssetId: protectedAccess || row.is_preview ? row.video_asset_id || "" : "",
    videoUrl: protectedAccess || row.is_preview ? row.video_url || "" : "",
    externalUrl: protectedAccess || row.is_preview ? row.external_url || "" : "",
    durationSeconds: row.duration_seconds || 0, isPreview: Boolean(row.is_preview), displayOrder: row.display_order || 0,
    resources: protectedAccess ? (row.course_resources || []).sort((a, b) => a.display_order - b.display_order).map(mapResource) : [],
  };
}

function mapCourse(row, protectedAccess = false) {
  const sections = (row.course_sections || []).sort((a, b) => a.display_order - b.display_order).map((section) => ({
    id: section.id, courseId: section.course_id, title: section.title, description: section.description || "", displayOrder: section.display_order || 0,
    lessons: (section.course_lessons || []).sort((a, b) => a.display_order - b.display_order).map((lesson) => mapLesson(lesson, protectedAccess)),
  }));
  return {
    id: row.id, title: row.title, slug: row.slug, shortDescription: row.short_description || "", description: row.description || "",
    coverImageUrl: row.cover_image_url || "", instructor: row.instructor || "", category: row.category || "",
    difficulty: row.difficulty || "All levels", language: row.language || "English", estimatedDuration: row.estimated_duration || "",
    priceMinor: Number(row.price_minor) || 0, discountedPriceMinor: row.discounted_price_minor == null ? null : Number(row.discounted_price_minor),
    currency: row.currency || "NGN", isFree: Boolean(row.is_free), status: row.status || "draft", featured: Boolean(row.featured),
    learningOutcomes: asList(row.learning_outcomes), requirements: asList(row.requirements), targetAudience: asList(row.target_audience),
    seoTitle: row.seo_title || "", seoDescription: row.seo_description || "", ogImageUrl: row.og_image_url || "", displayOrder: row.display_order || 0,
    createdAt: row.created_at, updatedAt: row.updated_at, sections,
  };
}

const courseSelect = "*, course_sections(*, course_lessons(*, course_resources(*)))";

export async function getPublishedCourses({ featured = false, limit } = {}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  let query = supabase.from("courses").select("*").eq("status", "published").is("deleted_at", null).order("display_order");
  if (featured) query = query.eq("featured", true);
  if (limit) query = query.limit(limit);
  const { data = [], error } = await query;
  return error ? [] : data.map((row) => mapCourse(row));
}

export async function getPublicCourse(slug) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("courses").select(courseSelect).eq("slug", slug).eq("status", "published").is("deleted_at", null).maybeSingle();
  return error || !data ? null : mapCourse(data, false);
}

export async function getPublicCourseById(id) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("courses").select(courseSelect).eq("id", id).eq("status", "published").is("deleted_at", null).maybeSingle();
  return error || !data ? null : mapCourse(data, false);
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
  return data ? mapCourse(data, true) : null;
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
  const { data: courseRow } = await supabase.from("courses").select(courseSelect).eq("slug", slug).eq("status", "published").maybeSingle();
  if (!courseRow) return { user, course: null, enrolment: null, progress: [] };
  const course = mapCourse(courseRow, true);
  const [{ data: enrolment }, { data: progress = [] }] = await Promise.all([
    supabase.from("enrolments").select("*").eq("student_id", user.id).eq("course_id", course.id).eq("active", true).maybeSingle(),
    supabase.from("lesson_progress").select("*").eq("student_id", user.id).eq("course_id", course.id),
  ]);
  return { user, course: enrolment ? course : null, enrolment, progress };
}

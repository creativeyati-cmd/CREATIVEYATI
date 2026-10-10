import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";

function mapCertificate(row) {
  return {
    id: row.id, studentId: row.student_id, courseId: row.course_id, serial: row.serial,
    studentName: row.student_name || "", courseTitle: row.course_title || "",
    lessonCount: Number(row.lesson_count) || 0, instructionMinutes: Number(row.instruction_minutes) || 0,
    grade: row.grade || "Completed", status: row.status || "valid",
    issuedAt: row.issued_at, revokedAt: row.revoked_at || "", revokeReason: row.revoke_reason || "",
    verifyPath: `/verify/${row.serial}`,
  };
}

export function formatCertificateDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-NG", { dateStyle: "medium" });
}

export async function getStudentCertificates() {
  const user = await getStudentUser();
  const supabase = createSupabaseServiceClient();
  if (!user || !supabase) return [];
  const { data = [], error } = await supabase.from("certificates").select("*").eq("student_id", user.id).order("issued_at", { ascending: false });
  if (error) throw new Error("Certificates could not be loaded. Please try again.");
  return data.map(mapCertificate);
}

export async function getAdminCertificates() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];
  const { data = [], error } = await supabase.from("certificates").select("*").order("issued_at", { ascending: false }).limit(500);
  if (error) throw new Error("Certificates could not be loaded. Please try again.");
  return data.map(mapCertificate);
}

// public lookup by serial; the caller decides what to expose
export async function getCertificateBySerial(serial) {
  const value = String(serial || "").trim();
  const supabase = createSupabaseServiceClient();
  if (!supabase || !value) return null;
  const { data } = await supabase.from("certificates").select("*").ilike("serial", value).maybeSingle();
  return data ? mapCertificate(data) : null;
}

async function resolveStudentName(supabase, studentId) {
  const { data: profile } = await supabase.from("student_profiles").select("full_name").eq("id", studentId).maybeSingle();
  if (profile?.full_name) return profile.full_name;
  const { data } = await supabase.auth.admin.getUserById(studentId);
  return data?.user?.user_metadata?.full_name || data?.user?.email || "";
}

// a course is complete when every published lesson has a completed progress row
export async function courseCompletion(studentId, courseId) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { total: 0, completed: 0, complete: false, minutes: 0, courseTitle: "" };
  const [{ data: lessons = [] }, { data: progress = [] }, { data: course }] = await Promise.all([
    supabase.from("course_lessons").select("id,duration_seconds").eq("course_id", courseId).eq("status", "published"),
    supabase.from("lesson_progress").select("lesson_id").eq("student_id", studentId).eq("course_id", courseId).eq("completed", true),
    supabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
  ]);
  const done = new Set(progress.map((entry) => entry.lesson_id));
  const completed = lessons.filter((lesson) => done.has(lesson.id)).length;
  const seconds = lessons.reduce((sum, lesson) => sum + (Number(lesson.duration_seconds) || 0), 0);
  return { total: lessons.length, completed, complete: lessons.length > 0 && completed === lessons.length, minutes: Math.round(seconds / 60), courseTitle: course?.title || "" };
}

async function nextSerial(supabase) {
  const { data } = await supabase.rpc("next_certificate_serial");
  if (typeof data === "string" && data) return data;
  // the sequence function is the happy path; this keeps issuance working if the
  // migration has not been applied yet
  return `IDY-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

// idempotent: the unique (student_id, course_id) constraint makes a second call a no-op
export async function issueCertificateFor({ studentId, courseId }) {
  const supabase = createSupabaseServiceClient();
  if (!supabase || !studentId || !courseId) return null;
  const state = await courseCompletion(studentId, courseId);
  if (!state.complete) return null;
  const { data: existing } = await supabase.from("certificates").select("id").eq("student_id", studentId).eq("course_id", courseId).maybeSingle();
  if (existing) return null;
  const [serial, studentName] = await Promise.all([nextSerial(supabase), resolveStudentName(supabase, studentId)]);
  const { data, error } = await supabase.from("certificates").insert({
    student_id: studentId, course_id: courseId, serial, student_name: studentName,
    course_title: state.courseTitle, lesson_count: state.total, instruction_minutes: state.minutes,
  }).select("*").maybeSingle();
  if (error || !data) {
    if (error) console.error("certificate issue failed", error.message);
    return null;
  }
  return mapCertificate(data);
}

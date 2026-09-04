"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAuthClient, createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";

function safeNext(value, fallback = "/learn") {
  const path = String(value || "");
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export async function studentSignIn(formData) {
  const supabase = await createSupabaseAuthClient();
  if (!supabase) redirect("/login?error=Student+sign-in+is+not+configured");
  const next = safeNext(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") || "").trim(), password: String(formData.get("password") || "") });
  if (error) redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function studentRegister(formData) {
  const supabase = await createSupabaseAuthClient();
  if (!supabase) redirect("/register?error=Student+registration+is+not+configured");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const next = safeNext(formData.get("next"));
  if (password.length < 8 || !fullName) redirect(`/register?error=${encodeURIComponent("Enter your name and a password of at least 8 characters.")}`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  if (data.user) await createSupabaseServiceClient()?.from("student_profiles").upsert({ id: data.user.id, full_name: fullName, updated_at: new Date().toISOString() });
  if (data.session) redirect(next);
  redirect(`/login?message=${encodeURIComponent("Check your email to verify your account, then sign in.")}`);
}

export async function studentSignOut() {
  const supabase = await createSupabaseAuthClient(); await supabase?.auth.signOut(); redirect("/");
}

export async function requestPasswordReset(formData) {
  const supabase = await createSupabaseAuthClient();
  const email = String(formData.get("email") || "").trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
  await supabase?.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/callback?next=/reset-password/update` });
  redirect("/reset-password?message=If+that+account+exists%2C+a+reset+link+has+been+sent.");
}

export async function updateStudentPassword(formData) {
  const supabase = await createSupabaseAuthClient();
  const password = String(formData.get("password") || "");
  if (password.length < 8) redirect("/reset-password/update?error=Use+at+least+8+characters");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password/update?error=${encodeURIComponent(error.message)}`);
  redirect("/learn?message=Password+updated");
}

export async function updateStudentProfile(formData) {
  const user = await getStudentUser(); const service = createSupabaseServiceClient();
  if (!user || !service) redirect("/login?next=/learn");
  const fullName = String(formData.get("fullName") || "").trim();
  if (!fullName || fullName.length > 120) redirect("/learn?error=Enter+a+valid+name");
  const { error } = await service.from("student_profiles").upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() });
  if (error) redirect("/learn?error=Your+profile+could+not+be+updated");
  revalidatePath("/learn"); redirect("/learn?message=Profile+updated");
}

export async function markLessonComplete(formData) {
  const user = await getStudentUser(); const service = createSupabaseServiceClient();
  const courseId = String(formData.get("courseId") || ""); const lessonId = String(formData.get("lessonId") || ""); const courseSlug = String(formData.get("courseSlug") || "");
  if (!user || !service) redirect(`/login?next=${encodeURIComponent(`/learn/${courseSlug}`)}`);
  const { data: enrolment } = await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", courseId).eq("active", true).maybeSingle();
  if (!enrolment) throw new Error("Course access is required.");
  await service.from("lesson_progress").upsert({ student_id: user.id, course_id: courseId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "student_id,lesson_id" });
  revalidatePath(`/learn/${courseSlug}`);
}

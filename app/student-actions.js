"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAuthClient, createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";
import { issueCertificateFor } from "@/lib/data/certificates";
import { safeNext } from "@/lib/auth/redirect";
import { canResetPassword, clearPasswordRecovery, grantPasswordRecovery } from "@/lib/auth/recovery";
import { ensureStudentProfile } from "@/lib/auth/student-profile";

export async function resendStudentVerification(formData) {
  const supabase = await createSupabaseAuthClient();
  const next = safeNext(formData.get("next"));
  const email = String(formData.get("email") || "").trim();
  (await cookies()).set("avc_signup_email", email, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:3600});
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
  if (!supabase) redirect("/verify-email?error=Email+verification+is+temporarily+unavailable.");
  const { error } = await supabase.auth.resend({ type: "signup", email: String(formData.get("email") || "").trim(), options: { emailRedirectTo: site + "/auth/callback?next=" + encodeURIComponent(next) } });
  if (error) {
    console.error("Auth verification email failed", { code: error.code, status: error.status });
    redirect("/verify-email?next=" + encodeURIComponent(next) + "&error=" + encodeURIComponent(error.status === 429 ? "Too many requests. Please wait before requesting another email." : "The email request could not be completed. Please try again later."));
  }
  redirect("/verify-email?next=" + encodeURIComponent(next) + "&message=If+verification+is+needed%2C+an+email+has+been+sent.");
}

export async function verifyStudentEmail(formData) {
  const supabase = await createSupabaseAuthClient();
  const next = safeNext(formData.get("next"));
  if (!supabase) redirect("/login?error=Sign-in+is+unavailable");
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("token") || "").replace(/\s/g, "");
  (await cookies()).set("avc_signup_email", email, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:3600});
  if (!/^[0-9]{6,10}$/.test(token)) redirect("/verify-email?next="+encodeURIComponent(next)+"&error=Enter+the+code+from+your+latest+verification+email.");
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    console.error("Signup code verification failed", {code:error.code,status:error.status});
    const message = error.status===429 ? "Too many attempts. Wait a moment before trying again." : error.code==="otp_expired" ? "This code is expired or already used. Request a new code below and use only the latest email." : "The code could not be verified. Check the email address and latest code, then try again.";
    redirect("/verify-email?next="+encodeURIComponent(next)+"&error="+encodeURIComponent(message));
  }
  (await cookies()).delete("avc_signup_email");
  await ensureStudentProfile(data.user);
  redirect(next);
}


export async function studentSignIn(formData) {
  const supabase = await createSupabaseAuthClient();
  if (!supabase) redirect("/login?error=Student+sign-in+is+not+configured");
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") || "").trim(), password: String(formData.get("password") || "") });
  if (error?.code === "email_not_confirmed") {
    await resendStudentVerification(formData);
  }
  if (error) redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}&next=${encodeURIComponent(next)}`);
  await ensureStudentProfile(data.user);
  redirect(next);
}

export async function studentRegister(formData) {
  const supabase = await createSupabaseAuthClient();
  if (!supabase) redirect("/register?error=Student+registration+is+not+configured");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const next = safeNext(formData.get("next"));
  if (password.length < 12 || password !== String(formData.get("confirmPassword") || "") || !fullName || fullName.length > 120) redirect(`/register?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Enter your name and matching passwords of at least 12 characters.")}`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, newsletter_opt_in: formData.get("newsletter") === "on" }, emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) redirect(`/register?next=${encodeURIComponent(next)}&error=Registration+could+not+be+completed.+Please+try+again.`);
  // Profile data is written only after authentication, never from an unconfirmed signup result.
  if (data.session) { await ensureStudentProfile(data.user); redirect(next); }
  (await cookies()).set("avc_signup_email", email, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:3600});
  redirect(`/verify-email?next=${encodeURIComponent(next)}&message=Check+your+email+for+your+verification+code.`);
}

export async function studentSignOut() {
  await clearPasswordRecovery();
  const supabase = await createSupabaseAuthClient(); await supabase?.auth.signOut(); redirect("/");
}

export async function requestPasswordReset(formData) {
  const supabase = await createSupabaseAuthClient();
  const email = String(formData.get("email") || "").trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
  const next = safeNext(formData.get("next"));
  const recoveryPath = "/reset-password/update?next=" + encodeURIComponent(next);
  if (!supabase) redirect("/reset-password?error=Password+reset+is+temporarily+unavailable.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(recoveryPath)}` });
  if (error) {
    console.error("Auth password reset email failed", { code: error.code, status: error.status });
    redirect("/reset-password?next=" + encodeURIComponent(next) + "&error=" + encodeURIComponent(error.status === 429 ? "Too many requests. Please wait before requesting another reset email." : "The reset email request could not be completed. Please try again later."));
  }
  (await cookies()).set("avc_recovery_email", email, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:3600});
  redirect("/reset-password/code?next=" + encodeURIComponent(next) + "&message=If+that+account+exists%2C+we+have+sent+a+reset+email.");

}

export async function verifyPasswordRecoveryCode(formData) {
  const next = safeNext(formData.get("next"));
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("token") || "").replace(/\s/g, "");
  const fail = message => redirect("/reset-password/code?next="+encodeURIComponent(next)+"&error="+encodeURIComponent(message));
  (await cookies()).set("avc_recovery_email", email, {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:3600});
  if (!/^[0-9]{6,10}$/.test(token)) fail("Enter the code from your latest password reset email.");
  const supabase = await createSupabaseAuthClient();
  if (!supabase) fail("Password reset is temporarily unavailable. Please try again.");
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type:"recovery" });
  if (error || !data?.user) {
    console.error("Password recovery code failed", {code:error?.code,status:error?.status});
    fail(error?.status===429 ? "Too many attempts. Wait a moment before trying again." : error?.code==="otp_expired" ? "This code is expired or already used. Request a new code and use the latest email." : "Unable to verify this code. Check your email address and code, then try again.");
  }
  await grantPasswordRecovery(data.user.id);
  (await cookies()).delete("avc_recovery_email");
  redirect("/reset-password/update?next="+encodeURIComponent(next));
}

export async function confirmPasswordRecovery(formData) {
  const supabase = await createSupabaseAuthClient();
  const tokenHash = String(formData.get("token_hash") || "");
  const next = safeNext(formData.get("next"));
  if (!supabase || !tokenHash || tokenHash.length > 2048) redirect("/reset-password?error=Open+a+valid+reset+email+to+continue.");
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (error || !data?.user) {
    console.error("Password recovery verification failed", { code: error?.code, status: error?.status });
    redirect("/reset-password?error=This+reset+link+is+invalid+or+expired.+Request+a+new+email+and+use+only+the+latest+link.");
  }
  await grantPasswordRecovery(data.user.id);
  redirect("/reset-password/update?next=" + encodeURIComponent(next));
}

export async function updateStudentPassword(formData) {
  const supabase = await createSupabaseAuthClient();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));
  const user = await getStudentUser();
  if (!supabase || !user || !await canResetPassword(user.id)) redirect("/reset-password?message=Open+a+fresh+reset+email+first");
  if (password.length < 12 || password !== String(formData.get("confirmPassword") || "")) redirect(`/reset-password/update?next=${encodeURIComponent(next)}&error=Use+matching+passwords+of+at+least+12+characters`);
  const fail = message => redirect("/reset-password/update?next=" + encodeURIComponent(next) + "&error=" + encodeURIComponent(message));
  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) fail("Unable to check account security. Please try again.");
  if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) fail("Unable to load your authenticator. Please try again.");
    const factor = factors?.totp?.find(item => item.status === "verified" && item.id === String(formData.get("factorId") || ""));
    const code = String(formData.get("authenticatorCode") || "").trim();
    if (!factor || !/^[0-9]{6}$/.test(code)) fail("Enter the six-digit code from your authenticator app.");
    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (mfaError) fail("The authenticator code is invalid or expired. Enter the latest code.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Password update failed", { code: error.code, status: error.status });
    const messages = {
      same_password: "Choose a new password different from your current password.",
      weak_password: "Choose a stronger password with upper and lowercase letters, numbers and symbols. Avoid common or compromised passwords.",
      insufficient_aal: "Verify your authenticator code before changing your password.",
      reauthentication_needed: "Your session needs fresh verification. Request a new reset email.",
      session_not_found: "Your reset session has ended. Request a new reset email.",
      session_expired: "Your reset session has expired. Request a new reset email.",
      over_request_rate_limit: "Too many attempts. Please wait a moment before trying again.",
    };
    fail(messages[error.code] || "Your password could not be updated. Please try again shortly.");
  }
  await supabase.auth.signOut({ scope: "others" });
  await clearPasswordRecovery();
  redirect("/reset-password/success?next=" + encodeURIComponent(next));
}

export async function updateStudentProfile(formData) {
  const user = await getStudentUser(); const service = createSupabaseServiceClient();
  if (!user || !service) redirect("/login?next=/learn");
  const fullName = String(formData.get("fullName") || "").trim();
  if (!fullName || fullName.length > 120) redirect("/learn?error=Enter+a+valid+name");
  const { error } = await service.from("student_profiles").upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() });
  if (error) redirect("/learn?error=Your+profile+could+not+be+updated");
  revalidatePath("/learn", "layout"); redirect("/learn/profile?message=Profile+updated");
}

export async function updateWeeklyGoal(formData) {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/learn");
  const goal = Number(formData.get("weeklyGoal"));
  if (![3, 5, 7].includes(goal)) redirect("/learn?error=Choose+a+weekly+goal+of+3%2C+5+or+7+lessons.");
  const supabase = await createSupabaseAuthClient();
  const { error } = await supabase.auth.updateUser({ data: { weekly_learning_goal: goal } });
  if (error) redirect("/learn?error=Your+weekly+goal+could+not+be+saved.+Please+try+again.");
  revalidatePath("/learn");
  redirect("/learn?message=Your+weekly+goal+has+been+saved.");
}

export async function markLessonComplete(formData) {
  const user = await getStudentUser(); const service = createSupabaseServiceClient();
  const courseId = String(formData.get("courseId") || ""); const lessonId = String(formData.get("lessonId") || ""); const courseSlug = String(formData.get("courseSlug") || "");
  if (!user || !service) redirect(`/login?next=${encodeURIComponent(`/learn/${courseSlug}`)}`);
  const { data: enrolment } = await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", courseId).eq("active", true).maybeSingle();
  if (!enrolment) throw new Error("Course access is required.");
  const { data: lesson } = await service.from("course_lessons").select("id").eq("id", lessonId).eq("course_id", courseId).eq("status", "published").maybeSingle();
  if (!lesson) throw new Error("This lesson is not available.");
  const { error } = await service.from("lesson_progress").upsert({ student_id: user.id, course_id: courseId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "student_id,lesson_id" });
  if (error) throw new Error("Progress could not be saved. Please try again.");
  // issuing here ties the certificate to the action that actually finishes the course
  await issueCertificateFor({ studentId: user.id, courseId });
  revalidatePath(`/learn/${courseSlug}`);
  revalidatePath("/learn/certificates");
}

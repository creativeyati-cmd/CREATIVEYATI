import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
export async function ensureStudentProfile(user) {
  if (!user?.email_confirmed_at) return;
  const service = createSupabaseServiceClient();
  if (!service) return;
  const { error } = await service.from("student_profiles").upsert({
    id: user.id, full_name: String(user.user_metadata?.full_name || "").trim().slice(0, 120),
  }, { onConflict: "id", ignoreDuplicates: true });
  if (user.user_metadata?.newsletter_opt_in === true) {
    const {error: preferenceError}=await service.from("email_preferences").upsert({student_id:user.id,subscribed:true,consent_at:new Date().toISOString(),source:"verified-signup"},{onConflict:"student_id",ignoreDuplicates:true});
    if(preferenceError && !["42P01","PGRST205"].includes(preferenceError.code)) console.error("Preference could not be stored",{code:preferenceError.code});
  }
  if (error) console.error("Student profile could not be created", { code: error.code });
}

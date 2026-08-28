"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getAdminUser } from "@/lib/supabase/server";
import { contactSettingsSchema, emailSettingsSchema, seoSettingsSchema, videoSchema } from "@/lib/validation";
import { embedUrl, getYouTubeId, thumbnailUrl } from "@/lib/youtube";
import { getSiteContent } from "@/lib/data/site";
import { clearDirectAdminSession, createDirectAdminSession, hasDirectAdminAuth, verifyDirectAdminCredentials } from "@/lib/admin-session";
import { getStoredEmailSettings } from "@/lib/data/settings";
import { canEncryptSmtp, encryptSmtpSettings } from "@/lib/email/crypto";
import { sendSettingsTestEmail } from "@/lib/email/delivery";

async function admin() { const user = await getAdminUser(); if (!user) throw new Error("Unauthorised"); return user; }
export async function login(formData) { const email = String(formData.get("email") || ""); const password = String(formData.get("password") || ""); if (hasDirectAdminAuth()) { if (!verifyDirectAdminCredentials(email, password)) redirect("/admin/login?error=Invalid+email+or+password"); await createDirectAdminSession(email); redirect("/admin"); } const supabase = await createSupabaseServerClient(); if (!supabase) return redirect("/admin/login?error=Admin+sign-in+is+not+configured"); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) redirect("/admin/login?error=Invalid+email+or+password"); redirect("/admin"); }
export async function logout() { await clearDirectAdminSession(); const supabase = await createSupabaseServerClient(); await supabase?.auth.signOut(); redirect("/admin/login"); }
export async function saveVideo(formData) { await admin(); const raw = Object.fromEntries(formData); const parsed = videoSchema.safeParse({ ...raw, categoryId: raw.categoryId || null, year: raw.year || null }); if (!parsed.success) throw new Error(parsed.error.issues[0].message); const data = parsed.data; const id = getYouTubeId(data.youtubeUrl); const record = { title:data.title, slug:data.slug, short_description:data.shortDescription, description:data.description, youtube_url:data.youtubeUrl, youtube_video_id:id, youtube_embed_url:embedUrl(id), youtube_thumbnail_url:thumbnailUrl(id), custom_poster_url:data.posterUrl || null, orientation:data.orientation, aspect_ratio:data.orientation === "portrait" ? 9/16 : 16/9, category_id:data.categoryId || null, status:data.status, year:data.year || null, published_at:data.status === "published" ? new Date().toISOString() : null };
 const supabase = await createSupabaseServerClient(); const videoId = String(formData.get("id") || ""); const result = videoId ? await supabase.from("videos").update(record).eq("id", videoId) : await supabase.from("videos").insert(record); if (result.error) throw new Error("Video could not be saved."); revalidatePath("/"); redirect("/admin/videos"); }
export async function saveCategory(formData) { await admin(); const name = String(formData.get("name") || "").trim(); const slug = String(formData.get("slug") || "").trim(); if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Use a category name and lowercase slug."); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("categories").insert({ name, slug, description:String(formData.get("description") || "") }); if (error) throw new Error("Category could not be saved."); revalidatePath("/"); revalidatePath("/admin/categories"); }
export async function updateEnquiry(formData) { await admin(); const supabase = await createSupabaseServerClient(); await supabase.from("enquiries").update({ status:String(formData.get("status")), internal_notes:String(formData.get("notes") || "") }).eq("id", String(formData.get("id"))); revalidatePath("/admin/enquiries"); }
export async function saveSiteContent(formData) { await admin(); const value = { ...(await getSiteContent()) }; for (const key of Object.keys(value)) if (formData.has(key)) value[key] = String(formData.get(key) ?? "").trim(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("site_content").upsert({ key: "site", value, updated_at: new Date().toISOString() }); if (error) throw new Error("Website content could not be saved."); ["/", "/about", "/contact", "/work"].forEach(revalidatePath); redirect("/admin/content/hero?saved=1"); }

async function saveSetting(key, value) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error("Settings could not be saved.");
}

function settingValues(formData, keys) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) || "").trim()]));
}

export async function saveContactSettings(formData) {
  await admin();
  const parsed = contactSettingsSchema.safeParse(settingValues(formData, ["publicEmail", "phone", "whatsappUrl", "location", "availability", "instagramUrl", "youtubeUrl"]));
  if (!parsed.success) redirect(`/admin/settings/contact?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  await saveSetting("contact", parsed.data);
  ["/", "/about", "/contact", "/services"].forEach(revalidatePath);
  redirect("/admin/settings/contact?saved=1");
}

export async function saveSeoSettings(formData) {
  await admin();
  const parsed = seoSettingsSchema.safeParse(settingValues(formData, ["siteTitle", "siteDescription", "canonicalUrl", "defaultOgImage"]));
  if (!parsed.success) redirect(`/admin/settings/seo?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  await saveSetting("seo", parsed.data);
  revalidatePath("/", "layout");
  redirect("/admin/settings/seo?saved=1");
}

export async function saveEmailSettings(formData) {
  await admin();
  const parsed = emailSettingsSchema.safeParse({
    ...settingValues(formData, ["host", "port", "username", "password", "fromName", "fromEmail", "recipientEmail"]),
    enabled: formData.get("enabled") === "on",
    secure: formData.get("secure") === "on",
    clearPassword: formData.get("clearPassword") === "on",
  });
  if (!parsed.success) redirect(`/admin/settings/email?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const existing = await getStoredEmailSettings();
  const { password: replacement, clearPassword, ...value } = parsed.data;
  if (!canEncryptSmtp()) redirect("/admin/settings/email?error=SMTP+encryption+is+not+configured");
  if (value.enabled && (!value.host || !value.fromEmail || !value.recipientEmail)) redirect("/admin/settings/email?error=Complete+the+host%2C+from+email+and+recipient+before+enabling+delivery");
  value.password = clearPassword ? "" : replacement || existing.password || "";
  await saveSetting("email", { sealed: encryptSmtpSettings(value) });
  redirect("/admin/settings/email?saved=1");
}

export async function testEmailSettings() {
  await admin();
  try { await sendSettingsTestEmail(); }
  catch (error) { redirect(`/admin/settings/email?error=${encodeURIComponent(error.message || "Test email could not be sent.")}`); }
  redirect("/admin/settings/email?tested=1");
}

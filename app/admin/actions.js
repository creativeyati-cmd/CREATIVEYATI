"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";
import { bachsSettingsSchema, contactSettingsSchema, emailSettingsSchema, seoSettingsSchema, videoSchema } from "@/lib/validation";
import { getVideoSource } from "@/lib/video-source";
import { getSiteContent } from "@/lib/data/site";
import { clearDirectAdminSession, createDirectAdminSession, hasDirectAdminAuth, verifyDirectAdminCredentials } from "@/lib/admin-session";
import { getStoredBachsSettings, getStoredEmailSettings } from "@/lib/data/settings";
import { canEncryptSecrets, canEncryptSmtp, encryptSecretSettings, encryptSmtpSettings } from "@/lib/email/crypto";
import { sendCourseConfirmation, sendEnquiryNotification, sendSettingsTestEmail } from "@/lib/email/delivery";
import { recordRefund, requestRefund, testBachsConnection } from "@/lib/payments/provider";
import { getCourseVideoSource } from "@/lib/course-video-source";
import { checkExternalCourseVideo } from "@/lib/course-video-validation";
import { getCoursePublishIssues } from "@/lib/data/course-publishing";

async function admin() { const user = await getAdminUser(); if (!user) throw new Error("Unauthorised"); return user; }
export async function login(formData) { const email = String(formData.get("email") || ""); const password = String(formData.get("password") || ""); if (hasDirectAdminAuth()) { if (!verifyDirectAdminCredentials(email, password)) redirect("/admin/login?error=Invalid+email+or+password"); await createDirectAdminSession(email); redirect("/admin"); } const supabase = await createSupabaseServerClient(); if (!supabase) return redirect("/admin/login?error=Admin+sign-in+is+not+configured"); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) redirect("/admin/login?error=Invalid+email+or+password"); redirect("/admin"); }
export async function logout() { await clearDirectAdminSession(); const supabase = await createSupabaseServerClient(); await supabase?.auth.signOut(); redirect("/admin/login"); }
function jsonObject(value) { try { const parsed = JSON.parse(value || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
function storageKeys(value) { try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string" && /^[A-Za-z0-9/_-]+\.webp$/.test(key) && !key.includes("..")) : []; } catch { return []; } }
function courseCoverStorageKey(value) { const marker = "/storage/v1/object/public/project-covers/"; const index = String(value || "").indexOf(marker); if (index < 0) return ""; try { const key = decodeURIComponent(String(value).slice(index + marker.length)); return /^courses\/[A-Za-z0-9/_-]+\.webp$/.test(key) && !key.includes("..") ? key : ""; } catch { return ""; } }

export async function saveVideo(formData) {
  await admin();
  const raw = Object.fromEntries(formData);
  const parsed = videoSchema.safeParse({ ...raw, categoryId: raw.categoryId || null, year: raw.year || null });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const data = parsed.data;
  if (data.status === "published" && !data.coverImageUrl) throw new Error("Upload a custom 16:9 cover before publishing this project.");
  const source = getVideoSource(data.videoUrl);
  if (!source) throw new Error("Use a supported YouTube or Google Drive video URL.");
  const aspectRatio = data.orientation === "portrait" ? 9 / 16 : 16 / 9;
  const record = {
    title: data.title,
    slug: data.slug,
    short_description: data.shortDescription,
    description: data.description,
    client_name: data.clientName || null,
    creative_role: data.creativeRole || null,
    director: data.director || null,
    production_company: data.productionCompany || null,
    location: data.location || null,
    tags: data.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    credits: data.credits.split(/\r?\n/).map((line) => { const [role, ...name] = line.split(":"); return name.length ? { role: role.trim(), name: name.join(":").trim() } : line.trim(); }).filter(Boolean),
    external_project_url: data.externalProjectUrl || null,
    video_provider: source.provider,
    video_url: data.videoUrl,
    video_asset_id: source.assetId,
    video_embed_url: source.embedUrl,
    video_thumbnail_url: source.thumbnailUrl || null,
    youtube_url: source.provider === "youtube" ? data.videoUrl : null,
    youtube_video_id: source.provider === "youtube" ? source.assetId : null,
    youtube_embed_url: source.provider === "youtube" ? source.embedUrl : null,
    youtube_thumbnail_url: source.provider === "youtube" ? source.thumbnailUrl : null,
    orientation: data.orientation,
    aspect_ratio: aspectRatio,
    cover_image_url: data.coverImageUrl || null,
    cover_image_storage_key: data.coverImageStorageKey || null,
    mobile_cover_image_url: data.mobileCoverImageUrl || null,
    mobile_cover_storage_key: data.mobileCoverStorageKey || null,
    cover_fit: "cover",
    cover_focal_x: data.coverFocalX,
    cover_focal_y: data.coverFocalY,
    cover_alt: data.coverAlt || `${data.title} cover`,
    cover_variants: jsonObject(data.coverVariants),
    mobile_cover_variants: jsonObject(data.mobileCoverVariants),
    // Keep legacy fields populated while existing deployments migrate.
    custom_poster_url: data.coverImageUrl || null,
    mobile_poster_url: data.mobileCoverImageUrl || null,
    display_mode: data.coverFit,
    focal_x: data.coverFocalX / 100,
    focal_y: data.coverFocalY / 100,
    category_id: data.categoryId || null,
    status: data.status,
    year: data.year || null,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Database access is not configured.");
  const videoId = String(formData.get("id") || "");
  if (!videoId) {
    const { data: last } = await supabase.from("videos").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle();
    record.display_order = Number(last?.display_order ?? -1) + 1;
  }
  const result = videoId ? await supabase.from("videos").update(record).eq("id", videoId) : await supabase.from("videos").insert(record);
  if (result.error) throw new Error("Video could not be saved. Confirm the latest database migrations have been applied.");

  const cleanup = storageKeys(data.cleanupStorageKeys);
  if (cleanup.length) {
    const service = createSupabaseServiceClient();
    await service?.storage.from("project-covers").remove(cleanup);
  }
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath(`/work/${data.slug}`);
  redirect("/admin/videos");
}
export async function saveCategory(formData) { await admin(); const name = String(formData.get("name") || "").trim(); const slug = String(formData.get("slug") || "").trim(); if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Use a category name and lowercase slug."); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("categories").insert({ name, slug, description:String(formData.get("description") || "") }); if (error) throw new Error("Category could not be saved."); revalidatePath("/"); revalidatePath("/admin/categories"); }
export async function updateEnquiry(formData) { await admin(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("enquiries").update({ status:String(formData.get("status")), internal_notes:String(formData.get("notes") || "") }).eq("id", String(formData.get("id"))); if (error) redirect(`/admin/enquiries?error=${encodeURIComponent("The enquiry could not be updated.")}`); revalidatePath("/admin/enquiries"); redirect("/admin/enquiries?saved=1"); }

export async function retryEnquiryNotification(formData) {
  await admin();
  const service = createSupabaseServiceClient();
  const id = String(formData.get("id") || "");
  const { data: enquiry, error } = await service.from("enquiries").select("*").eq("id", id).maybeSingle();
  if (error || !enquiry) redirect(`/admin/enquiries?error=${encodeURIComponent("The enquiry could not be found.")}`);
  await service.from("enquiries").update({ notification_status: "pending", updated_at: new Date().toISOString() }).eq("id", id);
  let sent = false;
  try {
    await sendEnquiryNotification({ name: enquiry.name, email: enquiry.email, phone: enquiry.phone || "", company: enquiry.company || "", projectType: enquiry.project_type || "", budget: enquiry.budget || "", timeline: enquiry.timeline || "", message: enquiry.message });
    sent = true;
  } catch {}
  await service.from("enquiries").update({ notification_status: sent ? "sent" : "failed", updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/enquiries");
  redirect(sent ? "/admin/enquiries?notification=sent" : `/admin/enquiries?error=${encodeURIComponent("The enquiry remains saved, but the email notification failed. Check SMTP settings and retry.")}`);
}
export async function saveSiteContent(formData) { await admin(); const value = { ...(await getSiteContent()) }; for (const key of Object.keys(value)) if (formData.has(key)) value[key] = String(formData.get(key) ?? "").trim(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("site_content").upsert({ key: "site", value, updated_at: new Date().toISOString() }); if (error) throw new Error("Website content could not be saved."); const cleanupKey = String(formData.get("profileCleanupKey") || ""); if (cleanupKey && /^[A-Za-z0-9/_-]+\.webp$/.test(cleanupKey) && cleanupKey !== value.profileImageStorageKey) await createSupabaseServiceClient()?.storage.from("profile-images").remove([cleanupKey]); ["/", "/about", "/contact", "/work"].forEach(revalidatePath); redirect("/admin/content/hero?saved=1"); }

export async function reorderVideos(videoIds) {
  await admin();
  if (!Array.isArray(videoIds) || !videoIds.length || videoIds.length > 500 || videoIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return { ok: false, error: "A complete valid project order is required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_videos", { video_ids: videoIds });
  if (error) return { ok: false, error: "The order could not be saved. Apply the latest database migration and try again." };
  revalidatePath("/"); revalidatePath("/work"); revalidatePath("/admin/videos");
  return { ok: true };
}

const socialPlatforms = new Set(["instagram","youtube","tiktok","vimeo","linkedin","x","behance","dribbble","whatsapp","email"]);
function validSocialUrl(platform, value) {
  try { const parsed = new URL(value); return platform === "email" ? parsed.protocol === "mailto:" : ["https:", "http:"].includes(parsed.protocol); }
  catch { return false; }
}

export async function saveSocialLink(formData) {
  await admin();
  const id = String(formData.get("id") || "");
  const platform = String(formData.get("platform") || "");
  const label = String(formData.get("label") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (!socialPlatforms.has(platform) || !label || !validSocialUrl(platform, url)) redirect("/admin/settings/social?error=Enter+a+valid+platform%2C+label+and+URL");
  const supabase = await createSupabaseServerClient();
  const record = { platform, label, url, enabled: formData.get("enabled") === "on", updated_at: new Date().toISOString() };
  let result;
  if (id) result = await supabase.from("social_links").update(record).eq("id", id);
  else {
    const { data: last } = await supabase.from("social_links").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle();
    result = await supabase.from("social_links").insert({ ...record, display_order: Number(last?.display_order ?? -1) + 1 });
  }
  if (result.error) redirect(`/admin/settings/social?error=${encodeURIComponent("That platform is already configured or could not be saved.")}`);
  revalidatePath("/", "layout"); redirect("/admin/settings/social?saved=1");
}

export async function deleteSocialLink(formData) {
  await admin(); const supabase = await createSupabaseServerClient(); await supabase.from("social_links").delete().eq("id", String(formData.get("id") || ""));
  revalidatePath("/", "layout"); redirect("/admin/settings/social?saved=1");
}

export async function moveSocialLink(formData) {
  await admin(); const id = String(formData.get("id") || ""); const direction = String(formData.get("direction") || "up"); const supabase = await createSupabaseServerClient();
  const { data: links = [] } = await supabase.from("social_links").select("id,display_order").order("display_order");
  const index = links.findIndex((link) => link.id === id); const next = direction === "up" ? index - 1 : index + 1;
  if (index >= 0 && next >= 0 && next < links.length) await Promise.all([supabase.from("social_links").update({ display_order: next }).eq("id", links[index].id), supabase.from("social_links").update({ display_order: index }).eq("id", links[next].id)]);
  revalidatePath("/", "layout"); redirect("/admin/settings/social");
}

async function saveSetting(key, value) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_content").upsert({ key: `setting:${key}`, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error("Settings could not be saved.");
}

function settingValues(formData, keys) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) || "").trim()]));
}

export async function saveContactSettings(formData) {
  await admin();
  const parsed = contactSettingsSchema.safeParse(settingValues(formData, ["publicEmail", "phone", "bookingUrl", "whatsappUrl", "location", "availability", "instagramUrl", "youtubeUrl"]));
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

export async function saveBachsSettings(formData) {
  await admin();
  const parsed = bachsSettingsSchema.safeParse({
    ...settingValues(formData, ["apiKey", "webhookSecret"]),
    enabled: formData.get("enabled") === "on",
    clearApiKey: formData.get("clearApiKey") === "on",
    clearWebhookSecret: formData.get("clearWebhookSecret") === "on",
  });
  if (!parsed.success) redirect(`/admin/payments?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  if (!canEncryptSecrets()) redirect("/admin/payments?error=Server-side+secret+encryption+is+not+configured");
  const existing = await getStoredBachsSettings();
  if (existing._decryptionError) redirect("/admin/payments?error=Saved+Bachs+credentials+could+not+be+decrypted");
  const apiKey = parsed.data.clearApiKey ? "" : parsed.data.apiKey || existing.apiKey || "";
  const webhookSecret = parsed.data.clearWebhookSecret ? "" : parsed.data.webhookSecret || existing.webhookSecret || "";
  await saveSetting("bachs", { sealed: encryptSecretSettings({ enabled: parsed.data.enabled, apiKey, webhookSecret }) });
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  redirect("/admin/payments?saved=configuration");
}

export async function testBachsSettings() {
  await admin();
  let result;
  try {
    result = await testBachsConnection();
  } catch (error) {
    redirect(`/admin/payments?error=${encodeURIComponent(error.message || "Bachs connection test failed.")}`);
  }
  redirect(`/admin/payments?tested=${result.limited ? "limited" : "connected"}`);
}

function lineList(value) { return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function moneyToMinor(value) { const amount = Number(value); return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null; }
function validSlug(value) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }

export async function saveCourse(formData) {
  await admin(); const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") || ""); const step = String(formData.get("step") || "details"); let record = { updated_at: new Date().toISOString() }; let slug = ""; let coverImageUrl = "";
  if (step === "details") {
    const title = String(formData.get("title") || "").trim(); slug = String(formData.get("slug") || "").trim(); coverImageUrl = String(formData.get("coverImageUrl") || "").trim(); const promoUrl = String(formData.get("promotionalVideoUrl") || "").trim(); const promoSource = promoUrl ? getCourseVideoSource(promoUrl) : null;
    if (!title || !validSlug(slug) || !/^https?:\/\//i.test(coverImageUrl)) redirect(`/admin/courses/${id || "new"}${id ? "/edit?step=details&" : "?"}error=${encodeURIComponent("Enter a title, lowercase slug and upload a valid 16:9 cover.")}`);
    if (promoUrl && !promoSource) redirect(`/admin/courses/${id || "new"}${id ? "/edit?step=details&" : "?"}error=${encodeURIComponent("Use a valid YouTube, Vimeo or Google Drive promotional video link.")}`);
    const promoOrientation = String(formData.get("promotionalOrientation")) === "portrait" ? "portrait" : "landscape";
    record = { ...record, title, slug, short_description: String(formData.get("shortDescription") || "").trim(), description: String(formData.get("description") || "").trim(), cover_image_url: coverImageUrl, cover_focal_x: Math.min(100, Math.max(0, Number(formData.get("coverFocalX")) || 50)), cover_focal_y: Math.min(100, Math.max(0, Number(formData.get("coverFocalY")) || 50)), cover_width: Number(formData.get("coverWidth")) || null, cover_height: Number(formData.get("coverHeight")) || null, instructor: String(formData.get("instructor") || "").trim(), category: String(formData.get("category") || "").trim(), difficulty: String(formData.get("difficulty") || "All levels"), language: String(formData.get("language") || "English").trim(), estimated_duration: String(formData.get("estimatedDuration") || "").trim(), promotional_video_source: promoSource?.sourceType || null, promotional_video_url: promoSource?.sourceUrl || null, promotional_video_id: promoSource?.sourceId || null, promotional_embed_url: promoSource?.embedUrl || null, promotional_orientation: promoOrientation, promotional_aspect_ratio: promoOrientation === "portrait" ? 9 / 16 : 16 / 9, learning_outcomes: lineList(formData.get("learningOutcomes")), requirements: lineList(formData.get("requirements")), target_audience: lineList(formData.get("targetAudience")), seo_title: String(formData.get("seoTitle") || "").trim() || null, seo_description: String(formData.get("seoDescription") || "").trim() || null, og_image_url: String(formData.get("ogImageUrl") || "").trim() || null };
  } else if (step === "pricing") {
    if (!id) redirect("/admin/courses/new?error=Save+course+details+first"); const price = moneyToMinor(formData.get("price")); const discounted = String(formData.get("discountedPrice") || "").trim(); const discountedPrice = discounted ? moneyToMinor(discounted) : null; const isFree = formData.get("isFree") === "on"; const currency = String(formData.get("currency") || "NGN").trim().toUpperCase(); const saleStartsAt = String(formData.get("saleStartsAt") || ""); const saleEndsAt = String(formData.get("saleEndsAt") || "");
    if (price === null || !/^[A-Z]{3}$/.test(currency) || (discounted && (discountedPrice === null || discountedPrice > price)) || (saleStartsAt && saleEndsAt && new Date(saleEndsAt) <= new Date(saleStartsAt))) redirect(`/admin/courses/${id}/edit?step=pricing&error=${encodeURIComponent("Enter valid prices, currency and sale dates.")}`);
    record = { ...record, price_minor: isFree ? 0 : price, discounted_price_minor: isFree ? null : discountedPrice, currency, is_free: isFree, sale_starts_at: saleStartsAt || null, sale_ends_at: saleEndsAt || null, payment_gateway: "bachs", featured: formData.get("featured") === "on" };
  } else redirect(`/admin/courses/${id}/edit?error=${encodeURIComponent("Unknown course editor step.")}`);
  let result;
  if (id) result = await supabase.from("courses").update(record).eq("id", id).select("id").single();
  else { const { data: last } = await supabase.from("courses").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle(); result = await supabase.from("courses").insert({ ...record, status: "draft", price_minor: 0, currency: "NGN", is_free: true, display_order: Number(last?.display_order ?? -1) + 1 }).select("id").single(); }
  if (result.error) redirect(id ? `/admin/courses/${id}/edit?step=${step}&error=${encodeURIComponent("The course could not be saved. Check that its slug is unique and the workflow migration is applied.")}` : `/admin/courses/new?error=${encodeURIComponent("The course could not be saved. Check that its slug is unique and the workflow migration is applied.")}`);
  const keepCoverKey = courseCoverStorageKey(coverImageUrl);
  const cleanupCoverKeys = storageKeys(formData.get("courseCoverCleanupKeys")).filter((key) => key.startsWith("courses/") && key !== keepCoverKey);
  if (cleanupCoverKeys.length) await createSupabaseServiceClient()?.storage.from("project-covers").remove(cleanupCoverKeys);
  revalidatePath("/"); revalidatePath("/courses"); if (slug) revalidatePath(`/courses/${slug}`); revalidatePath("/admin/courses"); redirect(`/admin/courses/${result.data.id}/edit?step=${step === "details" ? "pricing" : "pricing"}&saved=1`);
}

export async function saveCourseSection(formData) {
  await admin(); const supabase = await createSupabaseServerClient(); const courseId = String(formData.get("courseId") || ""); const sectionId = String(formData.get("id") || ""); const title = String(formData.get("title") || "").trim(); const destination = `/admin/courses/${courseId}/curriculum`; if (!title) redirect(`${destination}?error=${encodeURIComponent("Section title is required.")}`);
  if (sectionId) { const { error } = await supabase.from("course_sections").update({ title, description: String(formData.get("description") || "").trim(), updated_at: new Date().toISOString() }).eq("id", sectionId); if (error) redirect(`${destination}?error=${encodeURIComponent("The section could not be updated.")}`); revalidatePath(destination); redirect(`${destination}?saved=section`); }
  const { data: last } = await supabase.from("course_sections").select("display_order").eq("course_id", courseId).order("display_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("course_sections").insert({ course_id: courseId, title, description: String(formData.get("description") || "").trim(), display_order: Number(last?.display_order ?? -1) + 1 });
  if (error) redirect(`${destination}?error=${encodeURIComponent("The section could not be added.")}`); revalidatePath(destination); redirect(`${destination}?saved=section`);
}

export async function saveCourseLesson(formData) {
  await admin(); const service = createSupabaseServiceClient(); const courseId = String(formData.get("courseId") || ""); const sectionId = String(formData.get("sectionId") || ""); const targetSectionId = String(formData.get("targetSectionId") || sectionId); const lessonId = String(formData.get("id") || ""); const title = String(formData.get("title") || "").trim(); const slug = String(formData.get("slug") || "").trim(); const destination = `/admin/courses/${courseId}/curriculum`; if (!title || !validSlug(slug)) redirect(`${destination}?error=${encodeURIComponent("Lesson title and lowercase slug are required.")}`);
  const { data: targetSection } = await service.from("course_sections").select("id").eq("id", targetSectionId).eq("course_id", courseId).maybeSingle();
  if (!targetSection) redirect(`${destination}?error=${encodeURIComponent("Choose a section that belongs to this course.")}`);
  const lessonType = String(formData.get("lessonType") || "video"); const hasVideo = ["video", "mixed"].includes(lessonType); const sourceType = hasVideo ? String(formData.get("sourceType") || "") : ""; const sourceUrl = String(formData.get("sourceUrl") || "").trim(); const storageKey = String(formData.get("storageKey") || ""); const externalUrl = String(formData.get("externalUrl") || "").trim(); const status = String(formData.get("lessonStatus") || "draft");
  if (externalUrl && !/^https:\/\//i.test(externalUrl)) redirect(`${destination}?error=${encodeURIComponent("Use a complete https:// link for the external resource.")}`);
  let parsedSource = null;
  if (hasVideo && sourceType !== "upload") {
    parsedSource = getCourseVideoSource(sourceUrl, sourceType);
    if (sourceUrl && !parsedSource) redirect(`${destination}?error=${encodeURIComponent("The selected provider does not match that video link.")}`);
    if (status === "published") { const checked = await checkExternalCourseVideo(parsedSource); if (!checked.ok) redirect(`${destination}?error=${encodeURIComponent(checked.error)}`); }
  }
  if (hasVideo && sourceType === "upload") {
    const { data: asset } = await service.from("media_assets").select("storage_key,processing_status").eq("course_id", courseId).eq("storage_key", storageKey).maybeSingle();
    if (status === "published" && (!asset || asset.processing_status !== "ready")) redirect(`${destination}?error=${encodeURIComponent("Upload and verify the lesson video before publishing it.")}`);
  }
  if (status === "published" && hasVideo && !sourceType) redirect(`${destination}?error=${encodeURIComponent("Choose and verify a video source before publishing this lesson.")}`);
  const orientation = String(formData.get("orientation")) === "portrait" ? "portrait" : "landscape"; const duration = Math.max(0, Number(formData.get("durationSeconds")) || 0); const sourceId = parsedSource?.sourceId || String(formData.get("sourceId") || "") || null; const embedUrl = parsedSource?.embedUrl || String(formData.get("embedUrl") || "") || null;
  const lessonRecord = { course_id: courseId, section_id: targetSectionId, title, slug, lesson_type: lessonType, description: String(formData.get("description") || "").trim(), body: String(formData.get("body") || ""), source_type: sourceType || null, source_url: parsedSource?.sourceUrl || null, source_id: sourceId, storage_key: sourceType === "upload" ? storageKey || null : null, embed_url: embedUrl, video_provider: sourceType || null, video_asset_id: sourceId, video_url: parsedSource?.sourceUrl || null, external_url: externalUrl || null, duration_seconds: duration, orientation, aspect_ratio: Number(formData.get("aspectRatio")) || (orientation === "portrait" ? 9 / 16 : 16 / 9), width: Number(formData.get("videoWidth")) || null, height: Number(formData.get("videoHeight")) || null, poster_url: String(formData.get("posterUrl") || "") || null, poster_storage_key: String(formData.get("posterStorageKey") || "") || null, captions_url: String(formData.get("captionsUrl") || "") || null, transcript: String(formData.get("transcript") || ""), privacy: String(formData.get("privacy") || "unlisted"), allow_download: formData.get("allowDownload") === "on", status, processing_status: hasVideo ? String(formData.get("processingStatus") || (parsedSource ? "ready" : "pending")) : "ready", processing_error: null, is_preview: status === "published" && formData.get("isPreview") === "on", updated_at: new Date().toISOString() };
  if (lessonId && formData.get("newLesson") !== "1" && targetSectionId !== sectionId) { const { data: lastTargetLesson } = await service.from("course_lessons").select("display_order").eq("section_id", targetSectionId).order("display_order", { ascending: false }).limit(1).maybeSingle(); lessonRecord.display_order = Number(lastTargetLesson?.display_order ?? -1) + 1; }
  let savedId = lessonId;
  if (lessonId && formData.get("newLesson") !== "1") { const { error } = await service.from("course_lessons").update(lessonRecord).eq("id", lessonId).eq("course_id", courseId); if (error) redirect(`${destination}?error=${encodeURIComponent("The lesson could not be updated. Check its source and unique slug.")}`); }
  else { const { data: last } = await service.from("course_lessons").select("display_order").eq("section_id", targetSectionId).order("display_order", { ascending: false }).limit(1).maybeSingle(); const { data, error } = await service.from("course_lessons").insert({ ...lessonRecord, id: String(formData.get("id") || undefined) || undefined, display_order: Number(last?.display_order ?? -1) + 1 }).select("id").single(); if (error) redirect(`${destination}?error=${encodeURIComponent("The lesson could not be added. Check its source and unique slug.")}`); savedId = data.id; }
  if (storageKey) await service.from("media_assets").update({ lesson_id: savedId, updated_at: new Date().toISOString() }).eq("course_id", courseId).eq("storage_key", storageKey);
  if (lessonRecord.poster_storage_key) await service.from("media_assets").update({ lesson_id: savedId, updated_at: new Date().toISOString() }).eq("course_id", courseId).eq("storage_key", lessonRecord.poster_storage_key);
  const obsolete = String(formData.get("obsoleteStorageKey") || ""); if (obsolete && obsolete !== storageKey && obsolete.startsWith(`${courseId}/`)) { await service.storage.from("course-videos").remove([obsolete]); await service.from("media_assets").delete().eq("storage_key", obsolete); }
  const obsoletePoster = String(formData.get("obsoletePosterStorageKey") || ""); if (obsoletePoster && obsoletePoster !== lessonRecord.poster_storage_key && obsoletePoster.startsWith(`${courseId}/`)) { await service.storage.from("course-posters").remove([obsoletePoster]); await service.from("media_assets").delete().eq("storage_key", obsoletePoster); }
  revalidatePath(destination); revalidatePath(`/courses`, "layout"); redirect(`${destination}?saved=lesson`);
}

export async function deleteCourseSection(formData) { await admin(); const supabase = await createSupabaseServerClient(); const courseId = String(formData.get("courseId") || ""); const destination = `/admin/courses/${courseId}/curriculum`; const { error } = await supabase.from("course_sections").delete().eq("id", String(formData.get("id") || "")); if (error) redirect(`${destination}?error=${encodeURIComponent("The section could not be deleted.")}`); revalidatePath(destination); redirect(`${destination}?saved=deleted`); }
export async function deleteCourseLesson(formData) { await admin(); const service = createSupabaseServiceClient(); const courseId = String(formData.get("courseId") || ""); const lessonId = String(formData.get("id") || ""); const destination = `/admin/courses/${courseId}/curriculum`; const [{ data: media = [] }, { data: resources = [] }] = await Promise.all([service.from("media_assets").select("bucket,storage_key").eq("lesson_id", lessonId).eq("course_id", courseId), service.from("course_resources").select("storage_key").eq("lesson_id", lessonId).eq("course_id", courseId)]); const { error } = await service.from("course_lessons").delete().eq("id", lessonId).eq("course_id", courseId); if (error) redirect(`${destination}?error=${encodeURIComponent("The lesson could not be deleted.")}`); await Promise.all([...media.map((asset) => service.storage.from(asset.bucket).remove([asset.storage_key])), ...resources.map((item) => service.storage.from("course-resources").remove([item.storage_key]))]); revalidatePath(destination); redirect(`${destination}?saved=deleted`); }

export async function duplicateCourseLesson(formData) {
  await admin(); const service = createSupabaseServiceClient(); const courseId = String(formData.get("courseId") || ""); const id = String(formData.get("id") || ""); const destination = `/admin/courses/${courseId}/curriculum`;
  const { data: lesson } = await service.from("course_lessons").select("*").eq("id", id).eq("course_id", courseId).maybeSingle(); if (!lesson) redirect(`${destination}?error=${encodeURIComponent("The lesson could not be found.")}`);
  const { data: last } = await service.from("course_lessons").select("display_order").eq("section_id", lesson.section_id).order("display_order", { ascending: false }).limit(1).maybeSingle();
  const { id: ignored, created_at: created, updated_at: updated, ...copy } = lesson; void ignored; void created; void updated;
  copy.title = `${lesson.title} copy`; copy.slug = `${lesson.slug}-copy-${Date.now().toString(36)}`; copy.display_order = Number(last?.display_order ?? -1) + 1; copy.status = "draft"; copy.is_preview = false;
  if (copy.source_type === "upload") { copy.source_type = null; copy.storage_key = null; copy.processing_status = "pending"; copy.video_provider = null; copy.video_asset_id = null; }
  const { data: duplicated, error } = await service.from("course_lessons").insert(copy).select("id").single(); if (error) redirect(`${destination}?error=${encodeURIComponent("The lesson could not be duplicated.")}`);
  const { data: resources = [] } = await service.from("course_resources").select("*").eq("lesson_id", id).order("display_order"); for (const resource of resources || []) { const nextKey = `${courseId}/${duplicated.id}/${randomUUID()}.pdf`; const { error: copyError } = await service.storage.from("course-resources").copy(resource.storage_key, nextKey); if (!copyError) { const { id: resourceId, lesson_id: owner, created_at: resourceCreated, updated_at: resourceUpdated, ...resourceCopy } = resource; void resourceId; void owner; void resourceCreated; void resourceUpdated; await service.from("course_resources").insert({ ...resourceCopy, lesson_id: duplicated.id, course_id: courseId, storage_key: nextKey }); } }
  revalidatePath(destination); redirect(`${destination}?saved=duplicated`);
}

export async function updateCoursePublication(formData) {
  await admin(); const service = createSupabaseServiceClient(); const courseId = String(formData.get("courseId") || ""); const intent = String(formData.get("intent") || "publish"); const destination = `/admin/courses/${courseId}/edit?step=publish`;
  if (["publish", "schedule"].includes(intent)) { const issues = await getCoursePublishIssues(courseId); if (issues.length) redirect(`${destination}&error=${encodeURIComponent(issues[0])}`); }
  const now = new Date().toISOString(); let record;
  if (intent === "publish") record = { status: "published", published_at: now, scheduled_for: null };
  else if (intent === "schedule") { const scheduledFor = String(formData.get("scheduledFor") || ""); if (!scheduledFor || new Date(scheduledFor).getTime() <= Date.now()) redirect(`${destination}&error=${encodeURIComponent("Choose a future publishing date and time.")}`); record = { status: "scheduled", scheduled_for: new Date(scheduledFor).toISOString() }; }
  else if (intent === "unpublish") record = { status: "unpublished", scheduled_for: null };
  else if (intent === "archive") record = { status: "archived", scheduled_for: null };
  else redirect(`${destination}&error=${encodeURIComponent("Unknown publishing action.")}`);
  const { error } = await service.from("courses").update({ ...record, updated_at: now }).eq("id", courseId).is("deleted_at", null); if (error) redirect(`${destination}&error=${encodeURIComponent("The publishing state could not be changed.")}`); revalidatePath("/"); revalidatePath("/courses"); revalidatePath(`/admin/courses/${courseId}/edit`); redirect(`${destination}&saved=${intent}`);
}

export async function duplicateCourse(formData) {
  await admin(); const service = createSupabaseServiceClient(); const id = String(formData.get("courseId") || ""); const { data: original } = await service.from("courses").select("*").eq("id", id).is("deleted_at", null).maybeSingle(); if (!original) redirect("/admin/courses?error=Course+not+found");
  const { id: ignored, created_at: created, updated_at: updated, published_at: published, scheduled_for: scheduled, ...copy } = original; void ignored; void created; void updated; void published; void scheduled; copy.title = `${original.title} copy`; copy.slug = `${original.slug}-copy-${Date.now().toString(36)}`; copy.status = "draft"; copy.featured = false; copy.duplicated_from = id; const { data: createdCourse, error } = await service.from("courses").insert(copy).select("id").single(); if (error) redirect("/admin/courses?error=Course+could+not+be+duplicated");
  const { data: sections = [] } = await service.from("course_sections").select("*").eq("course_id", id).order("display_order");
  for (const section of sections) { const { id: sectionId, course_id: oldCourse, created_at: sectionCreated, updated_at: sectionUpdated, ...sectionCopy } = section; void oldCourse; void sectionCreated; void sectionUpdated; const { data: newSection } = await service.from("course_sections").insert({ ...sectionCopy, course_id: createdCourse.id }).select("id").single(); const { data: lessons = [] } = await service.from("course_lessons").select("*").eq("section_id", sectionId).order("display_order"); for (const lesson of lessons) { const { id: lessonId, section_id: oldSection, course_id: oldLessonCourse, created_at: lessonCreated, updated_at: lessonUpdated, ...lessonCopy } = lesson; void lessonId; void oldSection; void oldLessonCourse; void lessonCreated; void lessonUpdated; lessonCopy.status = "draft"; lessonCopy.is_preview = false; if (lessonCopy.source_type === "upload") { lessonCopy.source_type = null; lessonCopy.storage_key = null; lessonCopy.processing_status = "pending"; } await service.from("course_lessons").insert({ ...lessonCopy, section_id: newSection.id, course_id: createdCourse.id }); } }
  revalidatePath("/admin/courses"); redirect(`/admin/courses/${createdCourse.id}/edit?saved=duplicated`);
}

export async function deleteCourse(formData) {
  await admin(); const service = createSupabaseServiceClient(); const id = String(formData.get("courseId") || ""); const { error } = await service.from("courses").update({ deleted_at: new Date().toISOString(), status: "archived", featured: false }).eq("id", id); if (error) redirect("/admin/courses?error=Course+could+not+be+deleted"); revalidatePath("/"); revalidatePath("/courses"); revalidatePath("/admin/courses"); redirect("/admin/courses?saved=deleted");
}

export async function reorderCurriculum(kind, parentId, ids, courseId = parentId) {
  await admin(); if (!Array.isArray(ids) || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return { ok: false, error: "Invalid curriculum order." };
  const supabase = await createSupabaseServerClient();
  const rpc = kind === "sections"
    ? ["reorder_course_sections", { target_course: parentId, section_ids: ids }]
    : kind === "lessons"
      ? ["reorder_course_lessons", { target_section: parentId, lesson_ids: ids }]
      : ["reorder_course_resources", { target_lesson: parentId, resource_ids: ids }];
  const { error } = await supabase.rpc(rpc[0], rpc[1]); if (error) return { ok: false, error: "The curriculum order could not be saved." }; revalidatePath(`/admin/courses/${courseId}/curriculum`); return { ok: true };
}

export async function deleteCourseResource(formData) {
  await admin(); const service = createSupabaseServiceClient(); const id = String(formData.get("id") || ""); const courseId = String(formData.get("courseId") || ""); const destination = formData.get("returnTo") === "materials" ? `/admin/courses/${courseId}/materials` : `/admin/courses/${courseId}/curriculum`; const { data, error: lookupError } = await service.from("course_resources").select("storage_key").eq("id", id).eq("course_id", courseId).maybeSingle(); if (lookupError || !data) redirect(`${destination}?error=${encodeURIComponent("The resource could not be found.")}`); const { error } = await service.from("course_resources").delete().eq("id", id).eq("course_id", courseId); if (error) redirect(`${destination}?error=${encodeURIComponent("The resource could not be removed.")}`); if (data.storage_key) await service.storage.from("course-resources").remove([data.storage_key]); revalidatePath(destination); redirect(`${destination}?saved=deleted`);
}

export async function saveCourseSettings(formData) {
  await admin(); await saveSetting("course", { homepageEnabled: formData.get("homepageEnabled") === "on", homepageHeading: String(formData.get("homepageHeading") || "").trim(), homepageCopy: String(formData.get("homepageCopy") || "").trim(), homepageLimit: Math.min(3, Math.max(1, Number(formData.get("homepageLimit")) || 3)) }); revalidatePath("/"); redirect("/admin/course-settings?saved=1");
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export async function saveCarouselSettings(formData) {
  await admin();
  await saveSetting("carousel", {
    enabled: formData.get("enabled") === "on",
    direction: formData.get("direction") === "right" ? "right" : "left",
    desktopSpeed: boundedNumber(formData.get("desktopSpeed"), 10, 60, 32),
    mobileSpeed: boundedNumber(formData.get("mobileSpeed"), 10, 40, 22),
    resumeDelay: boundedNumber(formData.get("resumeDelay"), 0, 6000, 1000),
    disableForReducedMotion: formData.get("disableForReducedMotion") === "on",
  });
  revalidatePath("/");
  redirect("/admin/settings/carousel?saved=1");
}

export async function saveCoupon(formData) {
  await admin(); const supabase = await createSupabaseServerClient(); const code = String(formData.get("code") || "").trim().toUpperCase(); const value = Number(formData.get("discountValue")); const type = String(formData.get("discountType") || "percent"); if (!code || !Number.isFinite(value) || value <= 0 || (type === "percent" && value > 100)) redirect(`/admin/coupons?error=${encodeURIComponent("Enter a coupon code and a valid discount. Percent discounts cannot exceed 100.")}`); const { error } = await supabase.from("coupons").insert({ code, discount_type: type, discount_value: value, currency: String(formData.get("currency") || "NGN").toUpperCase(), max_redemptions: Number(formData.get("maxRedemptions")) || null, starts_at: String(formData.get("startsAt") || "") || null, expires_at: String(formData.get("expiresAt") || "") || null, enabled: formData.get("enabled") === "on" }); if (error) redirect(`/admin/coupons?error=${encodeURIComponent("The coupon could not be created. Make sure its code is unique.")}`); revalidatePath("/admin/coupons"); redirect("/admin/coupons?saved=created");
}

export async function toggleCoupon(formData) { await admin(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("coupons").update({ enabled: formData.get("enabled") === "true", updated_at: new Date().toISOString() }).eq("id", String(formData.get("id") || "")); if (error) redirect(`/admin/coupons?error=${encodeURIComponent("The coupon status could not be changed.")}`); revalidatePath("/admin/coupons"); redirect("/admin/coupons?saved=updated"); }
export async function deleteCoupon(formData) { await admin(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("coupons").delete().eq("id", String(formData.get("id") || "")); if (error) redirect(`/admin/coupons?error=${encodeURIComponent("This coupon could not be deleted because it is already linked to an order.")}`); revalidatePath("/admin/coupons"); redirect("/admin/coupons?saved=deleted"); }

export async function resendCourseConfirmation(formData) {
  await admin(); const service = createSupabaseServiceClient(); const orderId = String(formData.get("orderId") || ""); const { data: order } = await service.from("orders").select("*,courses(title)").eq("id", orderId).eq("payment_status", "successful").maybeSingle(); if (!order) throw new Error("Only verified successful orders can receive a confirmation."); const { data: { user } } = await service.auth.admin.getUserById(order.student_id); if (!user?.email) throw new Error("The student email is unavailable."); await sendCourseConfirmation({ email: user.email, courseTitle: order.courses?.title || "your course", reference: order.reference, amount: order.amount_minor, currency: order.currency });
}

export async function refundOrder(formData) {
  const actor = await admin();
  const service = createSupabaseServiceClient();
  const orderId = String(formData.get("orderId") || "");
  const { data: order } = await service.from("orders").select("*").eq("id", orderId).eq("payment_status", "successful").maybeSingle();
  if (!order) throw new Error("Only a verified successful order can be refunded.");
  if (order.gateway !== "bachs" || !order.gateway_reference) throw new Error("This order does not have a refundable Bachs charge.");
  const refundReference = `refund-${order.reference}`;
  const provider = await requestRefund({ chargeId: order.gateway_reference, reference: refundReference, reason: "Administrator-approved course refund" });
  await recordRefund({ ...provider, charge_id: order.gateway_reference, status: provider.status || "processing" }, actor);
  revalidatePath("/admin/orders"); revalidatePath("/admin/payments");
}

export async function grantCourseAccess(formData) {
  await admin(); const service = createSupabaseServiceClient(); const email = String(formData.get("email") || "").trim().toLowerCase(); const courseId = String(formData.get("courseId") || ""); const destination = `/admin/courses/${courseId}/students`; const { data, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 }); if (usersError) redirect(`${destination}?error=${encodeURIComponent("Student accounts could not be loaded.")}`); const user = data?.users?.find((item) => item.email?.toLowerCase() === email); if (!user) redirect(`${destination}?error=${encodeURIComponent("No student account uses that email.")}`); const { error } = await service.from("enrolments").upsert({ student_id: user.id, course_id: courseId, access_source: "manual", active: true, revoked_at: null }, { onConflict: "student_id,course_id" }); if (error) redirect(`${destination}?error=${encodeURIComponent("Course access could not be granted.")}`); revalidatePath(destination); redirect(`${destination}?saved=granted`);
}
export async function revokeCourseAccess(formData) { const actor = await admin(); const service = createSupabaseServiceClient(); const id = String(formData.get("id") || ""); const courseId = String(formData.get("courseId") || ""); const destination = `/admin/courses/${courseId}/students`; const { error } = await service.from("enrolments").update({ active: false, revoked_at: new Date().toISOString(), granted_by: actor.id === "direct-admin" ? null : actor.id }).eq("id", id); if (error) redirect(`${destination}?error=${encodeURIComponent("Course access could not be revoked.")}`); revalidatePath(destination); redirect(`${destination}?saved=revoked`); }

import "server-only";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getContactSettings } from "@/lib/data/settings";

const labels = {
  instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", vimeo: "Vimeo",
  linkedin: "LinkedIn", x: "X", behance: "Behance", dribbble: "Dribbble",
  whatsapp: "WhatsApp", email: "Email",
};

function fallbackLinks(settings) {
  return [
    ["instagram", settings.instagramUrl],
    ["youtube", settings.youtubeUrl],
    ["whatsapp", settings.whatsappUrl],
    ["email", settings.publicEmail ? `mailto:${settings.publicEmail}` : ""],
  ].filter(([, url]) => url).map(([platform, url], index) => ({ id: `fallback-${platform}`, platform, label: labels[platform], url, displayOrder: index, enabled: true }));
}

function mapLink(row) {
  return { id: row.id, platform: row.platform, label: row.label || labels[row.platform] || row.platform, url: row.url, displayOrder: row.display_order || 0, enabled: row.enabled !== false };
}

export async function getPublicSocialLinks() {
  const supabase = createSupabaseServiceClient() || await createSupabaseServerClient();
  if (!supabase) return fallbackLinks(await getContactSettings());
  const { data, error } = await supabase.from("social_links").select("*").eq("enabled", true).order("display_order");
  if (!error && data?.length) return data.map(mapLink);
  return fallbackLinks(await getContactSettings(supabase));
}

export async function getAdminSocialLinks() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data = [] } = await supabase.from("social_links").select("*").order("display_order");
  return data.map(mapLink);
}

export const socialPlatformLabels = labels;

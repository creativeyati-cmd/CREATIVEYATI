import "server-only";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { decryptSmtpSettings } from "@/lib/email/crypto";

export const contactDefaults = {
  publicEmail: "",
  phone: "",
  bookingUrl: "https://cal.com/yati-creative-dyfafh/30min",
  whatsappUrl: "",
  location: "",
  availability: "Available for selected projects",
  instagramUrl: "",
  youtubeUrl: "",
};

export const seoDefaults = {
  siteTitle: "Frame / Motion",
  siteDescription: "A video creator portfolio.",
  canonicalUrl: "https://aivideocreator.cv",
  defaultOgImage: "",
};

export const emailDefaults = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  username: "",
  fromName: "",
  fromEmail: "",
  recipientEmail: "",
};

export const courseSettingsDefaults = {
  homepageEnabled: false,
  homepageHeading: "Learn the process",
  homepageCopy: "Practical lessons for creating intentional visual work.",
  homepageLimit: 3,
};

export const carouselSettingsDefaults = {
  enabled: true,
  direction: "left",
  desktopSpeed: 32,
  mobileSpeed: 22,
  resumeDelay: 1000,
  disableForReducedMotion: true,
};

async function readSetting(key, defaults, client) {
  const supabase = client || await createSupabaseServerClient();
  if (!supabase) return { ...defaults, _configured: false };
  const { data } = await supabase.from("site_content").select("value").eq("key", `setting:${key}`).maybeSingle();
  if (data) return { ...defaults, ...(data.value || {}), _configured: true };
  const { data: legacy } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return { ...defaults, ...(legacy?.value || {}), _configured: Boolean(legacy) };
}

export function getContactSettings(client) { return readSetting("contact", contactDefaults, client); }
export function getSeoSettings(client) { return readSetting("seo", seoDefaults, client); }
export function getCourseSettings(client) { return readSetting("course", courseSettingsDefaults, client); }
export function getCarouselSettings(client) { return readSetting("carousel", carouselSettingsDefaults, client); }
export async function getStoredEmailSettings(client) {
  const stored = await readSetting("email", emailDefaults, client);
  if (!stored.sealed) return stored;
  try { return { ...emailDefaults, ...decryptSmtpSettings(stored.sealed), _configured: true }; }
  catch { return { ...emailDefaults, _configured: true, _decryptionError: true }; }
}

export async function getEmailSettings(client) {
  const value = await getStoredEmailSettings(client);
  const { password, ...safeValue } = value;
  return { ...safeValue, hasPassword: Boolean(password?.ciphertext) };
}

export async function getServiceEmailSettings() {
  const client = createSupabaseServiceClient();
  return client ? getStoredEmailSettings(client) : { ...emailDefaults };
}

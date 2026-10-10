import "server-only";
import { documentDefaults } from "@/lib/documents/brand";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { decryptSecretSettings, decryptSmtpSettings } from "@/lib/email/crypto";

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
  siteTitle: "Idayat Ibrahim | AI Video Creator, Video Editor & AI Tutor in Nigeria",
  siteDescription: "Idayat Ibrahim is an AI Video Creator, AI Video Editor, Visual Storyteller and AI Video Tutor based in Nigeria, creating AI commercials, UGC-style videos, product ads and branded content for clients worldwide.",
  canonicalUrl: "https://aivideocreator.cv",
  defaultOgImage: "",
};

export const emailDefaults = {
  enabled: false,
  fromName: "",
  fromEmail: "",
  recipientEmail: "",
};

export const bachsDefaults = {
  enabled: true,
  apiKey: "",
  webhookSecret: "",
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
export async function getDocumentSettings(client) {
  const [documents, contact] = await Promise.all([readSetting("documents", documentDefaults, client), getContactSettings(client)]);
  return { ...documents, email: documents.email || contact.publicEmail, phone: documents.phone || contact.phone, address: documents.address || contact.location };
}
export async function getSeoSettings(client) {
  const value = await readSetting("seo", seoDefaults, client);
  return { ...value,
    siteTitle: value.siteTitle === "Frame / Motion" ? seoDefaults.siteTitle : value.siteTitle,
    siteDescription: value.siteDescription === "A video creator portfolio." ? seoDefaults.siteDescription : value.siteDescription,
  };
}
export function getCourseSettings(client) { return readSetting("course", courseSettingsDefaults, client); }
export function getCarouselSettings(client) { return readSetting("carousel", carouselSettingsDefaults, client); }
export async function getStoredEmailSettings(client) {
  const stored = await readSetting("email", emailDefaults, client);
  if (!stored.sealed) return stored;
  try { return { ...emailDefaults, ...decryptSmtpSettings(stored.sealed), _configured: true }; }
  catch { return { ...emailDefaults, _configured: true, _decryptionError: true }; }
}

export async function getServiceEmailSettings() {
  const client = createSupabaseServiceClient();
  return client ? getStoredEmailSettings(client) : { ...emailDefaults };
}

export async function getStoredBachsSettings(client) {
  const stored = await readSetting("bachs", bachsDefaults, client);
  if (!stored.sealed) return stored;
  try { return { ...bachsDefaults, ...decryptSecretSettings(stored.sealed), _configured: true }; }
  catch { return { ...bachsDefaults, _configured: true, _decryptionError: true }; }
}

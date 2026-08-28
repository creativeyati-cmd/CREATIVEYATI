import "server-only";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { decryptSmtpSettings } from "@/lib/email/crypto";

export const contactDefaults = {
  publicEmail: "",
  phone: "",
  bookingUrl: "https://cal.com/yati-creative-dyfafh",
  whatsappUrl: "",
  location: "",
  availability: "",
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

async function readSetting(key, defaults, client) {
  const supabase = client || await createSupabaseServerClient();
  if (!supabase) return { ...defaults, _configured: false };
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return { ...defaults, ...(data?.value || {}), _configured: Boolean(data) };
}

export function getContactSettings(client) { return readSetting("contact", contactDefaults, client); }
export function getSeoSettings(client) { return readSetting("seo", seoDefaults, client); }
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

import { z } from "zod";
import { getYouTubeId } from "./youtube";

const optionalUrl = z.union([z.literal(""), z.url()]).optional();
const optionalStorageKey = z.string().trim().max(500).refine((value) => !value || (!value.includes("..") && /^[A-Za-z0-9/_-]+\.webp$/.test(value)), "Invalid cover storage key.").optional();

export const videoSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  shortDescription: z.string().trim().max(320).default(""),
  description: z.string().trim().max(10000).default(""),
  clientName: z.string().trim().max(160).default(""),
  creativeRole: z.string().trim().max(160).default(""),
  director: z.string().trim().max(160).default(""),
  productionCompany: z.string().trim().max(160).default(""),
  location: z.string().trim().max(160).default(""),
  tags: z.string().trim().max(1000).default(""),
  credits: z.string().trim().max(5000).default(""),
  externalProjectUrl: optionalUrl,
  youtubeUrl: z.string().url().refine((url) => !!getYouTubeId(url), "Use a supported YouTube URL."),
  orientation: z.enum(["portrait", "landscape"]),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  coverImageUrl: optionalUrl,
  coverImageStorageKey: optionalStorageKey,
  mobileCoverImageUrl: optionalUrl,
  mobileCoverStorageKey: optionalStorageKey,
  coverFit: z.enum(["cover", "contain"]),
  coverFocalX: z.coerce.number().min(0).max(100),
  coverFocalY: z.coerce.number().min(0).max(100),
  coverAlt: z.string().trim().max(240).default(""),
  coverVariants: z.string().max(20000).default("{}"),
  mobileCoverVariants: z.string().max(20000).default("{}"),
  cleanupStorageKeys: z.string().max(20000).default("[]"),
  year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
});

export const enquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  projectType: z.string().trim().max(100).optional(),
  budget: z.string().trim().max(100).optional(),
  timeline: z.string().trim().max(100).optional(),
  message: z.string().trim().min(1, "Tell us a little about the project.").max(5000),
  consent: z.literal("on", { error: "Please confirm you agree to be contacted." }),
  website: z.string().max(0).optional(),
});

export const contactSettingsSchema = z.object({
  publicEmail: z.union([z.literal(""), z.string().email()]),
  phone: z.string().trim().max(40),
  bookingUrl: optionalUrl,
  whatsappUrl: optionalUrl,
  location: z.string().trim().max(120),
  availability: z.string().trim().max(160),
  instagramUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

export const seoSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(100),
  siteDescription: z.string().trim().min(1).max(320),
  canonicalUrl: z.url(),
  defaultOgImage: optionalUrl,
});

export const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(253),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().max(320),
  password: z.string().max(1000),
  clearPassword: z.boolean(),
  fromName: z.string().trim().max(120),
  fromEmail: z.union([z.literal(""), z.string().email()]),
  recipientEmail: z.union([z.literal(""), z.string().email()]),
});

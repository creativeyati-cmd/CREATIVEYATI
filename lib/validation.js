import { z } from "zod";
import { getYouTubeId } from "./youtube";

const optionalUrl = z.union([z.literal(""), z.url()]).optional();

export const videoSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  shortDescription: z.string().trim().max(320).default(""),
  description: z.string().trim().max(10000).default(""),
  youtubeUrl: z.string().url().refine((url) => !!getYouTubeId(url), "Use a supported YouTube URL."),
  orientation: z.enum(["portrait", "landscape"]),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  posterUrl: optionalUrl,
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

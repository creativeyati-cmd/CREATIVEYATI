import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function textureUrl(row) {
  const variants = row.cover_variants && typeof row.cover_variants === "object" ? row.cover_variants : {};
  return variants.tablet || variants.desktop || row.cover_image_url || row.custom_poster_url || row.youtube_thumbnail_url || "/img1.png";
}

const mapVideo = (row) => ({
  id: row.id, title: row.title, slug: row.slug, shortDescription: row.short_description || "",
  description: row.description || "", clientName: row.client_name || "",
  posterUrl: textureUrl(row),
  mobilePosterUrl: row.mobile_cover_image_url || row.mobile_poster_url || "",
  coverImageUrl: row.cover_image_url || row.custom_poster_url || "",
  coverImageStorageKey: row.cover_image_storage_key || "",
  mobileCoverImageUrl: row.mobile_cover_image_url || row.mobile_poster_url || "",
  mobileCoverStorageKey: row.mobile_cover_storage_key || "",
  coverVariants: row.cover_variants || {}, mobileCoverVariants: row.mobile_cover_variants || {},
  coverFit: row.cover_fit || row.display_mode || "cover",
  coverFocalX: Number(row.cover_focal_x ?? (row.focal_x == null ? 50 : row.focal_x * 100)),
  coverFocalY: Number(row.cover_focal_y ?? (row.focal_y == null ? 50 : row.focal_y * 100)),
  coverAlt: row.cover_alt || `${row.title || "Project"} cover`, youtubeThumbnailUrl: row.youtube_thumbnail_url || "",
  youtubeUrl: row.youtube_url || "", youtubeVideoId: row.youtube_video_id || "", orientation: row.orientation || "landscape",
  aspectRatio: Number(row.aspect_ratio) || (row.orientation === "portrait" ? 9 / 16 : 16 / 9),
  creativeRole: row.creative_role || "", director: row.director || "",
  productionCompany: row.production_company || "", location: row.location || "",
  tags: Array.isArray(row.tags) ? row.tags : [], credits: Array.isArray(row.credits) ? row.credits : [],
  externalProjectUrl: row.external_project_url || "",
  year: row.year, displayOrder: row.display_order || 0, category: row.categories ? { id: row.categories.id, name: row.categories.name, slug: row.categories.slug } : null,
});

export async function getPublicPortfolio(category) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { videos: [], categories: [], error: "Portfolio content is being configured." };
  let query = supabase.from("videos").select("*, categories(id,name,slug)").eq("status", "published").order("display_order");
  if (category) query = query.eq("categories.slug", category);
  const { data, error } = await query;
  if (error) return { videos: [], categories: [], error: "Published work is temporarily unavailable." };
  const { data: categories = [] } = await supabase.from("categories").select("id,name,slug").eq("is_visible", true).order("display_order");
  return { videos: data.map(mapVideo), categories, usingDemoData: false };
}

export async function getPublicVideo(slug) {
  const { videos } = await getPublicPortfolio();
  return videos.find((video) => video.slug === slug) || null;
}

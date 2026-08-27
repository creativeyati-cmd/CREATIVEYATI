import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mapVideo = (row) => ({
  id: row.id, title: row.title, slug: row.slug, shortDescription: row.short_description || "",
  description: row.description || "", clientName: row.client_name || "", posterUrl: row.custom_poster_url || row.youtube_thumbnail_url || "/img1.png",
  youtubeUrl: row.youtube_url || "", youtubeVideoId: row.youtube_video_id || "", orientation: row.orientation || "landscape",
  aspectRatio: Number(row.aspect_ratio) || (row.orientation === "portrait" ? 9 / 16 : 16 / 9),
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

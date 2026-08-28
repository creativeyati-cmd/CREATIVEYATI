const DEFAULT_POSTER = "/img1.png";

function objectValue(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function percentage(value, fallback = 50) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

export function projectOrientation(project) {
  return project?.orientation === "portrait" ? "portrait" : "landscape";
}

export function projectAspectRatio(project) {
  const orientation = projectOrientation(project);
  const stored = Number(project?.aspectRatio ?? project?.aspect_ratio);
  return stored > 0 ? stored : orientation === "portrait" ? 9 / 16 : 16 / 9;
}

export function projectCovers(project) {
  const mainUrl = project?.coverImageUrl || project?.cover_image_url || project?.custom_poster_url || "";
  const mobileUrl = project?.mobileCoverImageUrl || project?.mobile_cover_image_url || project?.mobile_poster_url || "";
  const youtubeUrl = project?.youtubeThumbnailUrl || project?.youtube_thumbnail_url || "";
  return {
    mainUrl,
    mobileUrl,
    youtubeUrl,
    fallbackUrl: project?.posterUrl || mainUrl || youtubeUrl || DEFAULT_POSTER,
    mainVariants: objectValue(project?.coverVariants || project?.cover_variants),
    mobileVariants: objectValue(project?.mobileCoverVariants || project?.mobile_cover_variants),
    fit: project?.coverFit || project?.cover_fit || project?.display_mode || "cover",
    focalX: percentage(project?.coverFocalX ?? project?.cover_focal_x ?? (project?.focal_x == null ? 50 : Number(project.focal_x) * 100)),
    focalY: percentage(project?.coverFocalY ?? project?.cover_focal_y ?? (project?.focal_y == null ? 50 : Number(project.focal_y) * 100)),
    alt: project?.coverAlt || project?.cover_alt || `${project?.title || "Project"} cover`,
  };
}

export function variantSrcSet(variants) {
  const widths = { mobile: 640, tablet: 1280, desktop: 1920 };
  return Object.entries(widths).filter(([name]) => variants?.[name]).map(([name, width]) => `${variants[name]} ${width}w`).join(", ");
}

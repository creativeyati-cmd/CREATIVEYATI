import { getGoogleDriveId, googleDriveEmbedUrl } from "@/lib/video-source";
import { getYouTubeId, thumbnailUrl } from "@/lib/youtube";

const VIMEO_ID = /^\d{5,20}$/;

export function getVimeoId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (!["vimeo.com", "player.vimeo.com"].includes(host)) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const id = [...segments].reverse().find((part) => VIMEO_ID.test(part));
    return id || null;
  } catch { return null; }
}

export function courseYouTubeEmbedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?playsinline=1&controls=1&rel=0&modestbranding=1`;
}

export function vimeoEmbedUrl(id) {
  return `https://player.vimeo.com/video/${encodeURIComponent(id)}?dnt=1`;
}

export function getCourseVideoSource(value, expectedType = "") {
  const url = String(value || "").trim();
  if (!url) return null;
  const youtubeId = getYouTubeId(url);
  if (youtubeId && (!expectedType || expectedType === "youtube")) return { sourceType: "youtube", sourceId: youtubeId, sourceUrl: url, embedUrl: courseYouTubeEmbedUrl(youtubeId), posterUrl: thumbnailUrl(youtubeId) };
  const vimeoId = getVimeoId(url);
  if (vimeoId && (!expectedType || expectedType === "vimeo")) return { sourceType: "vimeo", sourceId: vimeoId, sourceUrl: url, embedUrl: vimeoEmbedUrl(vimeoId), posterUrl: "" };
  const driveId = getGoogleDriveId(url);
  if (driveId && (!expectedType || expectedType === "google_drive")) return { sourceType: "google_drive", sourceId: driveId, sourceUrl: url, embedUrl: googleDriveEmbedUrl(driveId), posterUrl: "" };
  return null;
}

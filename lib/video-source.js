import { embedUrl as youtubeEmbedUrl, getYouTubeId, thumbnailUrl as youtubeThumbnailUrl } from "./youtube";

const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;

export function getGoogleDriveId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "drive.google.com") return null;
    const pathId = url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1];
    const id = pathId || url.searchParams.get("id");
    return id && DRIVE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function googleDriveEmbedUrl(id) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function getVideoSource(value) {
  const youtubeId = getYouTubeId(value);
  if (youtubeId) return {
    provider: "youtube",
    assetId: youtubeId,
    embedUrl: youtubeEmbedUrl(youtubeId),
    thumbnailUrl: youtubeThumbnailUrl(youtubeId),
  };

  const driveId = getGoogleDriveId(value);
  if (driveId) return {
    provider: "google_drive",
    assetId: driveId,
    embedUrl: googleDriveEmbedUrl(driveId),
    thumbnailUrl: "",
  };

  return null;
}

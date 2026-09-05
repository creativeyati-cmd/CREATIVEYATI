import "server-only";

export async function checkExternalCourseVideo(source) {
  if (!source) return { ok: false, error: "The video link is not recognised." };
  try {
    if (source.sourceType === "youtube") {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(source.sourceUrl)}&format=json`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      return response.ok ? { ok: true } : { ok: false, error: "YouTube could not confirm that this video can be embedded." };
    }
    if (source.sourceType === "vimeo") {
      const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(source.sourceUrl)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      return response.ok ? { ok: true } : { ok: false, error: "Vimeo blocked the preview. Check the video privacy and approved embed domains." };
    }
    if (source.sourceType === "google_drive") {
      const response = await fetch(source.embedUrl, { method: "GET", cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { ok: false, error: "Google Drive could not open this file. Check its sharing permission." };
      const sample = (await response.text()).slice(0, 20000).toLowerCase();
      if (sample.includes("request access") || sample.includes("sign in to continue")) return { ok: false, error: "Google Drive requires permission for this file. Share it with the intended audience first." };
      return { ok: true };
    }
  } catch {}
  return { ok: false, error: "The provider preview could not be verified. Save the lesson as a draft or correct the source." };
}

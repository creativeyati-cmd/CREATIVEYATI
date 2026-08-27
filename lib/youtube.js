const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const id = host === "youtu.be"
      ? url.pathname.slice(1)
      : url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    return id && YOUTUBE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function embedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1`;
}

export function thumbnailUrl(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

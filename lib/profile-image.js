export function normaliseProfileImageUrl(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  try {
    const url = new URL(source);
    if (url.hostname === "drive.google.com") {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = fileMatch?.[1] || url.searchParams.get("id");
      if (id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`;
    }
  } catch {}
  return source;
}

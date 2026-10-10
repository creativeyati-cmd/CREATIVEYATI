export const serviceMediaSlots = [
  { id: "hero", title: "Services hero", image: "/img8.png" },
  { id: "commercials", title: "AI commercials & brand films", image: "/img8.png" },
  { id: "products", title: "Product videos & advertisements", image: "/img6.png" },
  { id: "social", title: "Social & UGC-style content", image: "/img3.png" },
  { id: "editing", title: "Video editing & post-production", image: "/img1.png" },
];
export const SERVICE_MEDIA_BUCKET = "service-media";
export const serviceMediaTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm" };
export function validServiceMediaKey(key, slot) {
  return typeof key === "string" && serviceMediaSlots.some(item => item.id === slot) && new RegExp(`^${slot}/[0-9a-f-]{36}\\.(jpg|png|webp|avif|mp4|webm)$`).test(key);
}
export function serviceMediaLimit(type) { return type?.startsWith("video/") ? 100 * 1024 * 1024 : 8 * 1024 * 1024; }

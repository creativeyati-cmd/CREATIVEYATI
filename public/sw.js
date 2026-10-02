// Offline course delivery, Tier 2: casual sharing is blocked, extraction from
// browser storage is accepted. Media is cached same-origin only — an embedded
// YouTube or Vimeo lesson lives on someone else's server and cannot be cached,
// so those lessons simply keep requiring a connection.

const VERSION = "v1";
const SHELL = `cy-shell-${VERSION}`;
const MEDIA = `cy-media-${VERSION}`;
const MEDIA_PREFIX = "/api/learn/media/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SHELL && key !== MEDIA).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// the page asks for this on sign-out, so a shared device keeps nothing
self.addEventListener("message", (event) => {
  if (event.data === "purge-cache") event.waitUntil(purge());
});

async function purge() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // never intercept third-party media: embeds cannot be played offline at all
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(MEDIA_PREFIX)) { event.respondWith(mediaFirst(request)); return; }
  if (request.mode === "navigate") event.respondWith(shellFirst(request));
});

// uploaded lesson media is immutable, so a cache hit is served without hitting
// the network. the route redirects to a short-lived signed url; fetch follows
// it, so the bytes are stored under the stable route url instead of the
// expiring one, which is what makes offline playback work at all.
async function mediaFirst(request) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.status === 200) cache.put(request, response.clone());
  return response;
}

async function shellFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw new Error("offline");
  }
}

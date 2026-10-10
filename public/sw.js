const CACHE="avc-public-shell-v1";
const PUBLIC=["/offline.html","/pwa/icon-192.png","/pwa/icon-512.png","/pwa/maskable-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC)).then(()=>self.skipWaiting())));
async function purge(){for(const key of await caches.keys())if(key!==CACHE&&(key.startsWith("avc-public-shell-")||key.startsWith("cy-shell-")||key.startsWith("cy-media-")))await caches.delete(key);}
self.addEventListener("activate",event=>event.waitUntil(purge().then(()=>self.clients.claim())));
self.addEventListener("message",event=>{if(event.data==="purge-cache")event.waitUntil(purge());});
self.addEventListener("fetch",event=>{
 const req=event.request;const url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin)return;
 // Never cache authenticated HTML, APIs, payment pages, signed media, or RSC responses.
 if(req.mode==="navigate")event.respondWith(fetch(req).catch(async()=>await caches.match("/offline.html")||Response.error()));
 else if(PUBLIC.includes(url.pathname)&&!url.search)event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});

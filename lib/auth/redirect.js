const COURSE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The proxy stores the course a signed-out visitor opened so that a bare
// /login still has somewhere to send them back to. Read it through
// checkoutIntentPath before trusting it.
export const CHECKOUT_COOKIE = "avc_checkout";

export function checkoutIntentPath(courseId) {
  const id = String(courseId || "");
  return COURSE_ID.test(id) ? `/checkout/${id.toLowerCase()}` : "";
}

export function safeNext(value, fallback="/learn") {
 const path=String(value||"");
 if(!path.startsWith("/")||path.startsWith("//")||/[\\\x00-\x20]/.test(path))return fallback;
 try { const url=new URL(path,"https://local.invalid"); return url.origin==="https://local.invalid" ? url.pathname+url.search+url.hash : fallback; } catch { return fallback; }
}

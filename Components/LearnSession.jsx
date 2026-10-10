"use client";

import { useEffect } from "react";

// owns the client side of the learn session: registers the offline worker, and
// makes sign-out wipe everything it cached so a shared device keeps nothing.
export default function LearnSession({ signOut }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    // clear the page-level caches too, not just the worker's, in case the worker
    // is unavailable or was never activated on this browser
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => !key.startsWith("avc-public-shell-")).map((key) => caches.delete(key)));
      }
      navigator.serviceWorker?.controller?.postMessage("purge-cache");
    } catch {
      // a failed purge must never block signing out
    }
    form.submit();
  }

  return <form action={signOut} onSubmit={handleSubmit}><button>Sign out</button></form>;
}

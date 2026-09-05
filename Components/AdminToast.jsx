"use client";

import { useEffect, useState } from "react";

export default function AdminToast({ message, kind = "success" }) {
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setVisible(false), 4500); return () => window.clearTimeout(timer); }, [message]);
  if (!message) return null;
  return <div className={`t-toast is-${kind}${visible ? " is-open" : ""}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"}><span>{kind === "error" ? "!" : "✓"}</span><p>{message}</p><button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)}>×</button></div>;
}

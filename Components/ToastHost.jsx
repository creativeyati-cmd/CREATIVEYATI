"use client";

import { useEffect, useState } from "react";
import "./toast.css";

export function notify(message, kind = "success", id = crypto.randomUUID()) {
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { id, message, kind } }));
  return id;
}
export function dismissToast(id) {
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { id, dismiss: true } }));
}
export function usePendingToast(pending, message = "Working...") {
  useEffect(() => {
    if (!pending) return;
    const id = notify(message, "loading");
    return () => dismissToast(id);
  }, [pending, message]);
}

function Toast({ item, remove }) {
  const [paused, setPaused] = useState(false);
  const busy = item.kind === "loading" || item.kind === "downloading";
  useEffect(() => {
    if (busy || paused) return;
    const timer = setTimeout(() => remove(item.id), item.kind === "error" ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [busy, paused, item, remove]);
  return <div className={`app-toast is-${item.kind}${item.closing ? " is-closing" : ""}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}>
    <span className={`app-toast-icon${busy ? " is-spinning" : ""}`} aria-hidden="true">{busy ? "" : item.kind === "error" ? "!" : item.kind === "success" ? "\u2713" : "i"}</span>
    <div role={item.kind === "error" ? "alert" : "status"} aria-atomic="true"><strong>{({ success: "Success", error: "Something went wrong", loading: "In progress", downloading: "Downloading", info: "Notice" })[item.kind] || "Notice"}</strong><p>{item.message}</p></div>
    <button type="button" aria-label="Dismiss notification" onClick={() => remove(item.id)}>{"\u00d7"}</button>
  </div>;
}
const remove = (id) => dismissToast(id);

export function LoadingToast({ message }) {
  usePendingToast(true, message);
  return null;
}

export default function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const timers = new Set();
    const receive = ({ detail }) => {
      setItems((current) => detail.dismiss
        ? current.map((item) => item.id === detail.id ? { ...item, closing: true } : item)
        : [...current.filter((item) => item.id !== detail.id && !(item.kind === detail.kind && item.message === detail.message && !["loading", "downloading"].includes(item.kind))), detail].slice(-4));
      if (detail.dismiss) {
        const timer = setTimeout(() => {
          setItems((current) => current.filter((item) => item.id !== detail.id || !item.closing));
          timers.delete(timer);
        }, 250);
        timers.add(timer);
      }
    };
    window.addEventListener("app:toast", receive);
    // Relay existing durable inline feedback without announcing unrelated status text.
    const seen = new WeakMap();
    const scan = () => {
      document.querySelectorAll(".success-note, .form-error, [data-toast-message]").forEach((node) => {
        const message = (node.dataset.toastMessage || node.textContent || "").trim();
        const kind = node.dataset.toastKind || (node.classList.contains("form-error") ? "error" : "success");
        const prior = seen.get(node);
        const cycle = node.closest("[data-toast-cycle]")?.dataset.toastCycle || "";
        const signature = `${cycle}:${kind}:${message}`;
        if (!message) { seen.delete(node); return; }
        if (prior?.signature === signature) return;
        const id = prior?.id || crypto.randomUUID();
        seen.set(node, { id, signature });
        notify(message, kind, id);
      });
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-toast-kind", "data-toast-message", "data-toast-cycle", "class"] });
    scan();
    const active = new Set();
    const download = async (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || !(/^\/api\/(invoices|learn\/(certificate|receipts))\/[^/]+$/.test(url.pathname) || url.pathname === "/api/admin/orders/export")) return;
      event.preventDefault();
      if (active.has(url.href)) return;
      active.add(url.href);
      const id = notify("Preparing your file. Please keep this page open.", "downloading");
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        const type = response.headers.get("content-type") || "";
        if (!response.ok || !/(application\/pdf|text\/csv|application\/octet-stream)/i.test(type)) throw new Error("Your file could not be downloaded. Please try again, or sign in again if your session has expired.");
        const blob = await response.blob();
        if (!blob.size) throw new Error("The downloaded file is empty. Please try again.");
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = (response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] || (type.includes("csv") ? "export.csv" : "document.pdf")).replace(/[\\/]/g, "-");
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        notify("Your file is ready. Check your browser downloads.", "success", id);
      } catch (error) {
        notify(error instanceof TypeError ? "Download interrupted. Check your connection and try again." : error.message, "error", id);
      } finally { active.delete(url.href); }
    };
    // Native validation prevents submit, so these errors never reach the server.
    let validationQueued = false;
    const invalid = event => {
      const field = event.target;
      if (!field.closest?.(".fm-auth, .dashboard-page")) return;
      // Auth errors have one visible message; retain focus on the invalid field.
      if (field.closest(".fm-auth")) event.preventDefault();
      if (validationQueued) return;
      field.focus();
      validationQueued = true;
      const timer = setTimeout(() => { validationQueued = false; timers.delete(timer); }, 0);
      timers.add(timer);
      const label = ({ email: "Email", password: "Password", confirmPassword: "Confirm password", fullName: "Full name", token: "Verification code" })[field.name] || "This field";
      const validity = field.validity;
      const message = validity.valueMissing ? `${label} is required.`
        : validity.typeMismatch && field.type === "email" ? "Enter a valid email address."
        : validity.tooShort ? `${label} must contain at least ${field.minLength} characters.`
        : validity.customError && field.name === "confirmPassword" ? "Your passwords do not match."
        : "Please check the highlighted field and try again.";
      notify(message, "error", "form-validation");
    };
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("click", download);
    return () => { timers.forEach(clearTimeout); observer.disconnect(); window.removeEventListener("app:toast", receive); document.removeEventListener("click", download); document.removeEventListener("invalid", invalid, true); };
  }, []);
  return <aside className="app-toast-stack" aria-label="Notifications">{items.map((item) => <Toast key={item.id} item={item} remove={remove} />)}</aside>;
}

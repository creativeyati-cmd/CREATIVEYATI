"use client";
import { Input } from "@/Components/FormControls";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { serviceMediaSlots, serviceMediaTypes, serviceMediaLimit } from "@/lib/service-media";

async function api(body) {
  const response = await fetch("/api/admin/service-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Media update failed.");
  return result;
}
function Editor({ slot, current }) {
  const router = useRouter();
  const [file, setFile] = useState(null), [alt, setAlt] = useState(current?.alt || slot.title);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failed, setFailed] = useState(false);
  async function save(event) {
    event.preventDefault(); if (!file || busy) return;
    setBusy(true); setFailed(false); setMessage("Preparing upload…");
    try {
      if (!serviceMediaTypes[file.type] || file.size > serviceMediaLimit(file.type)) throw new Error("Choose an image up to 8MB or an MP4/WebM up to 100MB.");
      const signed = await api({ action: "sign", slot: slot.id, type: file.type, size: file.size });
      setMessage("Uploading media. Keep this page open…");
      const upload = new FormData();
      upload.append("cacheControl", "3600"); upload.append("", file);
      const response = await fetch(signed.signedUrl, { method: "PUT", headers: { "x-upsert": "false" }, body: upload });
      if (!response.ok) throw new Error("Upload failed. Your existing service media is unchanged.");
      setMessage("Verifying and publishing…");
      await api({ action: "publish", slot: slot.id, storageKey: signed.storageKey, alt });
      setMessage("Published to the Services page."); setFile(null); event.target.reset(); router.refresh();
    } catch (error) { setFailed(true); setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (!confirm(`Restore the default image for ${slot.title}?`)) return;
    setBusy(true); setFailed(false);
    try { await api({ action: "reset", slot: slot.id }); setMessage("Default image restored."); router.refresh(); }
    catch (error) { setFailed(true); setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section style={{ border: "1px solid #dfe5da", borderRadius: 16, padding: 24, minWidth: 0 }}><h2>{slot.title}</h2>
    {current?.type === "video" ? <video src={current.url} controls playsInline preload="metadata" aria-label={current.alt || slot.title} style={{ width: "100%", height: 220, objectFit: "contain", background: "#14251b", borderRadius: 12 }} /> : <img src={current?.url || slot.image} alt={current?.alt || slot.title} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 12 }} />}
    <form className="admin-form" onSubmit={save}><label>Upload image or video<Input type="file" accept={Object.keys(serviceMediaTypes).join(",")} required disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setMessage(""); }} /></label><label>Image description / video label<Input value={alt} onChange={event => setAlt(event.target.value)} maxLength={240} disabled={busy} required /></label><button className="button" disabled={busy || !file}>{busy ? "Uploading…" : "Upload & publish"}</button>{current && <button type="button" className="button button-secondary" disabled={busy} onClick={reset}>Restore default image</button>}</form>
    {message && <p data-toast-kind={failed ? "error" : busy ? "loading" : "success"} role={failed ? "alert" : "status"} className={failed ? "form-error" : "success-note"}>{message}</p>}
  </section>;
}
export default function ServiceMediaEditor({ media }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 24 }}>{serviceMediaSlots.map(slot => <Editor key={slot.id} slot={slot} current={media[slot.id]} />)}</div>;
}

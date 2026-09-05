"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function LessonPosterField({ courseId, lessonId, lesson, orientation }) {
  const inputRef = useRef(null);
  const [storageKey, setStorageKey] = useState(lesson?.posterStorageKey || "");
  const [posterUrl, setPosterUrl] = useState(lesson?.posterUrl || "");
  const [preview, setPreview] = useState(lesson?.posterStorageKey ? `/api/learn/media/poster/${lessonId}?admin=1` : lesson?.posterUrl || "");
  const [cleanupKey, setCleanupKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file) {
    if (!file || busy) return;
    setBusy(true); setError("");
    const body = new FormData(); body.set("file", file); body.set("courseId", courseId); body.set("lessonId", lessonId); body.set("orientation", orientation);
    try {
      const response = await fetch("/api/admin/course-poster", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Poster upload failed.");
      if (storageKey) setCleanupKey(storageKey);
      setStorageKey(result.storageKey); setPosterUrl(""); setPreview(result.previewUrl || "");
    } catch (uploadError) { setError(uploadError.message); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return <section className="lesson-poster-field form-wide">
    <input type="hidden" name="posterStorageKey" value={storageKey} /><input type="hidden" name="obsoletePosterStorageKey" value={cleanupKey} />
    <div className="cover-uploader-heading"><div><strong>Optional custom poster</strong><small>Upload an image or paste a public poster URL.</small></div><button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{storageKey ? "Replace poster" : "Upload poster"}</button></div>
    <input ref={inputRef} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => upload(event.target.files?.[0])} />
    <label>Poster URL<input type="url" name="posterUrl" value={posterUrl} onChange={(event) => { if (storageKey) setCleanupKey(storageKey); setStorageKey(""); setPosterUrl(event.target.value); setPreview(event.target.value); }} placeholder="https://…" /></label>
    {preview && <Image className={`lesson-poster-preview is-${orientation}`} src={preview} width={orientation === "portrait" ? 540 : 960} height={orientation === "portrait" ? 960 : 540} unoptimized sizes="320px" alt="Lesson poster preview" />}
    {busy && <p className="status-note">Uploading poster…</p>}{error && <p className="form-error">{error}</p>}
  </section>;
}

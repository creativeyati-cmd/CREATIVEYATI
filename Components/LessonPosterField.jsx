"use client";
import { Input, Button } from "@/Components/FormControls";

import Image from "next/image";
import { useRef, useState } from "react";

export default function LessonPosterField({ courseId, lessonId, lesson, orientation }) {
  const inputRef = useRef(null);
  const [storageKey, setStorageKey] = useState(lesson?.posterStorageKey || "");
  const [posterUrl, setPosterUrl] = useState(lesson?.posterUrl || "");
  const [preview, setPreview] = useState(lesson?.posterStorageKey ? `/api/admin/course-draft-media?courseId=${courseId}&kind=poster&key=${encodeURIComponent(lesson.posterStorageKey)}` : lesson?.posterUrl || "");
  const [cleanupKey, setCleanupKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file) {
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) throw new Error("Choose a JPG, PNG, WebP or AVIF image up to 8 MB.");
      // Resize before the server request to stay below the hosting payload limit.
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.84));
      if (!blob || blob.size > 3 * 1024 * 1024) throw new Error("This image could not be resized. Try a smaller image.");
      const body = new FormData(); body.set("file", new File([blob], "poster.webp", { type: "image/webp" })); body.set("courseId", courseId); body.set("lessonId", lessonId); body.set("orientation", orientation);
      const response = await fetch("/api/admin/course-poster", { method: "POST", body });
      const result = await response.json().catch(() => ({ error: "Poster upload could not complete. Please retry." }));
      if (!response.ok) throw new Error(result.error || "Poster upload failed.");
      if (storageKey) setCleanupKey(storageKey);
      setStorageKey(result.storageKey); setPosterUrl(""); setPreview(result.previewUrl || "");
    } catch (uploadError) { setError(uploadError.message); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return <section data-course-uploading={busy || undefined} className="lesson-poster-field form-wide">
    <Input type="hidden" name="posterStorageKey" value={storageKey} /><Input type="hidden" name="obsoletePosterStorageKey" value={cleanupKey} />
    <div className="cover-uploader-heading"><div><strong>Optional custom poster</strong><small>JPG, PNG, WebP or AVIF, up to 8 MB.</small></div><Button variant="secondary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{storageKey ? "Replace poster" : "Upload poster"}</Button></div>
    <Input ref={inputRef} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => upload(event.target.files?.[0])} />
    <label>Poster URL<Input type="url" name="posterUrl" value={posterUrl} onChange={(event) => { if (storageKey) setCleanupKey(storageKey); setStorageKey(""); setPosterUrl(event.target.value); setPreview(event.target.value); }} placeholder="https://…" /></label>
    {preview && <Image className={`lesson-poster-preview is-${orientation}`} src={preview} width={orientation === "portrait" ? 540 : 960} height={orientation === "portrait" ? 960 : 540} unoptimized sizes="320px" alt="Lesson poster preview" />}
    {busy && <p className="status-note">Uploading poster…</p>}{error && <p className="form-error">{error}</p>}
  </section>;
}

"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function storageKeyFromUrl(url) {
  const marker = "/storage/v1/object/public/project-covers/";
  const index = String(url || "").indexOf(marker);
  if (index < 0) return "";
  try {
    const key = decodeURIComponent(String(url).slice(index + marker.length));
    return key.startsWith("courses/") ? key : "";
  } catch { return ""; }
}

function uploadCover(file, courseId, onProgress) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    body.set("courseId", courseId);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/course-cover");
    request.responseType = "json";
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error("The upload connection failed."));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve(request.response) : reject(new Error(request.response?.error || "Course cover upload failed."));
    request.send(body);
  });
}

export default function CourseCoverField({ course }) {
  const inputRef = useRef(null);
  const generatedId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [url, setUrl] = useState(course?.coverImageUrl || "");
  const [cleanupKeys, setCleanupKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function scheduleCleanup(value) {
    const key = storageKeyFromUrl(value);
    if (key) setCleanupKeys((current) => current.includes(key) ? current : [...current, key]);
  }

  function changeUrl(next) {
    if (next !== url) scheduleCleanup(url);
    setUrl(next);
    setMessage("");
  }

  async function selectFile(file) {
    if (!file || busy) return;
    setError("");
    setMessage("");
    if (!ACCEPTED_TYPES.has(file.type)) { setError("Use a JPG, PNG, WebP or AVIF image."); return; }
    if (file.size > MAX_BYTES) { setError("Course covers must be 8MB or smaller."); return; }
    setBusy(true);
    setProgress(0);
    try {
      const result = await uploadCover(file, course?.id || `new-${generatedId}`, setProgress);
      scheduleCleanup(url);
      setUrl(result.url);
      setProgress(100);
      setMessage("Cover uploaded. Save the course to apply it.");
    } catch (uploadError) {
      setError(uploadError.message || "Course cover upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const previewReady = /^https?:\/\//i.test(url);
  return <section className="cover-uploader course-cover-uploader form-wide" aria-busy={busy}>
    <input type="hidden" name="courseCoverCleanupKeys" value={JSON.stringify(cleanupKeys)} />
    <div className="cover-uploader-heading">
      <div><strong>Course cover image</strong><small>16:9 · JPG, PNG, WebP or AVIF · maximum 8MB</small></div>
      <div className="cover-uploader-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{url ? "Upload replacement" : "Upload image"}</button></div>
    </div>
    <input ref={inputRef} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => selectFile(event.target.files?.[0])} />
    <label className="course-cover-url">Or paste an image URL<input type="url" name="coverImageUrl" value={url} onChange={(event) => changeUrl(event.target.value)} placeholder="https://…" required /></label>
    {previewReady && <Image className="cover-upload-preview" src={url} width={960} height={540} sizes="(max-width: 780px) 90vw, 780px" unoptimized alt="Course cover preview" />}
    {busy && <div className="upload-status"><span>{progress < 100 ? "Uploading and processing" : "Processing"}</span><progress max="100" value={progress}>{progress}%</progress></div>}
    {message && <p className="field-success">{message}</p>}
    {error && <p className="form-error">{error}</p>}
  </section>;
}

"use client";
import { Input } from "@/Components/FormControls";

import CourseCoverCropper from "@/Components/CourseCoverCropper";
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
  const [cropFile,setCropFile]=useState(null);
  const [retryFile,setRetryFile]=useState(null);
  function chooseFile(file){if(!file)return;if(!ACCEPTED_TYPES.has(file.type) || file.size>MAX_BYTES){setError("Choose a JPG, PNG, WebP or AVIF image no larger than 8MB.");return;}setCropFile(file);}

  const generatedId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [url, setUrl] = useState(course?.coverImageUrl || "");
  const [cleanupKeys, setCleanupKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [focalX, setFocalX] = useState(course?.coverFocalX ?? 50);
  const [focalY, setFocalY] = useState(course?.coverFocalY ?? 50);
  const [dimensions, setDimensions] = useState({ width: course?.coverWidth || 0, height: course?.coverHeight || 0 });

  function scheduleCleanup(value) {
    const key = storageKeyFromUrl(value);
    if (key) setCleanupKeys((current) => current.includes(key) ? current : [...current, key]);
  }

  function changeUrl(next) {
    if (next !== url) scheduleCleanup(url);
    setUrl(next);
    setDimensions({ width: 0, height: 0 });
    setMessage("");
  }

  async function selectFile(file) {
    setRetryFile(file);
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
      setDimensions({ width: result.width, height: result.height });
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
  return <section onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) chooseFile(event.dataTransfer.files?.[0]); }} className="cover-uploader course-cover-uploader form-wide" aria-busy={busy} data-course-uploading={busy || undefined}>
    {cropFile && <CourseCoverCropper file={cropFile} onCancel={()=>{setCropFile(null);if(inputRef.current)inputRef.current.value="";}} onCrop={file=>{setCropFile(null);selectFile(file);}}/>}
    <Input type="hidden" name="courseCoverCleanupKeys" value={JSON.stringify(cleanupKeys)} />
    <Input type="hidden" name="coverWidth" value={dimensions.width} /><Input type="hidden" name="coverHeight" value={dimensions.height} />
    <div className="cover-uploader-heading">
      <div><strong>Course cover image</strong><small>16:9 · recommended 1920 x 1080 · minimum 1280 x 720 · maximum 8MB</small></div>
      <div className="cover-uploader-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{url ? "Upload replacement" : "Upload image"}</button></div>
    </div>
    <Input ref={inputRef} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => chooseFile(event.target.files?.[0])} />
    <label className="course-cover-url">Or paste an image URL<Input type="url" name="coverImageUrl" value={url} onChange={(event) => changeUrl(event.target.value)} placeholder="https://…" /></label>
    {previewReady && <><Image className="cover-upload-preview" style={{ objectPosition: `${focalX}% ${focalY}%` }} src={url} width={960} height={540} sizes="(max-width: 780px) 90vw, 780px" unoptimized onLoad={event => { const image = event.currentTarget; setDimensions({ width: image.naturalWidth, height: image.naturalHeight }); }} onError={() => { setDimensions({ width: 0, height: 0 }); setError("The cover image could not be loaded. Check the URL or upload an image."); }} alt="Course cover preview" />{dimensions.width > 0 && <small className="media-facts">Stored at {dimensions.width} x {dimensions.height} in a fixed 16:9 frame</small>}<div className="course-cover-focal"><label>Horizontal focus<Input type="range" name="coverFocalX" min="0" max="100" value={focalX} onChange={(event) => setFocalX(event.target.value)} /></label><label>Vertical focus<Input type="range" name="coverFocalY" min="0" max="100" value={focalY} onChange={(event) => setFocalY(event.target.value)} /></label></div></>}
    {!previewReady && <><Input type="hidden" name="coverFocalX" value={focalX} /><Input type="hidden" name="coverFocalY" value={focalY} /></>}
    {busy && <div className="upload-status"><span>{progress < 100 ? "Uploading and processing" : "Processing"}</span><progress max="100" value={progress}>{progress}%</progress></div>}
    {message && <p className="field-success">{message}</p>}
    {error && <div role="alert"><p>{error}</p>{retryFile && <button type="button" disabled={busy} onClick={()=>selectFile(retryFile)}>Retry upload</button>}</div>}
  </section>;
}

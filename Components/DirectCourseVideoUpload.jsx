"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

function inspectVideo(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const value = { width: video.videoWidth, height: video.videoHeight, durationSeconds: Math.round(video.duration), objectUrl };
      if (!value.width || !value.height || !Number.isFinite(value.durationSeconds) || value.durationSeconds <= 0) { URL.revokeObjectURL(objectUrl); reject(new Error("This video is corrupted or its metadata is incomplete.")); return; }
      resolve(value);
    };
    video.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("This video cannot be decoded by the browser.")); };
    video.src = objectUrl;
  });
}

function uploadSigned(signedUrl, file, onProgress, signalRef) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    signalRef.current = request;
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    request.open("PUT", signedUrl);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error("The direct upload connection failed."));
    request.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Supabase rejected the signed upload."));
    request.send(body);
  });
}

export default function DirectCourseVideoUpload({ courseId, lessonId, lesson }) {
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const [asset, setAsset] = useState({
    storageKey: lesson?.storageKey || "", width: lesson?.width || "", height: lesson?.height || "",
    durationSeconds: lesson?.durationSeconds || "", orientation: lesson?.orientation || "landscape",
    aspectRatio: lesson?.aspectRatio || 16 / 9, processingStatus: lesson?.processingStatus || (lesson?.storageKey ? "ready" : "pending"),
  });
  const [preview, setPreview] = useState(lesson?.storageKey ? `/api/learn/media/video/${lessonId}?admin=1` : "");
  const [obsoleteKey, setObsoleteKey] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [retryFile, setRetryFile] = useState(null);
  const busy = ["Inspecting video", "Preparing upload", "Uploading", "Verifying upload"].includes(status);

  async function removeTemporary(storageKey) {
    if (!storageKey || storageKey === lesson?.storageKey) return;
    await fetch("/api/admin/course-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", courseId, lessonId, storageKey }) }).catch(() => {});
  }

  async function upload(file) {
    if (!file || busy) return;
    setRetryFile(file); setError(""); setProgress(0); setStatus("Inspecting video");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!TYPES[file.type] || TYPES[file.type] !== extension) { setStatus(""); setError("Use an MP4, WebM or MOV file whose extension matches its file type."); return; }
    if (!file.size || file.size > MAX_BYTES) { setStatus(""); setError("Video files must be no larger than 2GB."); return; }
    let metadata;
    try { metadata = await inspectVideo(file); }
    catch (inspectError) { setStatus(""); setError(inspectError.message); return; }
    let newStorageKey = "";
    try {
      setStatus("Preparing upload");
      const signResponse = await fetch("/api/admin/course-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sign", courseId, lessonId, fileName: file.name, fileSize: file.size, mimeType: file.type }) });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error || "A signed upload could not be created.");
      newStorageKey = signed.storageKey;
      setStatus("Uploading");
      await uploadSigned(signed.signedUrl, file, setProgress, requestRef);
      setStatus("Verifying upload");
      const finalizeResponse = await fetch("/api/admin/course-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finalize", courseId, lessonId, storageKey: newStorageKey, fileSize: file.size, mimeType: file.type, width: metadata.width, height: metadata.height, durationSeconds: metadata.durationSeconds }) });
      const finalized = await finalizeResponse.json();
      if (!finalizeResponse.ok) throw new Error(finalized.error || "The uploaded video could not be verified.");
      if (asset.storageKey && asset.storageKey !== newStorageKey) {
        if (asset.storageKey === lesson?.storageKey) setObsoleteKey(asset.storageKey);
        else await removeTemporary(asset.storageKey);
      }
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(finalized.previewUrl || metadata.objectUrl);
      if (finalized.previewUrl) URL.revokeObjectURL(metadata.objectUrl);
      setAsset(finalized);
      setStatus("Upload ready — save the lesson to apply it");
      setProgress(100);
    } catch (uploadError) {
      URL.revokeObjectURL(metadata.objectUrl);
      if (newStorageKey) await removeTemporary(newStorageKey);
      setStatus("");
      if (uploadError.name !== "AbortError") setError(uploadError.message || "Video upload failed.");
    } finally { requestRef.current = null; if (inputRef.current) inputRef.current.value = ""; }
  }

  async function remove() {
    if (!asset.storageKey || busy || !window.confirm("Remove this lesson video after the lesson is saved?")) return;
    if (asset.storageKey === lesson?.storageKey) setObsoleteKey(asset.storageKey); else await removeTemporary(asset.storageKey);
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setAsset({ storageKey: "", width: "", height: "", durationSeconds: "", orientation: "landscape", aspectRatio: 16 / 9, processingStatus: "pending" });
    setPreview(""); setStatus("Video removed — save the lesson to confirm"); setProgress(0);
  }

  return <section className="direct-video-upload form-wide" aria-busy={busy}>
    <input type="hidden" name="storageKey" value={asset.storageKey || ""} />
    <input type="hidden" name="videoWidth" value={asset.width || ""} />
    <input type="hidden" name="videoHeight" value={asset.height || ""} />
    <input type="hidden" name="durationSeconds" value={asset.durationSeconds || ""} />
    <input type="hidden" name="orientation" value={asset.orientation || "landscape"} />
    <input type="hidden" name="aspectRatio" value={asset.aspectRatio || 16 / 9} />
    <input type="hidden" name="processingStatus" value={asset.processingStatus || "pending"} />
    <input type="hidden" name="obsoleteStorageKey" value={obsoleteKey} />
    <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files?.[0]); }}>
      <strong>{asset.storageKey ? "Uploaded lesson video" : "Drop an MP4, WebM or MOV here"}</strong>
      <small>Uploaded directly to private storage · maximum 2GB</small>
      <div className="row-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{asset.storageKey ? "Replace video" : "Choose video"}</button>{busy && <button type="button" onClick={() => requestRef.current?.abort()}>Cancel upload</button>}{asset.storageKey && !busy && <button type="button" onClick={remove}>Remove video</button>}</div>
      <input ref={inputRef} className="cover-file-input" type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={(event) => upload(event.target.files?.[0])} />
    </div>
    {busy && <div className="upload-status"><span>{status}</span><progress max="100" value={progress}>{progress}%</progress></div>}
    {!busy && status && <p className="field-success">{status}</p>}
    {error && <div className="upload-error"><p>{error}</p>{retryFile && <button type="button" onClick={() => upload(retryFile)}>Retry</button>}</div>}
    {preview && <video className={`course-admin-video is-${asset.orientation}`} src={preview} controls preload="metadata" playsInline />}
    {asset.width && <small className="media-facts">{asset.width} × {asset.height} · {asset.durationSeconds}s · {asset.orientation} · {Number(asset.aspectRatio).toFixed(3)}:1</small>}
  </section>;
}

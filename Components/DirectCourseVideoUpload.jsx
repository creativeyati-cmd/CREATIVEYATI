"use client";
import { streamVideoId } from "@/lib/stream-reference";
import { Input, Button } from "@/Components/FormControls";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const TYPES = { "video/mp4": "mp4" };

function inspectVideo(file, signalRef) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      video.onloadedmetadata = null; video.onerror = null;
      video.removeAttribute("src"); video.load();
      if (error) { URL.revokeObjectURL(objectUrl); reject(error); }
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error("Reading this video timed out. Try an MP4 exported with H.264 video.")), 20000);
    signalRef.current = { abort: () => finish(new DOMException("Upload cancelled.", "AbortError")) };
    video.onloadedmetadata = () => {
      const value = { width: video.videoWidth, height: video.videoHeight, durationSeconds: Math.ceil(video.duration), objectUrl };
      if (!value.width || !value.height || !Number.isFinite(value.durationSeconds) || value.durationSeconds <= 0) finish(new Error("This video has incomplete metadata. Try another export."));
      else finish(null, value);
    };
    video.onerror = () => finish(new Error("This browser cannot read the video. Try an MP4 exported with H.264 video."));
    video.src = objectUrl;
  });
}

function uploadSigned(signedUrl, file, headers, onProgress, signalRef) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    signalRef.current = request;
    request.open("PUT", signedUrl);
    Object.entries(headers).forEach(([name,value])=>request.setRequestHeader(name,value));
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onerror = () => reject(new Error("R2 upload connection failed. Check your connection and the bucket CORS settings, then retry."));
    request.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`R2 rejected the upload (HTTP ${request.status}). ${request.status === 403 ? "The upload link expired or its signature was rejected. Retry for a new link." : "Check bucket access and retry."}`));
    request.send(file);
  });
}

export default function DirectCourseVideoUpload({ courseId, lessonId, lesson }) {
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const resumeRef = useRef(null);
  const activeRef = useRef(false);
  const [asset, setAsset] = useState({
    storageKey: lesson?.storageKey || "", width: lesson?.width || "", height: lesson?.height || "",
    durationSeconds: lesson?.durationSeconds || "", orientation: lesson?.orientation || "landscape",
    aspectRatio: lesson?.aspectRatio || 16 / 9, processingStatus: lesson?.processingStatus || (lesson?.storageKey ? "ready" : "pending"),
  });
  const [preview, setPreview] = useState(lesson?.storageKey && (!streamVideoId(lesson.storageKey) || lesson.processingStatus === "ready") ? `/api/admin/course-draft-media?courseId=${courseId}&kind=video&key=${encodeURIComponent(lesson.storageKey)}` : "");
  const [obsoleteKey, setObsoleteKey] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [retryFile, setRetryFile] = useState(null);
  const busy = ["Inspecting video", "Preparing upload", "Uploading", "Verifying upload"].includes(status);

  useEffect(() => {
    const warn = event => { if (activeRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); activeRef.current = false; requestRef.current?.abort(); };
  }, []);
  async function removeTemporary() { /* Keep objects for saved drafts and version recovery. */ }

  async function upload(file) {
    if (!file || busy || activeRef.current) return;
    if(resumeRef.current?.file !== file) resumeRef.current=null;
    setRetryFile(file); setError(""); setProgress(0); setStatus("Inspecting video");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!TYPES[file.type] || TYPES[file.type] !== extension) { setStatus(""); setError("Use MP4 exported with H.264 video and AAC audio. R2 does not convert MOV files."); return; }
    if (!file.size || file.size > MAX_BYTES) { setStatus(""); setError("Video files must be no larger than 2GB."); return; }
    activeRef.current = true;
    let metadata;
    try { metadata = await inspectVideo(file, requestRef); }
    catch (inspectError) { activeRef.current = false; requestRef.current = null; setStatus(inspectError.name === "AbortError" ? "Upload cancelled. You can choose a file again." : ""); if (inspectError.name !== "AbortError") setError(inspectError.message); return; }
    let newStorageKey = "";
    try {
      setStatus("Preparing upload");
      const controller = new AbortController();
      requestRef.current = controller;
      let signed = resumeRef.current?.file === file ? resumeRef.current.signed : null;
      if (!signed || !resumeRef.current?.uploaded) {
      const signResponse = await fetch("/api/admin/course-video", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sign", courseId, lessonId, fileName: file.name, fileSize: file.size, mimeType: file.type, durationSeconds: metadata.durationSeconds }) });
      signed = await signResponse.json().catch(() => ({ error: "Upload preparation failed. Refresh your admin session and retry." }));
      if (!signResponse.ok) throw new Error(signed.error || "A signed upload could not be created.");
      }
      if (!activeRef.current) throw new DOMException("Cancelled", "AbortError");
      newStorageKey = signed.storageKey;
      if (!resumeRef.current?.uploaded) {
        setStatus("Uploading");
        await uploadSigned(signed.signedUrl, file, signed.headers, setProgress, requestRef);
        resumeRef.current={file,signed,uploaded:true};
      }
      setStatus("Verifying upload");
      const finalizeResponse = await fetch("/api/admin/course-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finalize", courseId, lessonId, storageKey: newStorageKey, fileSize: file.size, mimeType: file.type, width: metadata.width, height: metadata.height, durationSeconds: metadata.durationSeconds }) });
      const finalized = await finalizeResponse.json().catch(() => ({ error: "The upload completed but verification failed. Retry when connected." }));
      if (!finalizeResponse.ok) throw new Error(finalized.error || "The uploaded video could not be verified.");
      if (asset.storageKey && asset.storageKey !== newStorageKey) {
        if (asset.storageKey === lesson?.storageKey) setObsoleteKey(asset.storageKey);
        else await removeTemporary(asset.storageKey);
      }
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(finalized.previewUrl || metadata.objectUrl);
      if (finalized.previewUrl) URL.revokeObjectURL(metadata.objectUrl);
      resumeRef.current = null;
      setAsset(finalized);
      setStatus("Upload ready — save the lesson to apply it");
      setProgress(100);
    } catch (uploadError) {
      URL.revokeObjectURL(metadata.objectUrl);
      if (newStorageKey) await removeTemporary(newStorageKey);
      setStatus(uploadError.name === "AbortError" ? "Upload cancelled. Retry to continue or choose another file." : "");
      if (uploadError.name !== "AbortError") setError(uploadError.message || "Video upload failed.");
    } finally { activeRef.current = false; requestRef.current = null; if (inputRef.current) inputRef.current.value = ""; }
  }

  async function remove() {
    if (!asset.storageKey || busy || !window.confirm("Remove this lesson video after the lesson is saved?")) return;
    if (asset.storageKey === lesson?.storageKey) setObsoleteKey(asset.storageKey); else await removeTemporary(asset.storageKey);
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setAsset({ storageKey: "", width: "", height: "", durationSeconds: "", orientation: "landscape", aspectRatio: 16 / 9, processingStatus: "pending" });
    setPreview(""); setStatus("Video removed — save the lesson to confirm"); setProgress(0);
  }

  const Video = "video";
  return <section className="direct-video-upload form-wide" aria-busy={busy} data-course-uploading={busy || undefined}>
    <Input type="hidden" name="storageKey" value={asset.storageKey || ""} />
    <Input type="hidden" name="videoWidth" value={asset.width || ""} />
    <Input type="hidden" name="videoHeight" value={asset.height || ""} />
    <Input type="hidden" name="durationSeconds" value={asset.durationSeconds || ""} />
    <Input type="hidden" name="orientation" value={asset.orientation || "landscape"} />
    <Input type="hidden" name="aspectRatio" value={asset.aspectRatio || 16 / 9} />
    <Input type="hidden" name="processingStatus" value={asset.processingStatus || "pending"} />
    <Input type="hidden" name="obsoleteStorageKey" value={obsoleteKey} />
    <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); upload(event.dataTransfer.files?.[0]); }}>
      <strong>{asset.storageKey ? "Uploaded lesson video" : "Drop an MP4 here"}</strong>
      <small>Private Cloudflare R2 storage; MP4 H.264/AAC · maximum 2GB</small>
      <div className="row-actions"><Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{asset.storageKey ? "Replace video" : "Choose video"}</Button>{busy && <Button variant="secondary" type="button" onClick={() => { activeRef.current = false; requestRef.current?.abort(); }}>Cancel upload</Button>}{asset.storageKey && !busy && <Button variant="danger" type="button" onClick={remove}>Remove video</Button>}</div>
      <Input ref={inputRef} className="cover-file-input" aria-label="Upload lesson video" type="file" accept=".mp4,video/mp4" onChange={(event) => { resumeRef.current = null; upload(event.target.files?.[0]); }} />
    </div>
    {busy && <div className="upload-status"><span>{status}</span><progress aria-label="Video upload progress" max="100" value={progress}>{progress}%</progress></div>}
    {!busy && status && <p className="field-success">{status}</p>}
    {error && <div className="upload-error"><p>{error}</p>{retryFile && <Button variant="secondary" type="button" disabled={busy} onClick={() => upload(retryFile)}>Retry upload</Button>}</div>}
    {preview && <Video className={`course-admin-video is-${asset.orientation}`} src={preview} controls preload="metadata" playsInline onError={() => setError("This video could not play. Use H.264/AAC MP4 and verify storage access.")} />}
    {asset.width && <small className="media-facts">{asset.width} × {asset.height} · {asset.durationSeconds}s · {asset.orientation} · {Number(asset.aspectRatio).toFixed(3)}:1</small>}
  </section>;
}

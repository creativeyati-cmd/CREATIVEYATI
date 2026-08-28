"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import ProjectMedia from "./ProjectMedia";
import { getYouTubeId, thumbnailUrl } from "@/lib/youtube";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function objectValue(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function storageKeyFromUrl(url) {
  if (!url) return "";
  const marker = "/storage/v1/object/public/project-covers/";
  const index = url.indexOf(marker);
  return index < 0 ? "" : decodeURIComponent(url.slice(index + marker.length));
}

function coverKeys(cover) {
  return [cover?.key, ...Object.values(cover?.variants || {}).map(storageKeyFromUrl)].filter((value, index, values) => value && values.indexOf(value) === index);
}

async function imageDimensions(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function uploadFile({ file, orientation, kind, uploadId, onProgress, onProcessing }) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    body.set("orientation", orientation);
    body.set("kind", kind);
    body.set("uploadId", uploadId);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/project-cover");
    request.responseType = "json";
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.upload.onload = onProcessing;
    request.onerror = () => reject(new Error("The upload connection failed."));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve(request.response) : reject(new Error(request.response?.error || "Cover upload failed."));
    request.send(body);
  });
}

function CoverUpload({ label, kind, cover, setCover, orientation, uploadId, scheduleCleanup, onBusyChange }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(cover.url ? "Uploaded successfully" : "");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [preview, setPreview] = useState("");
  const [retryFile, setRetryFile] = useState(null);
  const busy = ["Selecting image", "Validating image", "Uploading", "Processing", "Removing"].includes(status);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  async function selectFile(file) {
    if (!file || busy) return;
    setStatus("Selecting image");
    setError("");
    setWarning("");
    setRetryFile(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.has(file.type) || !ACCEPTED_EXTENSIONS.has(extension)) {
      setStatus("Upload failed"); setError("Use a JPG, JPEG, PNG, WebP or AVIF image."); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus("Upload failed"); setError("Cover images must be 8MB or smaller."); return;
    }
    setStatus("Validating image");
    let dimensions;
    try { dimensions = await imageDimensions(file); }
    catch { setStatus("Upload failed"); setError("This image is corrupted or cannot be decoded."); return; }
    const minimum = orientation === "portrait" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    if (dimensions.width < minimum.width || dimensions.height < minimum.height) setWarning(`Recommended minimum: ${minimum.width} × ${minimum.height}px.`);
    setStatus("Uploading");
    setProgress(0);
    try {
      const result = await uploadFile({ file, orientation, kind, uploadId, onProgress: setProgress, onProcessing: () => setStatus("Processing") });
      scheduleCleanup(coverKeys(cover));
      setCover({ url: result.url, key: result.storageKey, variants: result.variants || {}, width: result.width, height: result.height });
      if (result.warnings?.length) setWarning(result.warnings.join(" "));
      setProgress(100);
      setStatus("Uploaded successfully");
      setError("");
    } catch (uploadError) {
      setStatus("Upload failed");
      setError(uploadError.message || "Cover upload failed.");
    }
  }

  function removeCover() {
    if (!cover.url || busy || !window.confirm(`Remove the ${label.toLowerCase()}? The change is final after you save the project.`)) return;
    setStatus("Removing");
    scheduleCleanup(coverKeys(cover));
    setCover({ url: "", key: "", variants: {}, width: 0, height: 0 });
    setPreview("");
    setProgress(0);
    setStatus("");
  }

  const ratio = cover.width && cover.height ? cover.width / cover.height : null;
  const expectedRatio = orientation === "portrait" ? 9 / 16 : 16 / 9;
  const mismatch = ratio && Math.abs(ratio - expectedRatio) / expectedRatio > 0.16;

  return <section className="cover-uploader" aria-busy={busy}>
    <div className="cover-uploader-heading"><div><strong>{label}</strong><small>JPG, PNG, WebP or AVIF · maximum 8MB</small></div><div className="cover-uploader-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{cover.url ? "Replace" : "Choose image"}</button>{cover.url && <button type="button" onClick={removeCover} disabled={busy}>Remove</button>}</div></div>
    <input ref={inputRef} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => selectFile(event.target.files?.[0])} />
    {(preview || cover.url) && <img className="cover-upload-preview" src={preview || cover.url} alt="Selected cover preview" />}
    {status && <div className="upload-status"><span>{status}</span>{["Uploading", "Processing"].includes(status) && <progress max="100" value={progress}>{progress}%</progress>}</div>}
    {warning && <p className="form-warning">{warning}</p>}
    {mismatch && <p className="form-warning">This cover shape differs from the selected {orientation} ratio. Review the crop and focal position below.</p>}
    {error && <div className="upload-error"><p>{error}</p>{retryFile && <button type="button" onClick={() => selectFile(retryFile)} disabled={busy}>Retry</button>}</div>}
  </section>;
}

function SaveButton({ disabled }) {
  const { pending } = useFormStatus();
  return <button className="button" disabled={disabled || pending}>{pending ? "Saving project…" : "Save video"}</button>;
}

export default function VideoForm({ video, categories, action }) {
  const initialMain = { url: video?.cover_image_url || video?.custom_poster_url || "", key: video?.cover_image_storage_key || "", variants: objectValue(video?.cover_variants), width: 0, height: 0 };
  const initialMobile = { url: video?.mobile_cover_image_url || video?.mobile_poster_url || "", key: video?.mobile_cover_storage_key || "", variants: objectValue(video?.mobile_cover_variants), width: 0, height: 0 };
  const [youtubeUrl, setYoutubeUrl] = useState(video?.youtube_url || "");
  const [orientation, setOrientation] = useState(video?.orientation || "landscape");
  const [coverFit, setCoverFit] = useState(video?.cover_fit || video?.display_mode || "cover");
  const [focalX, setFocalX] = useState(Number(video?.cover_focal_x ?? (video?.focal_x == null ? 50 : video.focal_x * 100)));
  const [focalY, setFocalY] = useState(Number(video?.cover_focal_y ?? (video?.focal_y == null ? 50 : video.focal_y * 100)));
  const [coverAlt, setCoverAlt] = useState(video?.cover_alt || "");
  const [mainCover, setMainCover] = useState(initialMain);
  const [mobileCover, setMobileCover] = useState(initialMobile);
  const [cleanupKeys, setCleanupKeys] = useState([]);
  const [mainUploadBusy, setMainUploadBusy] = useState(false);
  const [mobileUploadBusy, setMobileUploadBusy] = useState(false);
  const generatedUploadId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const uploadId = video?.id || `project-${generatedUploadId}`;
  const focalRef = useRef(null);
  const youtubeId = getYouTubeId(youtubeUrl);
  const youtubeThumbnail = youtubeId ? thumbnailUrl(youtubeId) : "";

  const scheduleCleanup = (keys) => setCleanupKeys((current) => [...new Set([...current, ...keys])]);
  const previewProject = useMemo(() => ({
    title: video?.title || "Project preview",
    orientation,
    aspectRatio: orientation === "portrait" ? 9 / 16 : 16 / 9,
    youtubeVideoId: youtubeId || "",
    youtubeThumbnailUrl: youtubeThumbnail,
    coverImageUrl: mainCover.url,
    mobileCoverImageUrl: mobileCover.url,
    coverVariants: mainCover.variants,
    mobileCoverVariants: mobileCover.variants,
    coverFit,
    coverFocalX: focalX,
    coverFocalY: focalY,
    coverAlt: coverAlt || "Project cover preview",
  }), [video?.title, orientation, youtubeId, youtubeThumbnail, mainCover, mobileCover, coverFit, focalX, focalY, coverAlt]);

  function updateFocal(event) {
    if (coverFit !== "cover") return;
    const rect = focalRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFocalX(Math.round(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))));
    setFocalY(Math.round(Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))));
  }

  return <form className="admin-form video-admin-form" action={action}>
    <input type="hidden" name="id" value={video?.id || ""} />
    <input type="hidden" name="youtubeVideoId" value={youtubeId || ""} />
    <input type="hidden" name="aspectRatio" value={orientation === "portrait" ? 9 / 16 : 16 / 9} />
    <input type="hidden" name="coverImageUrl" value={mainCover.url} />
    <input type="hidden" name="coverImageStorageKey" value={mainCover.key} />
    <input type="hidden" name="mobileCoverImageUrl" value={mobileCover.url} />
    <input type="hidden" name="mobileCoverStorageKey" value={mobileCover.key} />
    <input type="hidden" name="coverVariants" value={JSON.stringify(mainCover.variants)} />
    <input type="hidden" name="mobileCoverVariants" value={JSON.stringify(mobileCover.variants)} />
    <input type="hidden" name="cleanupStorageKeys" value={JSON.stringify(cleanupKeys)} />
    <label>Title<input required name="title" defaultValue={video?.title} /></label>
    <label>Slug<input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={video?.slug} /></label>
    <label className="form-wide">YouTube URL<input required name="youtubeUrl" type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtu.be/VIDEO_ID" />{youtubeUrl && <small className={youtubeId ? "field-success" : "form-error"}>{youtubeId ? `Video ID: ${youtubeId}` : "Enter a supported YouTube watch, short, embed or youtu.be link."}</small>}{youtubeThumbnail && <span className="youtube-thumbnail-preview"><span>Generated YouTube thumbnail</span><img src={youtubeThumbnail} alt="Generated YouTube project thumbnail" /></span>}</label>
    <label>Orientation<select name="orientation" value={orientation} onChange={(event) => setOrientation(event.target.value)}><option value="landscape">Landscape — 16:9</option><option value="portrait">Portrait — 9:16</option></select></label>
    <label>Status<select name="status" defaultValue={video?.status || "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
    <label>Category<select name="categoryId" defaultValue={video?.category_id || ""}><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Year<input name="year" type="number" min="1900" max="2100" defaultValue={video?.year} /></label>
    <label className="form-wide">Short description<textarea name="shortDescription" defaultValue={video?.short_description} rows="2" /></label>
    <label className="form-wide">Project description<textarea name="description" defaultValue={video?.description} rows="6" /></label>

    <div className="form-wide cover-upload-grid">
      <CoverUpload label="Custom main cover" kind="main" cover={mainCover} setCover={setMainCover} orientation={orientation} uploadId={uploadId} scheduleCleanup={scheduleCleanup} onBusyChange={setMainUploadBusy} />
      <CoverUpload label="Optional mobile cover" kind="mobile" cover={mobileCover} setCover={setMobileCover} orientation={orientation} uploadId={uploadId} scheduleCleanup={scheduleCleanup} onBusyChange={setMobileUploadBusy} />
    </div>

    <label>Cover display<select name="coverFit" value={coverFit} onChange={(event) => setCoverFit(event.target.value)}><option value="cover">Cover</option><option value="contain">Contain</option></select></label>
    <label>Alternative text<input name="coverAlt" value={coverAlt} onChange={(event) => setCoverAlt(event.target.value)} placeholder="Describe the project cover" /></label>
    <label>Focal X<input name="coverFocalX" type="range" min="0" max="100" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} /><small>{focalX}%</small></label>
    <label>Focal Y<input name="coverFocalY" type="range" min="0" max="100" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} /><small>{focalY}%</small></label>

    <section className="form-wide admin-media-previews">
      <div className="admin-preview-heading"><div><strong>Responsive cover previews</strong><small>Orientation and focal changes update immediately.</small></div></div>
      <div className="admin-preview-grid"><figure><figcaption>Desktop</figcaption><ProjectMedia project={previewProject} context="admin-preview" priority /></figure><figure><figcaption>Tablet</figcaption><ProjectMedia project={previewProject} context="admin-preview" /></figure><figure><figcaption>Mobile</figcaption><ProjectMedia project={previewProject} context="admin-preview" preferMobile /></figure></div>
      <div ref={focalRef} className="admin-focal-preview" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateFocal(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFocal(event); }} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}><ProjectMedia project={previewProject} context="focus-player" /><span className="focal-marker" style={{ left: `${focalX}%`, top: `${focalY}%` }} /><p>Drag to reposition the focal point</p></div>
    </section>
    <SaveButton disabled={!youtubeId || mainUploadBusy || mobileUploadBusy} />
  </form>;
}

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import NextImage from "next/image";
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
    const minimum = { width: 1280, height: 720 };
    if (dimensions.width < minimum.width || dimensions.height < minimum.height) {
      setStatus("Upload failed");
      setError(`Cover images must be at least ${minimum.width} × ${minimum.height}px.`);
      return;
    }
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
  const expectedRatio = 16 / 9;
  const mismatch = ratio && Math.abs(ratio - expectedRatio) / expectedRatio > 0.015;

  return <section className="cover-uploader" aria-busy={busy}>
    <div className="cover-uploader-heading"><div><strong>{label}</strong><small>JPG, PNG, WebP or AVIF · maximum 8MB</small></div><div className="cover-uploader-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>{cover.url ? "Replace" : "Choose image"}</button>{cover.url && <button type="button" onClick={removeCover} disabled={busy}>Remove</button>}</div></div>
    <input ref={inputRef} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => selectFile(event.target.files?.[0])} />
    {(preview || cover.url) && <NextImage className="cover-upload-preview" src={preview || cover.url} width={960} height={540} sizes="(max-width: 780px) 90vw, 780px" unoptimized={Boolean(preview)} alt="Selected cover preview" />}
    {status && <div className="upload-status"><span>{status}</span>{["Uploading", "Processing"].includes(status) && <progress max="100" value={progress}>{progress}%</progress>}</div>}
    {warning && <p className="form-warning">{warning}</p>}
    {mismatch && <p className="form-warning">This image is not 16:9. It will be cropped inside the fixed landscape frame; review and reposition the focal point before publishing.</p>}
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
  const [status, setStatus] = useState(video?.status || "draft");
  const coverFit = "cover";
  const [focalX, setFocalX] = useState(Number(video?.cover_focal_x ?? (video?.focal_x == null ? 50 : video.focal_x * 100)));
  const [focalY, setFocalY] = useState(Number(video?.cover_focal_y ?? (video?.focal_y == null ? 50 : video.focal_y * 100)));
  const [coverAlt, setCoverAlt] = useState(video?.cover_alt || "");
  const [mainCover, setMainCover] = useState(initialMain);
  const [mobileCover] = useState(initialMobile);
  const [cleanupKeys, setCleanupKeys] = useState([]);
  const [mainUploadBusy, setMainUploadBusy] = useState(false);
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
    <input type="hidden" name="coverAspectRatio" value={16 / 9} />
    <input type="hidden" name="coverImageUrl" value={mainCover.url} />
    <input type="hidden" name="coverImageStorageKey" value={mainCover.key} />
    <input type="hidden" name="mobileCoverImageUrl" value={mobileCover.url} />
    <input type="hidden" name="mobileCoverStorageKey" value={mobileCover.key} />
    <input type="hidden" name="coverVariants" value={JSON.stringify(mainCover.variants)} />
    <input type="hidden" name="mobileCoverVariants" value={JSON.stringify(mobileCover.variants)} />
    <input type="hidden" name="cleanupStorageKeys" value={JSON.stringify(cleanupKeys)} />
    <label>Title<input required name="title" defaultValue={video?.title} /></label>
    <label>Slug<input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={video?.slug} /></label>
    <label className="form-wide">YouTube URL<input required name="youtubeUrl" type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtu.be/VIDEO_ID" />{youtubeUrl && <small className={youtubeId ? "field-success" : "form-error"}>{youtubeId ? `Video ID: ${youtubeId}` : "Enter a supported YouTube watch, short, embed or youtu.be link."}</small>}{youtubeThumbnail && <span className="youtube-thumbnail-preview"><span>Generated YouTube thumbnail</span><NextImage src={youtubeThumbnail} width={480} height={270} sizes="320px" alt="Generated YouTube project thumbnail" /></span>}</label>
    <label>Orientation<select name="orientation" value={orientation} onChange={(event) => setOrientation(event.target.value)}><option value="landscape">Landscape — 16:9</option><option value="portrait">Portrait — 9:16</option></select></label>
    <label>Status<select name="status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
    <label>Category<select name="categoryId" defaultValue={video?.category_id || ""}><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Year<input name="year" type="number" min="1900" max="2100" defaultValue={video?.year} /></label>
    <label className="form-wide">Short description<textarea name="shortDescription" defaultValue={video?.short_description} rows="2" /></label>
    <label className="form-wide">Project description<textarea name="description" defaultValue={video?.description} rows="6" /></label>
    <label>Client name<input name="clientName" defaultValue={video?.client_name} /></label>
    <label>Creative role<input name="creativeRole" defaultValue={video?.creative_role} /></label>
    <label>Director<input name="director" defaultValue={video?.director} /></label>
    <label>Production company<input name="productionCompany" defaultValue={video?.production_company} /></label>
    <label>Location<input name="location" defaultValue={video?.location} /></label>
    <label>External project URL<input name="externalProjectUrl" type="url" defaultValue={video?.external_project_url} /></label>
    <label className="form-wide">Tags · comma separated<input name="tags" defaultValue={Array.isArray(video?.tags) ? video.tags.join(", ") : ""} /></label>
    <label className="form-wide">Credits · one per line, Role: Name<textarea name="credits" rows="5" defaultValue={Array.isArray(video?.credits) ? video.credits.map((credit) => typeof credit === "string" ? credit : `${credit.role || credit.title || "Credit"}: ${credit.name || credit.value || ""}`).join("\n") : ""} /></label>

    <div className="form-wide cover-upload-grid">
      <CoverUpload label="Required 16:9 project cover" kind="main" cover={mainCover} setCover={setMainCover} orientation="landscape" uploadId={uploadId} scheduleCleanup={scheduleCleanup} onBusyChange={setMainUploadBusy} />
    </div>

    <input type="hidden" name="coverFit" value="cover" />
    <label>Alternative text<input name="coverAlt" value={coverAlt} onChange={(event) => setCoverAlt(event.target.value)} placeholder="Describe the project cover" /></label>
    <label>Focal X<input name="coverFocalX" type="range" min="0" max="100" value={focalX} onChange={(event) => setFocalX(Number(event.target.value))} /><small>{focalX}%</small></label>
    <label>Focal Y<input name="coverFocalY" type="range" min="0" max="100" value={focalY} onChange={(event) => setFocalY(Number(event.target.value))} /><small>{focalY}%</small></label>

    <section className="form-wide admin-media-previews">
      <div className="admin-preview-heading"><div><strong>Responsive 16:9 cover previews</strong><small>The same crop and focal point are used from desktop to mobile. Video orientation applies only after playback starts.</small></div></div>
      <div className="admin-preview-grid"><figure><figcaption>Desktop carousel cover</figcaption><ProjectMedia project={previewProject} context="admin-preview" priority /></figure><figure><figcaption>Tablet carousel cover</figcaption><ProjectMedia project={previewProject} context="admin-preview" /></figure><figure><figcaption>Scaled mobile cover</figcaption><ProjectMedia project={previewProject} context="admin-preview" /></figure></div>
      <div ref={focalRef} className="admin-focal-preview" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateFocal(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFocal(event); }} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}><ProjectMedia project={previewProject} context="focus-player" /><span className="focal-marker" style={{ left: `${focalX}%`, top: `${focalY}%` }} /><p>Drag to reposition the focal point</p></div>
    </section>
    {status === "published" && !mainCover.url && <p className="form-wide form-error">Upload a custom 16:9 cover before publishing this project.</p>}
    <SaveButton disabled={!youtubeId || mainUploadBusy || (status === "published" && !mainCover.url)} />
  </form>;
}

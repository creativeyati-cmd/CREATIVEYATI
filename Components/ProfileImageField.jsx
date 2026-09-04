"use client";

import { useRef, useState } from "react";

export default function ProfileImageField({ site }) {
  const input = useRef(null);
  const [image, setImage] = useState(site.profileImage || "");
  const [storageKey, setStorageKey] = useState(site.profileImageStorageKey || "");
  const [cleanupKey, setCleanupKey] = useState("");
  const [focalX, setFocalX] = useState(Number(site.profileFocalX) || 50);
  const [focalY, setFocalY] = useState(Number(site.profileFocalY) || 50);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function upload(file) {
    if (!file) return;
    setStatus("Uploading…"); setError("");
    const body = new FormData(); body.set("file", file);
    try {
      const response = await fetch("/api/admin/profile-image", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      if (storageKey) setCleanupKey(storageKey);
      setImage(result.url); setStorageKey(result.storageKey); setStatus("Uploaded. Save the page to publish it.");
    } catch (uploadError) { setStatus(""); setError(uploadError.message); }
  }

  function remove() {
    if (!image) return;
    if (storageKey) setCleanupKey(storageKey);
    setImage(""); setStorageKey(""); setStatus("Removed. Save the page to confirm.");
  }

  const position = `${focalX}% ${focalY}%`;
  return <section className="profile-image-field form-wide">
    <input type="hidden" name="profileImage" value={image} />
    <input type="hidden" name="profileImageStorageKey" value={storageKey} />
    <input type="hidden" name="profileCleanupKey" value={cleanupKey} />
    <div className="profile-upload-heading"><div><strong>Navigation profile image</strong><small>JPG, PNG, WebP or AVIF · maximum 8MB</small></div><div><button type="button" onClick={() => input.current?.click()}>{image ? "Replace" : "Upload"}</button>{image && <button type="button" onClick={remove}>Remove</button>}</div></div>
    <input ref={input} className="cover-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => upload(event.target.files?.[0])} />
    <div className="profile-preview-grid"><figure><div className="profile-crop-preview is-desktop">{image ? <img src={image} style={{ objectPosition: position }} alt="Desktop circular crop preview" /> : <span>FM</span>}</div><figcaption>Desktop · 46px</figcaption></figure><figure><div className="profile-crop-preview is-mobile">{image ? <img src={image} style={{ objectPosition: position }} alt="Mobile circular crop preview" /> : <span>FM</span>}</div><figcaption>Mobile · 40px</figcaption></figure></div>
    <div className="profile-focal-controls"><label>Horizontal crop<input name="profileFocalX" type="range" min="0" max="100" value={focalX} onChange={(event) => setFocalX(event.target.value)} /></label><label>Vertical crop<input name="profileFocalY" type="range" min="0" max="100" value={focalY} onChange={(event) => setFocalY(event.target.value)} /></label></div>
    {status && <p className="field-success">{status}</p>}{error && <p className="form-error">{error}</p>}
  </section>;
}

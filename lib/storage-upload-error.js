export function storageUploadError(status, responseText) {
  let payload;
  try { payload = JSON.parse(responseText); } catch { payload = {}; }
  const code = String(payload?.code || payload?.error || "");
  const message = String(payload?.message || "");
  const reason = `${code} ${message}`;
  if (status === 413 || /too.?large|maximum.*size|size.*limit|EntityTooLarge/i.test(reason))
    return "The file exceeds Supabase's storage limit. Check Storage Settings > Global file size limit and the course-videos bucket limit. A 2 GB limit in this editor does not override those settings.";
  if (/mime|content.?type|InvalidMimeType/i.test(reason))
    return "Supabase does not allow this file type. Check the bucket's allowed MIME types (video/mp4, video/webm, video/quicktime for videos).";
  if (/expired|invalid.*token|signature|InvalidJWT/i.test(reason))
    return "The signed upload link expired or is invalid. Click Retry upload to request a fresh link.";
  if (status === 409 || /duplicate|already exists/i.test(reason))
    return "A file already exists at that upload location. Retry to request a new location.";
  if (status === 401 || status === 403 || /unauthorized|access.?denied|row.level|permission/i.test(reason))
    return "Supabase denied access to this upload. Sign in again and retry; if it persists, check the storage bucket and server signing configuration.";
  if (status === 429) return "Supabase is limiting upload requests. Wait a moment, then retry.";
  if (status >= 500) return `Supabase storage is temporarily unavailable (HTTP ${status}). Retry the upload.`;
  // Do not echo signed URLs, tokens, HTML responses or arbitrary server messages.
  const safeCode = /^[A-Za-z][A-Za-z0-9_]{0,60}$/.test(code) ? `; ${code}` : "";
  return `Supabase rejected the upload (HTTP ${status}${safeCode}). Check the Storage logs for this request, then retry.`;
}

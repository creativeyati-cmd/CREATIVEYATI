"use client";
import { storageUploadError } from "@/lib/storage-upload-error";
import { useEffect, useRef, useState } from "react";
import { Input, Button } from "@/Components/FormControls";
export default function CourseResourcesDraft({
  courseId,
  resources,
  onChange,
  beforeUpload,
}) {
  const input = useRef(null);
  const transfer = useRef(null);
  const pending = useRef(null);
  useEffect(() => {
    const warn = event => { if (transfer.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); transfer.current?.abort(); };
  }, []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(null);
  async function upload(file) {
    if (!file || busy) return;
    setRetry(file);
    setError("");
    if (file.type !== "application/pdf" || !file.size || file.size > 25 * 1024 * 1024) {
      setError("Choose a PDF no larger than 25 MB.");
      return;
    }
    setBusy(true);
    setProgress(0);
    const controller = new AbortController();
    transfer.current = controller;
    try {
      if (!(await beforeUpload()))
        throw new Error("Save your draft successfully before uploading.");
      controller.signal.throwIfAborted();
      const metadata = { courseId, fileSize: file.size, fileName: file.name, mimeType: file.type };
      async function call(action, storageKey) {
        const response = await fetch("/api/admin/course-draft-resource", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...metadata, action, storageKey }) });
        const data = await response.json().catch(() => ({ error: "The upload service could not respond. Please retry." }));
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        return data;
      }
      if (pending.current?.file !== file) pending.current = null;
      if (!pending.current) {
        const signed = await call("sign");
        setProgress(0);
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          transfer.current = { abort: () => { controller.abort(); xhr.abort(); } };
          xhr.open("PUT", signed.signedUrl);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
          xhr.onerror = () => reject(new Error("The connection failed. Retry when connected."));
          xhr.onabort = () => reject(new Error("Upload cancelled. You can retry."));
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(storageUploadError(xhr.status, xhr.responseText)));
          const body = new FormData(); body.append("cacheControl", "3600"); body.append("", file); xhr.send(body);
        });
        pending.current = { file, storageKey: signed.storageKey };
      }
      transfer.current = controller;
      const result = await call("finalize", pending.current.storageKey);
      pending.current = null;
      onChange([...resources.filter(r => r.id !== result.id), result]);
      setRetry(null);
    } catch (e) {
      setError(e.name === "AbortError" ? "Upload cancelled. You can retry." : e.message);
    } finally {
      transfer.current = null;
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section
      className="cw-resources"
      aria-busy={busy}
      data-course-uploading={busy || undefined}
    >
      <h3>Downloadable resources</h3>
      <p>
        PDF documents, up to 25 MB each. Uploads are private until you publish
        the course.
      </p>
      {resources.map((r, index) => (
        <div key={r.id} className="cw-resource">
          <label>
            Document title
            <Input
              disabled={busy}
              value={r.title}
              onChange={(e) =>
                onChange(
                  resources.map((item) =>
                    item.id === r.id
                      ? { ...item, title: e.target.value }
                      : item,
                  ),
                )
              }
            />
          </label>
          <label className="check-label">
            <Input
              disabled={busy}
              type="checkbox"
              checked={r.allowDownload !== false}
              onChange={(e) =>
                onChange(
                  resources.map((item) =>
                    item.id === r.id
                      ? { ...item, allowDownload: e.target.checked }
                      : item,
                  ),
                )
              }
            />
            Allow download
          </label>
          <label className="check-label">
            <Input
              disabled={busy}
              type="checkbox"
              checked={Boolean(r.previewAllowed)}
              onChange={(e) =>
                onChange(
                  resources.map((item) =>
                    item.id === r.id
                      ? { ...item, previewAllowed: e.target.checked }
                      : item,
                  ),
                )
              }
            />
            Allow public preview
          </label>
          <a
            href={`/api/admin/course-draft-resource?courseId=${courseId}&key=${encodeURIComponent(r.storageKey)}`}
            target="_blank"
            rel="noreferrer"
          >
            Preview PDF
          </a>
          <Button
            variant="ghost"
            disabled={busy || index === 0}
            onClick={() => {
              const next = [...resources];
              [next[index - 1], next[index]] = [next[index], next[index - 1]];
              onChange(next);
            }}
          >
            Move up
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm("Remove this document from the working draft?")
              )
                onChange(resources.filter((item) => item.id !== r.id));
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <div
        className="upload-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files?.[0]);
        }}
      >
        <p>Drop a PDF here, or choose a file.</p>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>Choose PDF</Button>
        <Input
          className="cover-file-input"
          ref={input}
          aria-label="Upload PDF"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {busy && (
        <progress aria-label="PDF upload progress" max="100" value={progress} />
      )}
      <p aria-live="polite">{busy ? (progress === 100 ? "Verifying PDF..." : `Uploading ${progress}%`) : error}</p>
      {busy && <Button type="button" variant="secondary" onClick={() => transfer.current?.abort()}>Cancel upload</Button>}
      {error && retry && (
        <Button variant="secondary" onClick={() => upload(retry)}>
          Retry upload
        </Button>
      )}
    </section>
  );
}

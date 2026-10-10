"use client";
import { useEffect, useRef, useState } from "react";
import { Input, Button } from "@/Components/FormControls";
export default function CourseCoverCropper({ file, onCrop, onCancel }) {
  const dialog = useRef(null);
  const [url, setUrl] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(file);
    queueMicrotask(() => setUrl(value));
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(value);
  }, [file]);
  async function crop() {
    setBusy(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const width = Math.min(bitmap.width, (bitmap.height * 16) / 9),
        height = (width * 9) / 16;
      if (width < 1280 || height < 720) {
        bitmap.close();
        throw new Error("Choose an image large enough for a 1280 x 720 crop.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(1920, Math.round(width));
      canvas.height = Math.round((canvas.width * 9) / 16);
      canvas
        .getContext("2d")
        .drawImage(
          bitmap,
          ((bitmap.width - width) * x) / 100,
          ((bitmap.height - height) * y) / 100,
          width,
          height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      bitmap.close();
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.9),
      );
      if (!blob) throw new Error("The image could not be processed.");
      onCrop(new File([blob], "course-cover.webp", { type: "image/webp" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="admin-dialog cw-crop-dialog"
      aria-label="Crop course cover"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2>Frame your course cover</h2>
      <p>Choose the part of the image students will see in the 16:9 cover.</p>
      <div
        className="cw-cover"
        role="img"
        aria-label="Crop preview"
        style={{
          backgroundImage: url ? `url(${JSON.stringify(url)})` : undefined,
          backgroundPosition: `${x}% ${y}%`,
        }}
      />
      <label>
        Horizontal position
        <Input
          type="range"
          min="0"
          max="100"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
        />
      </label>
      <label>
        Vertical position
        <Input
          type="range"
          min="0"
          max="100"
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="admin-dialog-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="button" disabled={busy} onClick={crop}>
          {busy ? "Processing..." : "Use crop & upload"}
        </Button>
      </div>
    </dialog>
  );
}

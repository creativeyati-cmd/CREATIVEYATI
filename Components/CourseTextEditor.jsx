"use client";
import { useRef, useState } from "react";
import { Textarea, Button } from "@/Components/FormControls";
import CourseWrittenContent from "@/Components/CourseWrittenContent";
export default function CourseTextEditor({
  name,
  defaultValue = "",
  rows = 8,
}) {
  const ref = useRef(null);
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  function format(before, after = "") {
    const el = ref.current;
    const start = el.selectionStart,
      end = el.selectionEnd;
    const next =
      value.slice(0, start) +
      before +
      (value.slice(start, end) || "text") +
      after +
      value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  return (
    <div>
      <div
        className="cw-text-toolbar"
        role="toolbar"
        aria-label="Text formatting"
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => format("**", "**")}
        >
          Bold
        </Button>
        <Button type="button" variant="ghost" onClick={() => format("_", "_")}>
          Italic
        </Button>
        <Button type="button" variant="ghost" onClick={() => format("\n## ")}>
          Heading
        </Button>
        <Button type="button" variant="ghost" onClick={() => format("\n- ")}>
          List
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          Preview formatting
        </Button>
      </div>
      <Textarea
        ref={ref}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {preview && <CourseWrittenContent text={value} />}
    </div>
  );
}

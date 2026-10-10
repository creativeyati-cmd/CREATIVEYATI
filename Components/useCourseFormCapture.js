"use client";
import { useEffect, useRef } from "react";
// Capture native fields and upload-produced hidden references after React commits.
export default function useCourseFormCapture(onChange) {
  const ref = useRef(null);
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const values = () =>
      Object.fromEntries(
        [...new FormData(form)].filter(
          ([key, value]) =>
            typeof value === "string" && !key.startsWith("$ACTION"),
        ),
      );
    let previous = JSON.stringify(values());
    let queued = false;
    let active = true;
    function capture() {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!active) return;
        const next = values();
        const serialized = JSON.stringify(next);
        if (serialized !== previous) {
          previous = serialized;
          callback.current?.(next);
        }
      });
    }
    // Include text entered into server-rendered controls before hydration completed.
    if (
      [...form.elements].some(
        (el) =>
          ["INPUT", "TEXTAREA"].includes(el.tagName) &&
          !["hidden", "file", "checkbox", "radio"].includes(el.type) &&
          el.value !== el.defaultValue,
      )
    ) {
      previous = "";
      capture();
    }
    form.addEventListener("input", capture);
    form.addEventListener("change", capture);
    const observer = new MutationObserver(capture);
    observer.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["value", "checked"],
    });
    return () => {
      active = false;
      observer.disconnect();
      form.removeEventListener("input", capture);
      form.removeEventListener("change", capture);
    };
  }, []);
  return ref;
}

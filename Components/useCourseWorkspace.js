"use client";
import { useCallback, useEffect, useRef, useState } from "react";
// JSON saves cannot replace the active React page when auth cookies refresh.
async function saveWorkspace(id, revision, document) {
  const response = await fetch("/api/admin/course-workspace", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, revision, document }),
  });
  const result = await response.json().catch(() => null);
  if (!result) throw new Error("The save response was interrupted.");
  return result;
}
import { AUTOSAVE_DELAY } from "@/lib/course-workspace";
export default function useCourseWorkspace(
  initial,
  debounce = AUTOSAVE_DELAY,
  saveAction = saveWorkspace,
) {
  const [document, setDocument] = useState(initial.document);
  const [state, setState] = useState(initial.revision ? "saved" : "unsaved");
  const [error, setError] = useState(
    initial.liveConflict
      ? "The live course changed outside this draft. Download your working copy, then load the live version to continue safely."
      : "",
  );
  const [recovery, setRecovery] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [offline, setOffline] = useState(false);
  const current = useRef(initial.document);
  const openingDocument = useRef(initial.document);
  const recoveryChecked = useRef(false);
  const revision = useRef(initial.revision);
  const dirty = useRef(false);
  const pending = useRef(null);
  const conflict = useRef(Boolean(initial.liveConflict));
  const paused = useRef(false);
  const timer = useRef(null);
  const storageKey = `avc-course:${initial.userId}:${initial.document.id}`;
  const backup = useCallback(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          document: current.current,
          revision: revision.current,
          savedAt: Date.now(),
        }),
      );
    } catch {
      setError(
        "Browser recovery storage is unavailable. Keep this tab open until the server saves your changes.",
      );
    }
  }, [storageKey]);
  const save = useCallback(
    async function save() {
      clearTimeout(timer.current);
      if (paused.current || conflict.current) return false;
      if (pending.current) {
        const previousOk = await pending.current;
        if (!previousOk) return false;
        if (dirty.current && !conflict.current) return save();
        return !dirty.current;
      }
      if (!dirty.current && revision.current > 0) return true;
      if (!navigator.onLine) {
        setState("failed");
        setOffline(true);
        return false;
      }
      const snapshot = current.current;
      setState("saving");
      setError("");
      const task = (async () => {
        try {
          const result = await saveAction(
            snapshot.id,
            revision.current,
            snapshot,
          );
          if (!result.ok) {
            conflict.current = Boolean(result.conflict);
            setState("failed");
            setError(result.error);
            return false;
          }
          revision.current = result.revision;
          dirty.current = current.current !== snapshot;
          if (dirty.current) {
            backup();
            setState("unsaved");
          } else {
            setState("saved");
            try {
              localStorage.removeItem(storageKey);
            } catch {}
          }
          return true;
        } catch {
          setState("failed");
          setError(
            "Save failed. Your changes remain in this tab. Reconnect and retry.",
          );
          return false;
        }
      })();
      pending.current = task;
      const ok = await task;
      pending.current = null;
      if (ok && dirty.current) return save();
      return ok;
    },
    [backup, storageKey, saveAction],
  );
  const change = useCallback(
    (update) => {
      const next =
        typeof update === "function" ? update(current.current) : update;
      current.current = next;
      if (initial.isNew && revision.current === 0)
        window.history.replaceState(
          null,
          "",
          `/admin/courses/new?draft=${next.id}`,
        );
      setDocument(next);
      dirty.current = true;
      setState("unsaved");
      backup();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => save(), debounce);
    },
    [backup, debounce, save, initial.isNew],
  );
  useEffect(() => {
    if (!recoveryChecked.current) {
      recoveryChecked.current = true;
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (
          stored?.document &&
          JSON.stringify(stored.document) !== JSON.stringify(openingDocument.current)
        ) {
          paused.current = true;
          queueMicrotask(() => setRecovery(stored));
        }
      } catch {
        /* Storage may be unavailable in private browsing. */
      }
    }
    const warn = (event) => {
      if (
        dirty.current ||
        pending.current ||
        window.document.querySelector("[data-course-uploading=true]")
      ) {
        backup();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const leave = (event) => {
      const link = event.target.closest?.("a[href]");
      if (
        link &&
        !link.target &&
        (dirty.current || window.document.querySelector("[data-course-uploading=true]")) &&
        !window.confirm(
          "Leaving will interrupt any active upload. Unsaved text is kept in this browser. Leave the editor?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const online = () => {
      setOffline(false);
      if (dirty.current) save();
    };
    const offlineHandler = () => setOffline(true);
    window.addEventListener("beforeunload", warn);
    window.document.addEventListener("click", leave, true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineHandler);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("beforeunload", warn);
      window.document.removeEventListener("click", leave, true);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [backup, save, storageKey]);
  function recover() {
    if (!recovery) return;
    paused.current = false;
    if (recovery.revision !== revision.current && !initial.isNew) {
      conflict.current = true;
      setError(
        "This recovery copy predates a newer server revision. Download it and compare before reloading; it will not overwrite the server.",
      );
    } else revision.current = recovery.revision;
    change(recovery.document);
    setRecovery(null);
    setGeneration((value) => value + 1);
  }
  function discardRecovery() {
    paused.current = false;
    setRecovery(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify(recovery?.document || current.current, null, 2)],
        { type: "application/json" },
      ),
    );
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "course-recovery.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function accept(result) {
    paused.current = false;
    setRecovery(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    conflict.current = false;
    setError("");
    revision.current = result.revision;
    if (result.document) {
      current.current = result.document;
      setDocument(result.document);
      setGeneration((value) => value + 1);
    }
    dirty.current = false;
    setState("saved");
  }
  return {
    document,
    current,
    revision,
    state,
    error,
    setError,
    recovery,
    recover,
    discardRecovery,
    download,
    change,
    save,
    accept,
    generation,
    offline,
    conflict,
  };
}

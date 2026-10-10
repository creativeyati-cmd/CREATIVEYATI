"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/Components/FormControls";
import {
  duplicateWorkspace,
  courseLifecycle,
} from "@/app/admin/course-workspace-actions";
import { notify } from "@/Components/ToastHost";
export default function CourseRowActions({ courseId, revision, deleted }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act() {
    if (
      !window.confirm(
        deleted
          ? "Restore this course as a private draft?"
          : "Create a private duplicate of this course and its media?",
      )
    )
      return;
    setBusy(true);
    try {
      const result = deleted
        ? await courseLifecycle(courseId, revision, "restore")
        : await duplicateWorkspace(courseId);
      if (result.ok) {
        notify(deleted ? "Course restored as a draft." : "Course duplicated.");
        router.push(`/admin/courses/${result.id || courseId}/edit`);
        router.refresh();
      } else notify(result.error, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="ghost" disabled={busy} onClick={act}>
      {busy ? "Working..." : deleted ? "Restore" : "Duplicate"}
    </Button>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminIcon, ChevronDownIcon } from "@/Components/Icons";
import { formatDuration, moduleDuration } from "@/lib/course-format";

const typeIcon = { video: "video", mixed: "video", pdf: "doc", text: "doc", external: "link" };

export default function CourseCurriculum({ sections = [], courseSlug = "", enrolled = false, activeLessonId = "", progressIds = [], inert = false, variant = "overview", defaultOpenId = "" }) {
  const modules = sections.filter((section) => section?.lessons?.length);
  const [openId, setOpenId] = useState(defaultOpenId || modules[0]?.id || "");
  const doneSet = new Set(progressIds);

  return <div className={`curriculum-accordion is-${variant}`}>
    {modules.map((section, index) => {
      const lessons = section.lessons;
      const open = openId === section.id;
      const done = lessons.filter((lesson) => doneSet.has(lesson.id)).length;
      const duration = moduleDuration(lessons);
      const progress = lessons.length ? Math.round(done / lessons.length * 100) : 0;
      return <section key={section.id} className="curriculum-module" data-open={open || undefined}>
        <h3 className="module-head">
          <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? "" : section.id)}>
            <span className="module-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="module-name">{section.title}</span>
            <span className="module-meta">{lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}{duration ? ` · ${formatDuration(duration)}` : ""}</span>
            {enrolled && <span className="module-done" title={`${done} of ${lessons.length} complete`}>{done}/{lessons.length}</span>}
            {enrolled && <span className="module-bar"><i style={{ width: `${progress}%` }} /></span>}
            <ChevronDownIcon open={open} size={15} />
          </button>
        </h3>
        {open && <ul className="module-lessons">
          {lessons.map((lesson) => {
            const complete = doneSet.has(lesson.id);
            const canOpen = enrolled || Boolean(lesson.isPreview);
            const href = inert ? null : enrolled ? `/learn/${courseSlug}/lesson/${lesson.id}` : lesson.isPreview ? `/courses/${courseSlug}/preview/${lesson.id}` : null;
            const state = complete ? <small className="lesson-state is-complete"><AdminIcon name="check" size={13} />Complete</small>
              : !enrolled && lesson.isPreview ? <small className="lesson-state is-preview">Preview</small>
              : !canOpen ? <small className="lesson-state is-locked"><AdminIcon name="lock" size={12} />Enrolled students</small> : null;
            const body = <><span className="lesson-kind"><AdminIcon name={typeIcon[lesson.lessonType] || "book"} size={15} /></span><span className="lesson-name">{lesson.title}</span>{lesson.durationSeconds ? <small className="lesson-duration">{formatDuration(lesson.durationSeconds)}</small> : null}{state}</>;
            return <li key={lesson.id} className={`${activeLessonId === lesson.id ? "is-active" : ""} ${complete ? "is-complete" : ""}`}>
              {href ? <Link href={href}>{body}</Link> : <span className="lesson-row">{body}</span>}
            </li>;
          })}
        </ul>}
      </section>;
    })}
  </div>;
}

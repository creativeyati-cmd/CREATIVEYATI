"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderCurriculum } from "@/app/admin/actions";

function reorder(items, from, to) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MoveButtons({ index, length, move }) {
  return <span className="reorder-buttons"><button type="button" disabled={index === 0} onClick={() => move(index, index - 1)}>Up</button><button type="button" disabled={index === length - 1} onClick={() => move(index, index + 1)}>Down</button></span>;
}

export default function CurriculumReorder({ courseId, sections: initial }) {
  const [sections, setSections] = useState(initial);
  const [drag, setDrag] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function moveSection(from, to) { setSections((items) => reorder(items, from, to)); setDirty(true); }
  function moveLesson(sectionIndex, from, to) { setSections((items) => items.map((section, index) => index === sectionIndex ? { ...section, lessons: reorder(section.lessons, from, to) } : section)); setDirty(true); }
  function moveResource(sectionIndex, lessonIndex, from, to) {
    setSections((items) => items.map((section, index) => index === sectionIndex ? { ...section, lessons: section.lessons.map((lesson, childIndex) => childIndex === lessonIndex ? { ...lesson, resources: reorder(lesson.resources, from, to) } : lesson) } : section));
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      setMessage("Saving…");
      const sectionResult = await reorderCurriculum("sections", courseId, sections.map((section) => section.id), courseId);
      if (!sectionResult.ok) return setMessage(sectionResult.error);
      for (const section of sections) {
        const lessonResult = await reorderCurriculum("lessons", section.id, section.lessons.map((lesson) => lesson.id), courseId);
        if (!lessonResult.ok) return setMessage(lessonResult.error);
        for (const lesson of section.lessons) {
          const resourceResult = await reorderCurriculum("resources", lesson.id, lesson.resources.map((resource) => resource.id), courseId);
          if (!resourceResult.ok) return setMessage(resourceResult.error);
        }
      }
      setDirty(false);
      setMessage("Curriculum order saved.");
      router.refresh();
    });
  }

  return <section className="curriculum-reorder">
    <div className="reorder-toolbar"><strong>Curriculum order</strong><span>Drag sections, lessons, and resources, or use the move buttons.</span><button className="button" type="button" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save order"}</button><button type="button" disabled={!dirty || pending} onClick={() => { setSections(initial); setDirty(false); setMessage(""); }}>Cancel</button></div>
    <ol>{sections.map((section, sectionIndex) => <li key={section.id} draggable onDragStart={() => setDrag({ type: "section", index: sectionIndex })} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (drag?.type === "section") moveSection(drag.index, sectionIndex); setDrag(null); }}>
      <div><b>{section.title}</b><MoveButtons index={sectionIndex} length={sections.length} move={moveSection} /></div>
      <ol>{section.lessons.map((lesson, lessonIndex) => <li key={lesson.id} draggable onDragStart={(event) => { event.stopPropagation(); setDrag({ type: "lesson", sectionIndex, index: lessonIndex }); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); if (drag?.type === "lesson" && drag.sectionIndex === sectionIndex) moveLesson(sectionIndex, drag.index, lessonIndex); setDrag(null); }}>
        <div><span>{lesson.title}</span><MoveButtons index={lessonIndex} length={section.lessons.length} move={(from, to) => moveLesson(sectionIndex, from, to)} /></div>
        {lesson.resources.length > 0 && <ol className="resource-reorder-list">{lesson.resources.map((resource, resourceIndex) => <li key={resource.id} draggable onDragStart={(event) => { event.stopPropagation(); setDrag({ type: "resource", sectionIndex, lessonIndex, index: resourceIndex }); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); if (drag?.type === "resource" && drag.sectionIndex === sectionIndex && drag.lessonIndex === lessonIndex) moveResource(sectionIndex, lessonIndex, drag.index, resourceIndex); setDrag(null); }}><span>{resource.title}</span><MoveButtons index={resourceIndex} length={lesson.resources.length} move={(from, to) => moveResource(sectionIndex, lessonIndex, from, to)} /></li>)}</ol>}
      </li>)}</ol>
    </li>)}</ol>
    <p className="status-note" aria-live="polite">{message}</p>
  </section>;
}

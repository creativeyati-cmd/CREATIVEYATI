"use client";
import AdminPreviewFrame from "@/Components/AdminPreviewFrame";
import CourseCommunityEditor from "@/Components/CourseCommunityEditor";
import CourseOverview from "@/Components/CourseOverview";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input, Button, Textarea } from "@/Components/FormControls";
import CourseForm from "@/Components/CourseForm";
import CourseLessonEditor from "@/Components/CourseLessonEditor";
import CourseLessonContent from "@/Components/CourseLessonContent";
import CourseResourcesDraft from "@/Components/CourseResourcesDraft";
import useCourseWorkspace from "@/Components/useCourseWorkspace";
import { formatMoney } from "@/lib/money/format";
import {
  formCourse,
  formLesson,
  publishingIssues,
} from "@/lib/course-workspace";
import {
  publishWorkspace,
  courseLifecycle,
  workspaceHistory,
  restoreWorkspaceVersion,
  reloadWorkspaceFromLive,
} from "@/app/admin/course-workspace-actions";
import { notify } from "@/Components/ToastHost";
const steps = [
  ["details", "Basic information"],
  ["curriculum", "Modules & lessons"],
  ["materials", "Resources"],
  ["community", "Community"],
  ["pricing", "Pricing"],
  ["preview", "Preview"],
  ["publish", "Review & publish"],
];
const move = (items, from, to) => {
  const result = [...items];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
};
export default function CourseWorkspace({
  initial,
  initialStep = "details",
  saveAction,
}) {
  const router = useRouter();
  const w = useCourseWorkspace(initial, undefined, saveAction);
  const doc = w.document;
  const [step, setStep] = useState(initialStep);
  const [status, setStatus] = useState(initial.status || "draft");
  const [busy, setBusy] = useState(false);
  const [serverIssues, setServerIssues] = useState([]);
  const [history, setHistory] = useState(null);
  const [drag, setDrag] = useState(null);
  const issues = [...publishingIssues(doc), ...serverIssues];
  const readySteps = ["details", "curriculum", "pricing"].filter(
    (key) => !issues.some((issue) => issue.step === key),
  ).length;
  function edit(update) {
    const current = w.current.current;
    const next = typeof update === "function" ? update(current) : update;
    const activeLesson = document.querySelector("[data-course-uploading=true]")?.closest(".lesson-editor");
    if (activeLesson) {
      const owner = current.sections.find(s => s.lessons.some(l => l.id === activeLesson.id));
      const nextOwner = next.sections.find(s => s.lessons.some(l => l.id === activeLesson.id));
      if (!nextOwner || owner?.id !== nextOwner.id) {
        notify("Finish or cancel this lesson's upload before removing or moving it.", "error");
        return;
      }
    }
    setServerIssues([]);
    w.change(next);
  }
  function sectionChange(id, update) {
    edit((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? update(s) : s)),
    }));
  }
  function lessonChange(sectionId, lessonId, values) {
    sectionChange(sectionId, (s) => ({
      ...s,
      lessons: s.lessons.map((l) =>
        l.id === lessonId ? { ...l, ...formLesson(values) } : l,
      ),
    }));
  }
  function addLesson(sectionId) {
    const lessonId = crypto.randomUUID();
    sectionChange(sectionId, (s) => ({
      ...s,
      lessons: [
        ...s.lessons,
        {
          id: lessonId,
          title: "",
          slug: "",
          lessonType: "video",
          sourceType: "upload",
          status: "draft",
          resources: [],
        },
      ],
    }));
    requestAnimationFrame(() => {
      const panel = document.getElementById(lessonId);
      if (panel) { panel.open = true; panel.querySelector('input[name="title"]')?.focus(); }
    });
  }
  function duplicateLesson(sectionId, lesson) {
    sectionChange(sectionId, (s) => ({
      ...s,
      lessons: [
        ...s.lessons,
        {
          ...structuredClone(lesson),
          id: crypto.randomUUID(),
          title: `${lesson.title} copy`,
          slug: `${lesson.slug}-copy-${Date.now().toString(36)}`,
          status: "draft",
          isPreview: false,
          resources: (lesson.resources || []).map((r) => ({
            ...r,
            id: crypto.randomUUID(),
          })),
        },
      ],
    }));
  }
  function duplicateModule(section) {
    edit((d) => ({
      ...d,
      sections: [
        ...d.sections,
        {
          ...structuredClone(section),
          id: crypto.randomUUID(),
          title: `${section.title} copy`,
          lessons: section.lessons.map((l) => ({
            ...l,
            id: crypto.randomUUID(),
            status: "draft",
            isPreview: false,
            resources: (l.resources || []).map((r) => ({
              ...r,
              id: crypto.randomUUID(),
            })),
          })),
        },
      ],
    }));
  }
  async function save() {
    const ok = await w.save();
    if (ok) notify("Course draft saved.");
    return ok;
  }
  async function publish() {
    if (document.querySelector("[data-course-uploading=true]")) {
      w.setError("Wait for uploads to finish before publishing.");
      return;
    }
    if (
      !window.confirm(
        status === "published"
          ? "Publish these updates for all students?"
          : "Publish this course for students?",
      )
    )
      return;
    setBusy(true);
    try {
      if (!(await w.save())) return;
      const result = await publishWorkspace(
        w.current.current.id,
        w.revision.current,
      );
      if (!result.ok) {
        w.setError(result.error);
        setServerIssues(result.issues || []);
        notify(result.error, "error");
        return;
      }
      w.accept(result);
      setStatus("published");
      notify("Course published. Students can now see this version.");
    } finally {
      setBusy(false);
    }
  }
  async function lifecycle(intent) {
    if (
      !window.confirm(
        `${intent === "restore" ? "Restore as a private draft" : intent === "delete" ? "Move this course to trash" : intent === "unpublish" ? "Unpublish this course" : "Archive this course"}? Student records will be retained.`,
      )
    )
      return;
    setBusy(true);
    try {
      if (!(await w.save())) return;
      const result = await courseLifecycle(doc.id, w.revision.current, intent);
      if (!result.ok) {
        w.setError(result.error);
        return;
      }
      w.accept(result);
      setStatus(result.status);
      notify("Course status updated.");
      if (intent === "delete") router.push("/admin/courses?view=trash");
    } finally {
      setBusy(false);
    }
  }
  function go(issue) {
    setStep(issue.step);
    setTimeout(() => {
      const target =
        document.getElementById(issue.field) ||
        document.querySelector(
          `[name="${CSS.escape(issue.field || "title")}"]`,
        );
      for (let parent = target; parent; parent = parent.parentElement)
        if (parent.tagName === "DETAILS") parent.open = true;
      target?.scrollIntoView({ block: "center" });
      (target?.querySelector?.("input,textarea,button") || target)?.focus();
    }, 100);
  }
  function moves(index, length, action) {
    return (
      <span className="reorder-buttons">
        <Button
          type="button"
          variant="ghost"
          disabled={index === 0}
          onClick={() => action(index, index - 1)}
        >
          Up
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={index === length - 1}
          onClick={() => action(index, index + 1)}
        >
          Down
        </Button>
      </span>
    );
  }
  return (
    <div className="course-workspace">
      <header className="cw-summary">
        <div>
          <small>
            {status.toUpperCase()}{" "}
            {status === "published"
              ? " / PRIVATE WORKING REVISION"
              : " / COURSE WORKSPACE"}
          </small>
          <h2>{doc.title || "Untitled course"}</h2>
          <p>
            Start with what you know. Save incomplete work now and publish when
            you are ready.
          </p>
        </div>
        <div>
          <strong>{readySteps} of 3 requirements complete</strong>
          <progress
            aria-label="Publishing readiness"
            max="3"
            value={readySteps}
          />
        </div>
      </header>
      {initial.migrationMissing && (
        <p role="alert" className="status-note">
          Database setup required: apply{" "}
          <code>production-course-workspaces.sql</code> before saving or
          publishing.
        </p>
      )}
      {w.recovery && (
        <section className="cw-recovery" role="alert">
          <strong>Unsaved changes were found on this browser.</strong>
          <p>
            Recover them or keep the server version. No changes will autosave
            until you choose.
          </p>
          <Button onClick={w.recover}>Recover changes</Button>
          <Button variant="secondary" onClick={w.download}>
            Download recovery copy
          </Button>
          <Button variant="ghost" onClick={w.discardRecovery}>
            Use server version
          </Button>
        </section>
      )}
      <div className="cw-save-bar">
        <span role="status" aria-live="polite">
          {w.offline
            ? "Offline ? changes kept in this browser"
            : {
                saved: "All changes saved",
                unsaved: "Unsaved changes",
                saving: "Saving...",
                failed: "Save failed",
              }[w.state]}
        </span>
        <div>
          <Button
            variant="secondary"
            disabled={busy || Boolean(w.recovery)}
            onClick={() => {
              if (document.querySelector("[data-course-uploading=true]")) {
                w.setError(
                  "Finish or cancel the current upload before changing sections.",
                );
                return;
              }
              setStep("preview");
            }}
          >
            Preview
          </Button>
          <Button
            disabled={busy || w.state === "saving" || Boolean(w.recovery)}
            onClick={save}
          >
            {w.state === "failed" ? "Retry save" : "Save draft"}
          </Button>
        </div>
      </div>
      {w.error && (
        <div className="cw-recovery" role="alert">
          <p>{w.error}</p>
          <Button variant="secondary" onClick={w.download}>
            Download recovery copy
          </Button>
          {w.conflict.current && (
            <Button onClick={() => window.location.reload()}>
              Reload latest draft
            </Button>
          )}
          {initial.liveConflict && (
            <Button
              onClick={async () => {
                if (
                  !window.confirm(
                    "Replace this private working revision with the live course? Download any unsaved changes first.",
                  )
                )
                  return;
                const result = await reloadWorkspaceFromLive(
                  doc.id,
                  w.revision.current,
                );
                if (result.ok) w.accept(result);
                else w.setError(result.error);
              }}
            >
              Load live version
            </Button>
          )}
        </div>
      )}
      <nav className="course-workflow-nav" aria-label="Course creation steps">
        {steps.map(([key, label], i) => (
          <Button
            key={key}
            variant="ghost"
            aria-current={step === key ? "step" : undefined}
            disabled={busy}
            onClick={async () => {
              if (document.querySelector("[data-course-uploading=true]")) {
                w.setError(
                  "Finish or cancel the current upload before changing sections.",
                );
                return;
              }
              if (
                ["curriculum", "materials"].includes(key) &&
                !w.revision.current &&
                !(await w.save())
              )
                return;
              setStep(key);
            }}
          >
            <small>{i + 1}</small>
            {label}
          </Button>
        ))}
      </nav>
      <fieldset
        disabled={busy || Boolean(w.recovery)}
        key={`${w.generation}:${step}`}
        aria-label={steps.find(([key]) => key === step)?.[1]}
        className="cw-content"
      >
        {["details", "pricing"].includes(step) && (
          <CourseForm
            course={doc}
            step={step}
            action={save}
            onDraftChange={(values) =>
              edit((d) => ({ ...d, ...formCourse(values, step) }))
            }
          />
        )}
        {step === "curriculum" && (
          <>
            <div className="cw-builder-heading"><h3>Course content</h3><p>Add a module, name your lesson, then upload its video. Changes save automatically.</p></div>
            {!doc.sections.length && (
              <div className="cw-empty">
                <h3>Build your first module</h3>
                <p>
                  Group related lessons into modules. Everything here stays
                  private until you publish.
                </p>
              </div>
            )}
            {doc.sections.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className="curriculum-section"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag?.type === "module")
                    edit((d) => ({
                      ...d,
                      sections: move(d.sections, drag.index, index),
                    }));
                  setDrag(null);
                }}
              >
                <details className="cw-organize"><summary>Module options</summary><div className="cw-module-toolbar">
                  <span
                    draggable
                    onDragStart={() => setDrag({ type: "module", index })}
                  >
                    Module {index + 1}
                  </span>
                  {moves(index, doc.sections.length, (a, b) =>
                    edit((d) => ({ ...d, sections: move(d.sections, a, b) })),
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => duplicateModule(section)}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this module from the working draft? Existing student progress is retained.",
                        )
                      )
                        edit((d) => ({
                          ...d,
                          sections: d.sections.filter(
                            (s) => s.id !== section.id,
                          ),
                        }));
                    }}
                  >
                    Remove
                  </Button>
                </div></details>
                <label>
                  Module title
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      sectionChange(section.id, (s) => ({
                        ...s,
                        title: e.target.value,
                      }))
                    }
                  />
                </label>
                <details>
                  <summary>Module description</summary>
                  <Textarea
                    value={section.description || ""}
                    onChange={(e) =>
                      sectionChange(section.id, (s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                  />
                </details>
                {section.lessons.map((lesson, li) => (
                  <details
                    key={lesson.id}
                    id={lesson.id}
                    className="lesson-editor"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (drag?.type === "lesson")
                        edit((d) => {
                          const source = d.sections.find(
                            (s) => s.id === drag.sectionId,
                          )?.lessons[drag.index];
                          if (!source) return d;
                          return {
                            ...d,
                            sections: d.sections.map((s) => {
                              let lessons = s.lessons.filter(
                                (l) => l.id !== source.id,
                              );
                              if (s.id === section.id)
                                lessons.splice(li, 0, source);
                              return { ...s, lessons };
                            }),
                          };
                        });
                      setDrag(null);
                    }}
                  >
                    <summary>
                      {lesson.title || "Untitled lesson"}
                      <small>
                        {lesson.status === "published"
                          ? "Ready to publish"
                          : "Draft"}
                      </small>
                    </summary>
                    <details className="cw-organize"><summary>Reorder or move lesson</summary><div className="cw-module-toolbar">
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDrag({
                            type: "lesson",
                            sectionId: section.id,
                            index: li,
                          });
                        }}
                      >
                        Lesson {li + 1}
                      </span>
                      {moves(li, section.lessons.length, (a, b) =>
                        sectionChange(section.id, (s) => ({
                          ...s,
                          lessons: move(s.lessons, a, b),
                        })),
                      )}
                      <label>
                        Move to module
                        <select className="dashboard-input"
                          value={section.id}
                          onChange={(e) => {
                            const target = e.target.value;
                            edit((d) => ({
                              ...d,
                              sections: d.sections.map((s) =>
                                s.id === section.id
                                  ? {
                                      ...s,
                                      lessons: s.lessons.filter(
                                        (l) => l.id !== lesson.id,
                                      ),
                                    }
                                  : s.id === target
                                    ? { ...s, lessons: [...s.lessons, lesson] }
                                    : s,
                              ),
                            }));
                          }}
                        >
                          {doc.sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title || "Untitled module"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div></details>
                    <CourseLessonEditor
                      workspace
                      course={doc}
                      section={section}
                      sections={[section]}
                      lesson={lesson}
                      lessonId={lesson.id}
                      onDraftChange={(v) =>
                        lessonChange(section.id, lesson.id, v)
                      }
                      saveAction={save}
                      duplicateAction={() =>
                        duplicateLesson(section.id, lesson)
                      }
                      deleteAction={() =>
                        sectionChange(section.id, (s) => ({
                          ...s,
                          lessons: s.lessons.filter((l) => l.id !== lesson.id),
                        }))
                      }
                    />
                    <CourseResourcesDraft
                      courseId={doc.id}
                      lessonId={lesson.id}
                      resources={lesson.resources || []}
                      beforeUpload={w.save}
                      onChange={(resources) =>
                        sectionChange(section.id, (s) => ({
                          ...s,
                          lessons: s.lessons.map((l) =>
                            l.id === lesson.id ? { ...l, resources } : l,
                          ),
                        }))
                      }
                    />
                  </details>
                ))}
                <Button
                  variant="secondary"
                  onClick={() => addLesson(section.id)}
                >
                  Add lesson
                </Button>
              </article>
            ))}
            <Button
              onClick={() =>
                edit((d) => ({
                  ...d,
                  sections: [
                    ...d.sections,
                    {
                      id: crypto.randomUUID(),
                      title: "",
                      description: "",
                      lessons: [],
                    },
                  ],
                }))
              }
            >
              Add module
            </Button>
            <p className="field-hint">
              Video, written lessons, PDFs and external resources are supported.
              Quizzes are not available on this platform yet.
            </p>
          </>
        )}
        {step === "materials" && (
          <CourseResourcesDraft
            courseId={doc.id}
            resources={doc.materials || []}
            beforeUpload={w.save}
            onChange={(materials) => edit((d) => ({ ...d, materials }))}
          />
        )}
        {step === "community" && <CourseCommunityEditor courseId={doc.id} beforeSave={w.save} />}
        {step === "preview" && (
          <article className="admin-course-preview">
            <p className="status-note">
              Private preview of the working draft. Ready lessons will be shown
              to students after publishing.
            </p>
            <AdminPreviewFrame courseTitle={doc.title} onExit={() => setStep("details")}><CourseOverview course={doc} price={doc.isFree ? 0 : doc.priceMinor || 0} priceLabel={doc.isFree ? "Free" : formatMoney(doc.priceMinor || 0, doc.currency || "NGN")} preview /></AdminPreviewFrame>
            <h2>Lesson playback preview</h2>
            {doc.sections.map((s) => (
              <section key={s.id}>
                <h3>{s.title || "Untitled module"}</h3>
                {s.lessons.map((l) => (
                  <details key={l.id}>
                    <summary>
                      {l.title || "Untitled lesson"} ?{" "}
                      {l.status === "published" ? "Ready" : "Draft"}
                    </summary>
                    <CourseLessonContent
                      lesson={{ ...l, courseId: doc.id }}
                      admin
                    />
                    {(l.resources || []).map((r) => (
                      <p key={r.id}>
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`/api/admin/course-draft-resource?courseId=${doc.id}&key=${encodeURIComponent(r.storageKey)}`}
                        >
                          {r.title}
                        </a>
                      </p>
                    ))}
                  </details>
                ))}
              </section>
            ))}
          </article>
        )}
        {step === "publish" && (
          <>
            <h2>Publishing checklist</h2>
            <p>
              Publishing applies this saved revision together. Saving a draft
              never changes the live course.
            </p>
            {issues.length ? (
              <ul className="cw-checklist">
                {issues.map((issue, i) => (
                  <li key={i}>
                    <Button variant="ghost" onClick={() => go(issue)}>
                      {issue.message} ?
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-success">
                Your course is ready for the final server checks.
              </p>
            )}
            <Button
              disabled={busy || issues.length > 0 || Boolean(w.recovery)}
              onClick={publish}
            >
              {busy
                ? "Checking and publishing..."
                : status === "published"
                  ? "Update published course"
                  : "Publish course"}
            </Button>
            <details className="cw-lifecycle">
              <summary>Course lifecycle & version history</summary>
              <div className="cw-module-toolbar">
                {status === "published" && (
                  <Button
                    variant="secondary"
                    onClick={() => lifecycle("unpublish")}
                  >
                    Unpublish
                  </Button>
                )}
                {status === "archived" || status === "unpublished" ? (
                  <Button
                    variant="secondary"
                    onClick={() => lifecycle("restore")}
                  >
                    Restore as draft
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => lifecycle("archive")}
                  >
                    Archive
                  </Button>
                )}
                <Button variant="danger" onClick={() => lifecycle("delete")}>
                  Move to trash
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const result = await workspaceHistory(doc.id);
                    if (result.ok) setHistory(result.items);
                    else w.setError(result.error);
                  }}
                >
                  View version history
                </Button>
              </div>
              {history &&
                (!history.length ? (
                  <p>No published versions yet.</p>
                ) : (
                  history.map((item) => (
                    <div className="cw-module-toolbar" key={item.id}>
                      <span>
                        Version {item.revision} ?{" "}
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Load this version into the private working draft? The live course will not change.",
                            )
                          )
                            return;
                          if (!(await w.save())) return;
                          const result = await restoreWorkspaceVersion(
                            doc.id,
                            item.id,
                            w.revision.current,
                          );
                          if (result.ok) w.accept(result);
                          else w.setError(result.error);
                        }}
                      >
                        Restore to draft
                      </Button>
                    </div>
                  ))
                ))}
            </details>
          </>
        )}
      </fieldset>
      <footer className="cw-footer">
        <Link href="/admin/courses">Back to courses</Link>
        <span>
          Only administrators can access working drafts.
          {!initial.isNew && (
            <>
              {" "}
              <Link href={`/admin/courses/${doc.id}/students`}>
                Manage student access
              </Link>
            </>
          )}
        </span>
      </footer>
    </div>
  );
}

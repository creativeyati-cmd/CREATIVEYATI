"use client";
import { Input, Select, Textarea, Button } from "@/Components/FormControls";

import { useMemo, useState, useRef } from "react";
import useCourseFormCapture from "@/Components/useCourseFormCapture";
import CourseTextEditor from "@/Components/CourseTextEditor";
import CourseVideoPlayer from "@/Components/CourseVideoPlayer";
import DirectCourseVideoUpload from "@/Components/DirectCourseVideoUpload";
import LessonPosterField from "@/Components/LessonPosterField";
import { getCourseVideoSource } from "@/lib/course-video-source";

const lessonTypes = [
  ["video", "Video"], ["pdf", "PDF"], ["text", "Text"], ["external", "External resource"], ["mixed", "Mixed content"],
];
const sourceTypes = [["upload", "Upload video"], ["youtube", "YouTube"], ["vimeo", "Vimeo"], ["google_drive", "Google Drive"]];

export default function CourseLessonEditor({ course, section, sections, lesson, lessonId, saveAction, deleteAction, duplicateAction, onDraftChange, workspace = false }) {
  const formRef = useCourseFormCapture(onDraftChange);
  const isNew = !lesson;
  const [slug, setSlug] = useState(lesson?.slug || "");
  const slugEdited = useRef(Boolean(lesson?.slug));
  const [lessonType, setLessonType] = useState(lesson?.lessonType || "video");
  const initialSource = lesson?.sourceType || lesson?.videoProvider || "upload";
  const [sourceType, setSourceType] = useState(initialSource);
  const [sourceUrl, setSourceUrl] = useState(lesson?.sourceUrl || lesson?.videoUrl || "");
  const [orientation, setOrientation] = useState(lesson?.orientation || "landscape");
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const parsedSource = useMemo(() => getCourseVideoSource(sourceUrl, sourceType), [sourceUrl, sourceType]);
  const hasVideo = ["video", "mixed"].includes(lessonType);
  const sourceChanged = Boolean(lesson && initialSource !== sourceType);

  function chooseSource(next) {
    if (next === sourceType || formRef.current?.querySelector("[data-course-uploading=true]")) return;
    if (lesson && (lesson.storageKey || lesson.sourceUrl) && !window.confirm("Replace the existing lesson source? The current source remains active until you publish this revision.")) return;
    setSourceType(next);
    setSourceUrl("");
  }

  const previewLesson = parsedSource ? {
    id: lessonId, courseId: course.id, title: lesson?.title || "Lesson preview", sourceType, embedUrl: parsedSource.embedUrl,
    orientation, aspectRatio: orientation === "portrait" ? 9 / 16 : 16 / 9,
    posterUrl: lesson?.posterUrl || parsedSource.posterUrl, posterStorageKey: lesson?.posterStorageKey || "", allowDownload: false,
  } : null;

  return <form ref={formRef} noValidate={workspace} className="admin-form lesson-admin-form" action={workspace ? undefined : saveAction} onSubmit={workspace ? event => { event.preventDefault(); saveAction(); } : undefined}>
    <Input type="hidden" name="id" value={lessonId} /><Input type="hidden" name="newLesson" value={isNew ? "1" : "0"} />
    <Input type="hidden" name="courseId" value={course.id} /><Input type="hidden" name="sectionId" value={section.id} />
    <Input type="hidden" name="sourceType" value={hasVideo ? sourceType : ""} />
    <Input type="hidden" name="sourceId" value={parsedSource?.sourceId || (!sourceChanged ? lesson?.sourceId : "") || ""} />
    <Input type="hidden" name="embedUrl" value={parsedSource?.embedUrl || (!sourceChanged ? lesson?.embedUrl : "") || ""} />
    {sourceChanged && initialSource === "upload" && <Input type="hidden" name="obsoleteStorageKey" value={lesson.storageKey || ""} />}
    {!hasVideo && lesson?.storageKey && <Input type="hidden" name="obsoleteStorageKey" value={lesson.storageKey} />}
    <label>Lesson title<Input name="title" defaultValue={lesson?.title} onChange={event => { if (!slugEdited.current) setSlug(event.target.value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} required /></label>
    <fieldset className="lesson-choice form-wide"><legend>Content type</legend><div>{lessonTypes.map(([value, label]) => <label key={value}><Input type="radio" name="lessonType" value={value} checked={lessonType === value} onChange={() => { if (!formRef.current?.querySelector("[data-course-uploading=true]")) setLessonType(value); }} />{label}</label>)}</div></fieldset>

    {hasVideo && <>
      <fieldset className="lesson-choice form-wide"><legend>How do you want to add this video?</legend><div>{sourceTypes.map(([value, label]) => <label key={value}><Input type="radio" value={value} checked={sourceType === value} onChange={() => chooseSource(value)} />{label}</label>)}</div></fieldset>
      {sourceChanged && <p className="form-warning form-wide">The current source stays attached to the lesson until you publish this revision.</p>}
      {sourceType === "upload" ? <DirectCourseVideoUpload courseId={course.id} lessonId={lessonId} lesson={lesson} /> : <>
        <label className="form-wide">{sourceType === "youtube" ? "YouTube video URL" : sourceType === "vimeo" ? "Vimeo video URL" : "Google Drive share link"}<Input type="url" name="sourceUrl" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={sourceType === "google_drive" ? "https://drive.google.com/file/d/FILE_ID/view" : `https://${sourceType === "vimeo" ? "vimeo.com/…" : "youtube.com/watch?v=…"}`} required={lesson?.status === "published"} />{sourceUrl && <small className={parsedSource ? "field-success" : "form-error"}>{parsedSource ? `${sourceType === "google_drive" ? "Google Drive" : sourceType[0].toUpperCase() + sourceType.slice(1)} source recognised.` : `Enter a valid ${sourceType === "google_drive" ? "Google Drive" : sourceType} video link.`}</small>}</label>
        <label>Orientation<Select name="orientation" value={orientation} onChange={(event) => setOrientation(event.target.value)}><option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option></Select></label>
        <label>Duration in seconds<Input type="number" name="durationSeconds" min="0" defaultValue={lesson?.durationSeconds || 0} /></label>
        {sourceType === "youtube" && <label>Privacy<Select name="privacy" defaultValue={lesson?.privacy || "unlisted"}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></Select></label>}
        <Input type="hidden" name="aspectRatio" value={orientation === "portrait" ? 9 / 16 : 16 / 9} />
        <Input type="hidden" name="processingStatus" value={parsedSource ? "ready" : "failed"} />
        <Input type="hidden" name="videoWidth" value="" /><Input type="hidden" name="videoHeight" value="" />
        {sourceType === "youtube" && <p className="form-warning form-wide">YouTube public and unlisted links can be shared outside this platform. Private videos may not play for students without YouTube permission. Prefer YouTube for free courses and previews.</p>}
        {sourceType === "vimeo" && <p className="form-warning form-wide">For paid courses, configure Vimeo to allow embedding only on aivideocreator.cv. Vimeo privacy restrictions can block playback.</p>}
        {sourceType === "google_drive" && <p className="form-warning form-wide">Make sure the file is shared with the intended audience or set to “Anyone with the link can view.” Drive is suitable for basic delivery, not secure high-performance streaming for a large paid course.</p>}
        {previewLesson && <section className={`lesson-source-preview form-wide is-${previewViewport}`}><div className="preview-toolbar"><strong>Student player preview</strong><span><button type="button" aria-pressed={previewViewport === "desktop"} onClick={() => setPreviewViewport("desktop")}>Desktop</button><button type="button" aria-pressed={previewViewport === "mobile"} onClick={() => setPreviewViewport("mobile")}>Mobile</button></span></div><div className="preview-device"><CourseVideoPlayer lesson={previewLesson} admin /></div><dl className="lesson-preview-facts"><div><dt>Source</dt><dd>{sourceType}</dd></div><div><dt>Aspect ratio</dt><dd>{orientation === "portrait" ? "9:16" : "16:9"}</dd></div><div><dt>Access</dt><dd>{lesson?.isPreview ? "Free preview" : course.isFree ? "Free course" : "Enrolled students"}</dd></div><div><dt>Download</dt><dd>{lesson?.allowDownload ? "Allowed" : "Disabled"}</dd></div></dl></section>}
      </>}
      <details className="cw-options form-wide"><summary>Poster, captions & transcript <small>Optional</small></summary><div className="cw-options-grid"><LessonPosterField courseId={course.id} lessonId={lessonId} lesson={lesson} orientation={orientation} />
      <label>Captions/subtitles URL<Input type="url" name="captionsUrl" defaultValue={lesson?.captionsUrl} placeholder="https://…/captions.vtt" /></label>
      <label className="check-label"><Input type="checkbox" name="allowDownload" defaultChecked={lesson?.allowDownload} />Allow video download</label>
      <label className="form-wide">Transcript<Textarea name="transcript" rows="6" defaultValue={lesson?.transcript} /></label></div></details>
    </>}

    {["text", "mixed"].includes(lessonType) && <label className="form-wide">Lesson text<CourseTextEditor name="body" defaultValue={lesson?.body} /></label>}
    {["external", "mixed"].includes(lessonType) && <label className="form-wide">External resource URL<Input type="url" name="externalUrl" defaultValue={lesson?.externalUrl} placeholder="https://…" /></label>}
    {lessonType === "pdf" && <p className="form-warning form-wide">Upload the private PDF in Downloadable resources below. It will be saved with this draft.</p>}
    {lesson && !workspace && <label>Move to section<Select name="targetSectionId" defaultValue={section.id}>{sections.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</Select></label>}
    <details className="cw-options form-wide"><summary>Lesson details <small>Description & URL</small></summary><div className="cw-options-grid">
    <label>Lesson URL slug<Input name="slug" value={slug} onChange={event => { slugEdited.current = true; setSlug(event.target.value); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
    <label className="form-wide">Short description<CourseTextEditor name="description" rows={3} defaultValue={lesson?.description} /></label>
    </div></details>
    <label>Publishing status<Select name="lessonStatus" defaultValue={lesson?.status || "draft"}><option value="draft">Draft</option><option value="published">Ready to publish</option><option value="archived">Archived</option></Select></label>
    <label className="check-label"><Input type="checkbox" name="isPreview" defaultChecked={lesson?.isPreview} />Free preview lesson</label>
    <div className="lesson-form-actions form-wide"><Button type={workspace ? "button" : "submit"} onClick={workspace ? () => saveAction() : undefined}>{workspace ? "Save draft" : lesson ? "Save lesson" : "Add lesson"}</Button>{lesson && <Button variant="secondary" type={workspace ? "button" : "submit"} formAction={workspace ? undefined : duplicateAction} onClick={workspace ? () => duplicateAction() : undefined}>Duplicate lesson</Button>}{lesson && <Button variant="danger" type={workspace ? "button" : "submit"} formAction={workspace ? undefined : deleteAction} onClick={(event) => { if (!window.confirm("Remove this lesson from the working draft? Existing student progress will be retained.")) event.preventDefault(); else if (workspace) deleteAction(); }}>Remove lesson</Button>}</div>
  </form>;
}

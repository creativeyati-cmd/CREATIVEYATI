"use client";

import { useMemo, useState } from "react";
import CourseVideoPlayer from "@/Components/CourseVideoPlayer";
import DirectCourseVideoUpload from "@/Components/DirectCourseVideoUpload";
import LessonPosterField from "@/Components/LessonPosterField";
import { getCourseVideoSource } from "@/lib/course-video-source";

const lessonTypes = [
  ["video", "Video"], ["pdf", "PDF"], ["text", "Text"], ["external", "External resource"], ["mixed", "Mixed content"],
];
const sourceTypes = [["upload", "Upload video"], ["youtube", "YouTube"], ["vimeo", "Vimeo"], ["google_drive", "Google Drive"]];

export default function CourseLessonEditor({ course, section, sections, lesson, lessonId, saveAction, deleteAction, duplicateAction }) {
  const isNew = !lesson;
  const [lessonType, setLessonType] = useState(lesson?.lessonType || "video");
  const initialSource = lesson?.sourceType || lesson?.videoProvider || "youtube";
  const [sourceType, setSourceType] = useState(initialSource);
  const [sourceUrl, setSourceUrl] = useState(lesson?.sourceUrl || lesson?.videoUrl || "");
  const [orientation, setOrientation] = useState(lesson?.orientation || "landscape");
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const parsedSource = useMemo(() => getCourseVideoSource(sourceUrl, sourceType), [sourceUrl, sourceType]);
  const hasVideo = ["video", "mixed"].includes(lessonType);
  const sourceChanged = Boolean(lesson && initialSource !== sourceType);

  function chooseSource(next) {
    if (next === sourceType) return;
    if (lesson && (lesson.storageKey || lesson.sourceUrl) && !window.confirm("Replace the existing lesson source? The current source remains active until you save successfully.")) return;
    setSourceType(next);
    setSourceUrl("");
  }

  const previewLesson = parsedSource ? {
    id: lessonId, title: lesson?.title || "Lesson preview", sourceType, embedUrl: parsedSource.embedUrl,
    orientation, aspectRatio: orientation === "portrait" ? 9 / 16 : 16 / 9,
    posterUrl: lesson?.posterUrl || parsedSource.posterUrl, posterStorageKey: lesson?.posterStorageKey || "", allowDownload: false,
  } : null;

  return <form className="admin-form lesson-admin-form" action={saveAction}>
    <input type="hidden" name="id" value={lessonId} /><input type="hidden" name="newLesson" value={isNew ? "1" : "0"} />
    <input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="sectionId" value={section.id} />
    <input type="hidden" name="sourceType" value={hasVideo ? sourceType : ""} />
    <input type="hidden" name="sourceId" value={parsedSource?.sourceId || (!sourceChanged ? lesson?.sourceId : "") || ""} />
    <input type="hidden" name="embedUrl" value={parsedSource?.embedUrl || (!sourceChanged ? lesson?.embedUrl : "") || ""} />
    {sourceChanged && initialSource === "upload" && <input type="hidden" name="obsoleteStorageKey" value={lesson.storageKey || ""} />}
    {!hasVideo && lesson?.storageKey && <input type="hidden" name="obsoleteStorageKey" value={lesson.storageKey} />}
    <label>Lesson title<input name="title" defaultValue={lesson?.title} required /></label>
    <label>Lesson slug<input name="slug" defaultValue={lesson?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
    <label className="form-wide">Short description<textarea name="description" rows="2" defaultValue={lesson?.description} /></label>
    <fieldset className="lesson-choice form-wide"><legend>Content type</legend><div>{lessonTypes.map(([value, label]) => <label key={value}><input type="radio" name="lessonType" value={value} checked={lessonType === value} onChange={() => setLessonType(value)} />{label}</label>)}</div></fieldset>

    {hasVideo && <>
      <fieldset className="lesson-choice form-wide"><legend>How do you want to add this video?</legend><div>{sourceTypes.map(([value, label]) => <label key={value}><input type="radio" value={value} checked={sourceType === value} onChange={() => chooseSource(value)} />{label}</label>)}</div></fieldset>
      {sourceChanged && <p className="form-warning form-wide">The current source stays attached to the lesson until this replacement saves successfully.</p>}
      {sourceType === "upload" ? <DirectCourseVideoUpload courseId={course.id} lessonId={lessonId} lesson={lesson} /> : <>
        <label className="form-wide">{sourceType === "youtube" ? "YouTube video URL" : sourceType === "vimeo" ? "Vimeo video URL" : "Google Drive share link"}<input type="url" name="sourceUrl" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={sourceType === "google_drive" ? "https://drive.google.com/file/d/FILE_ID/view" : `https://${sourceType === "vimeo" ? "vimeo.com/…" : "youtube.com/watch?v=…"}`} required={lesson?.status === "published"} />{sourceUrl && <small className={parsedSource ? "field-success" : "form-error"}>{parsedSource ? `${sourceType === "google_drive" ? "Google Drive" : sourceType[0].toUpperCase() + sourceType.slice(1)} source recognised.` : `Enter a valid ${sourceType === "google_drive" ? "Google Drive" : sourceType} video link.`}</small>}</label>
        <label>Orientation<select name="orientation" value={orientation} onChange={(event) => setOrientation(event.target.value)}><option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option></select></label>
        <label>Duration in seconds<input type="number" name="durationSeconds" min="0" defaultValue={lesson?.durationSeconds || 0} /></label>
        {sourceType === "youtube" && <label>Privacy<select name="privacy" defaultValue={lesson?.privacy || "unlisted"}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></label>}
        <input type="hidden" name="aspectRatio" value={orientation === "portrait" ? 9 / 16 : 16 / 9} />
        <input type="hidden" name="processingStatus" value={parsedSource ? "ready" : "failed"} />
        <input type="hidden" name="videoWidth" value="" /><input type="hidden" name="videoHeight" value="" />
        {sourceType === "youtube" && <p className="form-warning form-wide">YouTube public and unlisted links can be shared outside this platform. Private videos may not play for students without YouTube permission. Prefer YouTube for free courses and previews.</p>}
        {sourceType === "vimeo" && <p className="form-warning form-wide">For paid courses, configure Vimeo to allow embedding only on aivideocreator.cv. Vimeo privacy restrictions can block playback.</p>}
        {sourceType === "google_drive" && <p className="form-warning form-wide">Make sure the file is shared with the intended audience or set to “Anyone with the link can view.” Drive is suitable for basic delivery, not secure high-performance streaming for a large paid course.</p>}
        {previewLesson && <section className={`lesson-source-preview form-wide is-${previewViewport}`}><div className="preview-toolbar"><strong>Student player preview</strong><span><button type="button" aria-pressed={previewViewport === "desktop"} onClick={() => setPreviewViewport("desktop")}>Desktop</button><button type="button" aria-pressed={previewViewport === "mobile"} onClick={() => setPreviewViewport("mobile")}>Mobile</button></span></div><div className="preview-device"><CourseVideoPlayer lesson={previewLesson} admin /></div><dl className="lesson-preview-facts"><div><dt>Source</dt><dd>{sourceType}</dd></div><div><dt>Aspect ratio</dt><dd>{orientation === "portrait" ? "9:16" : "16:9"}</dd></div><div><dt>Access</dt><dd>{lesson?.isPreview ? "Free preview" : course.isFree ? "Free course" : "Enrolled students"}</dd></div><div><dt>Download</dt><dd>{lesson?.allowDownload ? "Allowed" : "Disabled"}</dd></div></dl></section>}
      </>}
      <LessonPosterField courseId={course.id} lessonId={lessonId} lesson={lesson} orientation={orientation} />
      <label>Captions/subtitles URL<input type="url" name="captionsUrl" defaultValue={lesson?.captionsUrl} placeholder="https://…/captions.vtt" /></label>
      <label className="check-label"><input type="checkbox" name="allowDownload" defaultChecked={lesson?.allowDownload} />Allow video download</label>
      <label className="form-wide">Transcript<textarea name="transcript" rows="6" defaultValue={lesson?.transcript} /></label>
    </>}

    {["text", "mixed"].includes(lessonType) && <label className="form-wide">Lesson text<textarea name="body" rows="8" defaultValue={lesson?.body} /></label>}
    {["external", "mixed"].includes(lessonType) && <label className="form-wide">External resource URL<input type="url" name="externalUrl" defaultValue={lesson?.externalUrl} placeholder="https://…" /></label>}
    {lessonType === "pdf" && <p className="form-warning form-wide">Save the lesson first, then upload its private PDF in Course materials below.</p>}
    {lesson && <label>Move to section<select name="targetSectionId" defaultValue={section.id}>{sections.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>}
    <label>Status<select name="lessonStatus" defaultValue={lesson?.status || "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
    <label className="check-label"><input type="checkbox" name="isPreview" defaultChecked={lesson?.isPreview} />Free preview lesson</label>
    <div className="lesson-form-actions form-wide"><button className="button">{lesson ? "Save lesson" : "Add lesson"}</button>{lesson && <button type="submit" formAction={duplicateAction}>Duplicate lesson</button>}{lesson && <button type="submit" formAction={deleteAction} onClick={(event) => { if (!window.confirm("Delete this lesson and its resources? This cannot be undone.")) event.preventDefault(); }}>Delete lesson</button>}</div>
  </form>;
}

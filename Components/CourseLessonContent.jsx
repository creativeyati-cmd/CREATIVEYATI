import CourseVideoPlayer from "@/Components/CourseVideoPlayer";

export default function CourseLessonContent({ lesson, admin = false }) {
  const hasVideo = ["video", "mixed"].includes(lesson.lessonType);
  return <div className="lesson-content">
    {lesson.description && <p className="lesson-description">{lesson.description}</p>}
    {hasVideo && <CourseVideoPlayer lesson={lesson} admin={admin} />}
    {lesson.body && <div className="lesson-body">{lesson.body.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
    {lesson.transcript && <details className="lesson-transcript"><summary>Transcript</summary>{lesson.transcript.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</details>}
    {lesson.externalUrl && <p><a className="inline-link" href={lesson.externalUrl} target="_blank" rel="noreferrer">Open lesson resource</a></p>}
  </div>;
}

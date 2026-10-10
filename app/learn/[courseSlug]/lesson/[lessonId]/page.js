import CourseCommunity from "@/Components/CourseCommunity";
import SubmitButton from "@/Components/SubmitButton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CourseLessonContent from "@/Components/CourseLessonContent";
import CourseCurriculum from "@/Components/CourseCurriculum";
import { AdminIcon } from "@/Components/Icons";
import { getEnrolledCourse } from "@/lib/data/courses";
import { markLessonComplete } from "@/app/student-actions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function ResourceList({ title, resources }) {
  if (!resources?.length) return null;
  return <section className="lesson-resources">
    <h2>{title}</h2>
    <ul>{resources.map((resource) => <li key={resource.id}>
      <span className="resource-kind"><AdminIcon name="doc" size={15} /></span>
      <span className="resource-copy"><strong>{resource.title}</strong>{resource.description && <small>{resource.description}</small>}</span>
      <span className="resource-actions">
        <a className="inline-link" href={`/api/learn/resources/${resource.id}`} target="_blank" rel="noreferrer">Open</a>
        {resource.allowDownload && <a href={`/api/learn/resources/${resource.id}?download=1`}>Download</a>}
      </span>
    </li>)}</ul>
  </section>;
}

export default async function LessonPage({ params }) {
  const { courseSlug, lessonId } = await params;
  const { user, course, progress } = await getEnrolledCourse(courseSlug);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/learn/${courseSlug}/lesson/${lessonId}`)}`);
  if (!course) notFound();
  const lessons = course.sections.flatMap((section) => section.lessons);
  const index = lessons.findIndex((item) => item.id === lessonId);
  if (index < 0) notFound();
  const progressRow = progress.find((item) => item.lesson_id === lessonId);
  const lesson = { ...lessons[index], lastPosition: Number(progressRow?.last_position) || 0 };
  if (!progressRow) await createSupabaseServiceClient().from("lesson_progress").upsert({ student_id: user.id, course_id: course.id, lesson_id: lesson.id, last_position: 0, completed: false, updated_at: new Date().toISOString() }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true });
  const completed = Boolean(progressRow?.completed);
  const progressIds = progress.filter((item) => item.completed && lessons.some((lesson) => lesson.id === item.lesson_id)).map((item) => item.lesson_id);
  const percentage = lessons.length ? Math.round(progressIds.length / lessons.length * 100) : 0;
  const activeSection = course.sections.find((section) => section.lessons?.some((item) => item.id === lessonId));
  const watermark = [user?.user_metadata?.full_name, user?.email].filter(Boolean).join(" · ");

  return <section className="course-player-layout">
    <aside className="curriculum-drawer">
      <input type="checkbox" id="curriculum-drawer-toggle" className="drawer-toggle" />
      <label className="drawer-summary" htmlFor="curriculum-drawer-toggle">Course curriculum · {percentage}% complete</label>
      <div className="drawer-body">
        <div className="curriculum-sidebar-head">
          <Link className="inline-link" href="/learn">My learning</Link>
          <h2>{course.title}</h2>
          <div className="sidebar-progress">
            <span className="progress-track"><i style={{ width: `${percentage}%` }} /></span>
            <small>{progressIds.length} of {lessons.length} lessons complete · {percentage}%</small>
          </div>
        </div>
        <CourseCurriculum key={lesson.id} sections={course.sections} courseSlug={courseSlug} variant="sidebar" enrolled activeLessonId={lesson.id} progressIds={progressIds} defaultOpenId={activeSection?.id} />
      </div>
    </aside>
    <article className="active-lesson">
      <p className="eyebrow">{activeSection ? `${course.title} · ${activeSection.title}` : course.title}</p>
      <h1>{lesson.title}</h1>
      <CourseLessonContent lesson={lesson} watermark={watermark} />
      <ResourceList title="Lesson materials" resources={lesson.resources} />
      <ResourceList title="Course materials" resources={course.materials} />
      <CourseCommunity courseId={course.id} />
      <div className="lesson-progress-line">
        <span className="progress-track"><i style={{ width: `${percentage}%` }} /></span>
        <small>Lesson {index + 1} of {lessons.length} · {percentage}% complete</small>
      </div>
      <div className="lesson-controls">
        {index > 0 ? <Link className="lesson-nav is-prev" href={`/learn/${course.slug}/lesson/${lessons[index - 1].id}`}>← Previous lesson</Link> : <span />}
        <form action={markLessonComplete}>
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="courseSlug" value={course.slug} />
          <input type="hidden" name="lessonId" value={lesson.id} />
          <SubmitButton className="button" pendingLabel="Saving progress..." disabled={completed}>{completed ? "Completed" : "Mark complete"}</SubmitButton>
        </form>
        {index < lessons.length - 1 ? <Link className="lesson-nav is-next" href={`/learn/${course.slug}/lesson/${lessons[index + 1].id}`}>Next lesson →</Link> : <span />}
      </div>
    </article>
  </section>;
}

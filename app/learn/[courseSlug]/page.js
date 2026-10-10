import { notFound, redirect } from "next/navigation";
import { getEnrolledCourse } from "@/lib/data/courses";
export default async function EnrolledCoursePage({ params }) {
  const { courseSlug } = await params;
  const { user, course, progress } = await getEnrolledCourse(courseSlug);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/learn/${courseSlug}`)}`);
  if (!course) notFound();
  const lessons = course.sections.flatMap((section) => section.lessons);
  if (!lessons.length) return <section className="lesson-page public-note"><h1>{course.title}</h1><p>No lessons have been published yet.</p></section>;
  const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.lesson_id));
  const firstIncomplete = () => lessons.find((lesson) => !completedIds.has(lesson.id)) || null;
  // resume from the most recently viewed lesson, then fall back to the first incomplete one
  const viewed = progress.slice().sort((a, b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0))[0];
  const viewedIndex = viewed ? lessons.findIndex((lesson) => lesson.id === viewed.lesson_id) : -1;
  let target = null;
  if (viewedIndex >= 0) {
    target = viewed.completed ? lessons.slice(viewedIndex + 1).find((lesson) => !completedIds.has(lesson.id)) || firstIncomplete() || lessons[viewedIndex] : lessons[viewedIndex];
  }
  target = target || firstIncomplete() || lessons[0];
  redirect(`/learn/${courseSlug}/lesson/${target.id}`);
}

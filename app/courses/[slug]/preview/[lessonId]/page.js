import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import CourseLessonContent from "@/Components/CourseLessonContent";
import { getSiteContent } from "@/lib/data/site";
import { getPublicCourse } from "@/lib/data/courses";
import { getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";
export default async function PreviewLessonPage({ params }) { const { slug, lessonId } = await params; const [course, site] = await Promise.all([getPublicCourse(slug), getSiteContent()]); const lesson = course?.sections.flatMap((section) => section.lessons).find((item) => item.id === lessonId && item.isPreview); if (!course || !lesson) notFound(); const user = await getStudentUser(); const service = createSupabaseServiceClient(); const { data: enrolment } = user && service ? await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", course.id).eq("active", true).maybeSingle() : { data: null }; return <main className="public-page"><PublicHeader site={site} current="/courses" /><article className="lesson-page public-note"><Link className="inline-link" href={`/courses/${course.slug}`}>Back to course</Link><p className="eyebrow">FREE PREVIEW</p><h1 className="page-title">{lesson.title}</h1><CourseLessonContent lesson={lesson} />{enrolment ? <Link className="button" href={`/learn/${course.slug}`}>Continue learning</Link> : <Link className="button" href={`/checkout/${course.id}`}>Get the complete course</Link>}</article></main>; }

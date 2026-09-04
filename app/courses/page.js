import PublicHeader from "@/Components/PublicHeader";
import PublicFooter from "@/Components/PublicFooter";
import PublicTextReveal from "@/Components/PublicTextReveal";
import CourseCard from "@/Components/CourseCard";
import { getSiteContent } from "@/lib/data/site";
import { getPublishedCourses } from "@/lib/data/courses";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "Courses", description: "Learn visual storytelling and video production." };
export default async function CoursesPage() { const [site, courses, socialLinks] = await Promise.all([getSiteContent(), getPublishedCourses(), getPublicSocialLinks()]); return <main className="public-page"><PublicHeader site={site} current="/courses" /><section className="courses-page public-note"><PublicTextReveal><p className="eyebrow" data-reveal>COURSES</p><h1 className="page-title" data-reveal>Learn the process behind the work.</h1><p className="public-lede" data-reveal>Practical lessons in direction, production and disciplined editing.</p></PublicTextReveal>{courses.length ? <div className="course-grid">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <p className="empty-state">No courses are published yet.</p>}</section><PublicFooter site={site} socialLinks={socialLinks} /></main>; }

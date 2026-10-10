import { notFound } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import PublicFooter from "@/Components/PublicFooter";
import CourseOverview from "@/Components/CourseOverview";
import { getSiteContent } from "@/lib/data/site";
import { getPublicCourse, getStudentCourseAccess, coursePrice, formatMoney } from "@/lib/data/courses";
import { getPublicSocialLinks } from "@/lib/data/social";

export async function generateMetadata({ params }) { const { slug } = await params; const course = await getPublicCourse(slug); return course ? { title: course.seoTitle || course.title, description: course.seoDescription || course.shortDescription, openGraph: { images: course.ogImageUrl || course.coverImageUrl ? [course.ogImageUrl || course.coverImageUrl] : [] } } : {}; }

export default async function CoursePage({ params }) {
  const { slug } = await params;
  const [course, site, socialLinks] = await Promise.all([getPublicCourse(slug), getSiteContent(), getPublicSocialLinks()]);
  if (!course) notFound();
  const price = coursePrice(course);
  const access = await getStudentCourseAccess(course.id);
  const priceLabel = price === 0 ? "Free" : formatMoney(price, course.currency);
  return <main className="public-page"><PublicHeader site={site} current="/courses" />
    <CourseOverview course={course} price={price} priceLabel={priceLabel} instructorName={site.creatorName} access={access} />
  <PublicFooter site={site} socialLinks={socialLinks} /></main>;
}

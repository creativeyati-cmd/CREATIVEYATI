import Link from "next/link";
import CarouselSection from "@/Components/CarouselSection";
import PublicHeader from "@/Components/PublicHeader";
import { getPublicPortfolio } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";
import { getCourseSettings } from "@/lib/data/settings";
import { getPublishedCourses } from "@/lib/data/courses";
import { getPublicSocialLinks } from "@/lib/data/social";
import CourseCard from "@/Components/CourseCard";
import PublicFooter from "@/Components/PublicFooter";

export default async function Home() {
  const [{ videos, error }, site, courseSettings, socialLinks] = await Promise.all([getPublicPortfolio(), getSiteContent(), getCourseSettings(), getPublicSocialLinks()]);
  const courses = courseSettings.homepageEnabled ? await getPublishedCourses({ featured: true, limit: courseSettings.homepageLimit }) : [];
  const heading = site.heroHeading.split(site.highlightWord);
  return <main className="portfolio-home"><section className="hero-work" style={{ "--site-accent": site.accentColor }}><PublicHeader site={site} current="/" />{error ? <p className="empty-state">{error}</p> : videos.length ? <CarouselSection projects={videos} showMetadata={false} /> : <p className="empty-state">No published work yet.</p>}<section className="hero-statement"><h1>{heading[0]}<em>{site.highlightWord}</em>{heading.slice(1).join(site.highlightWord)}</h1><p>{site.heroCopy}</p><Link className="button" href="/contact">{site.ctaLabel}</Link></section></section>{courses.length > 0 && <section className="home-courses"><p className="eyebrow">LEARN</p><h2>{courseSettings.homepageHeading}</h2><p>{courseSettings.homepageCopy}</p><div className="course-grid">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div><Link className="inline-link" href="/courses">View all courses</Link></section>}<PublicFooter site={site} socialLinks={socialLinks} /></main>;
}

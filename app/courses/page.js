import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import PublicFooter from "@/Components/PublicFooter";
import CourseCard from "@/Components/CourseCard";
import CourseCatalog from "@/Components/CourseCatalog";
import { getSiteContent } from "@/lib/data/site";
import { getPublishedCourses } from "@/lib/data/courses";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "Courses", description: "Practical courses in AI filmmaking, visual storytelling and video production." };
export default async function CoursesPage() {
  const [site, courses, socialLinks] = await Promise.all([getSiteContent(), getPublishedCourses(), getPublicSocialLinks()]);
  const featured = courses.find(course => course.featured) || courses[0];
  return <main className="public-page learning-store"><PublicHeader site={site} current="/courses"/>
    <div className="learning-container">
      <section className="catalog-hero">
        <div className="catalog-intro"><p className="eyebrow">AI VIDEO CREATOR / THE ACADEMY</p>
          <h1>Big ideas.<br/>Real skills.<br/><em>Your next chapter.</em></h1>
          <p>Go from imagining the scene to creating it. Explore practical courses in AI filmmaking, direction and visual storytelling.</p>
          <a href="#course-library" className="button">Find your course <span aria-hidden="true">&darr;</span></a>
          <div className="catalog-disciplines"><span>CREATE</span><span>DIRECT</span><span>TELL YOUR STORY</span></div>
        </div>
        {featured ? <div className="catalog-spotlight"><div className="spotlight-label"><span>COURSE SPOTLIGHT</span><span aria-hidden="true">01 /</span></div><CourseCard course={featured}/></div>
          : <div className="catalog-placeholder"><span>THE NEXT<br/>CHAPTER<br/>IS YOURS.</span><Link href="/academy">Explore the academy &rarr;</Link></div>}
      </section>
      <section id="course-library" className="catalog-library"><div className="catalog-section-heading"><div><p className="eyebrow">MAKE SOMETHING THAT MATTERS</p><h2>Find your creative direction.</h2></div><p>Choose a course. Build your skills.<br/>Bring your own perspective.</p></div>
        <CourseCatalog courses={courses.map(course=>({id:course.id,title:course.title,category:course.category||"Creative practice",description:course.shortDescription}))}>
          {courses.map(course=><CourseCard key={course.id} course={course}/>)}
        </CourseCatalog>
      </section>
      <section className="catalog-support"><div><p className="eyebrow">A LITTLE GUIDANCE?</p><h2>Let&apos;s find your starting point.</h2><p>Tell us what you want to create. We&apos;ll help you choose where to begin.</p></div><Link className="button button-secondary" href="/contact">Talk to us &rarr;</Link></section>
    </div><PublicFooter site={site} socialLinks={socialLinks}/></main>;
}

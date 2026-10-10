import Image from "next/image";
import Link from "next/link";
import AcademyHeader from "@/Components/AcademyHeader";
import AcademyMarquee from "@/Components/AcademyMarquee";
import PublicFooter from "@/Components/PublicFooter";
import { coursePrice, formatMoney, getPublishedCourses } from "@/lib/data/courses";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";
import { getStudentUser } from "@/lib/supabase/server";
import "./academy.css";

const origin = "https://aivideocreator.cv";
export const metadata = {
  title: { absolute: "AI Video Courses & Training | Idayat Ibrahim Academy" },
  description: "Learn AI video creation, prompting, visual storytelling and editing with Idayat Ibrahim, an AI Video Creator and AI Tutor based in Nigeria. Explore practical online courses for creators and brands.",
  alternates: { canonical: `${origin}/academy` },
  openGraph: { title: "AI VIDEO CREATOR Academy | Learn with Idayat Ibrahim", description: "From your first prompt to your final film. Practical AI video creation and editing courses.", url: `${origin}/academy` },
};
const skills = ["AI image generation", "AI video generation", "Visual storytelling", "Prompting", "Video editing", "Sound design"];
const steps = [
  { title: "Start with a story.", body: "Find the idea, understand the brief and plan the shots that will bring your message to life.", tag: "CONCEPT & DIRECTION" },
  { title: "Create with intention.", body: "Explore prompting, AI image generation and AI video generation to turn your vision into moving images.", tag: "PROMPT & GENERATE" },
  { title: "Make the final cut.", body: "Shape your footage through editing, pacing and sound design. Give every frame a reason to be there.", tag: "EDIT & FINISH" },
];
const faqs = [
  ["Who is the Academy for?", "Creators, video editors, business owners and visual storytellers who want to explore AI-assisted video production. Check each course for its level and requirements before enrolling."],
  ["What will I learn?", "The Academy focuses on AI image and video generation, prompting, visual storytelling, editing, sound design and commercial video production. Each course page lists its own modules and learning outcomes."],
  ["How do I enrol?", "Choose a course, review its curriculum and create an account. Verify your email, then complete checkout. Your enrolled courses appear in your learning dashboard."],
  ["Can I learn at my own pace?", "Recorded lessons let you work through the course in your own time. Review the course details for its access terms, included materials and software requirements."],
  ["Will I receive a certificate?", "Complete the required lessons to receive your course completion certificate. You can download it from your dashboard and share its public verification link."],
  ["Which tools do I need, and are they included?", "Tool requirements depend on the course. Check its requirements before purchasing; third-party software may require a separate subscription. Contact us if you need help choosing."],
];
function Arrow() { return <span aria-hidden="true">↗</span>; }

export default async function AcademyPage() {
  const [site, socialLinks, courses, user] = await Promise.all([getSiteContent(), getPublicSocialLinks(), getPublishedCourses(), getStudentUser()]);
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Person", "@id": `${origin}/#idayat-ibrahim`, name: "Idayat Ibrahim", url: `${origin}/about`, jobTitle: "AI Video Creator, AI Video Editor and AI Tutor", description: "AI Video Creator, Video Editor, Visual Storyteller and AI Tutor based in Nigeria, working with brands and creators worldwide.", homeLocation: { "@type": "Country", name: "Nigeria" }, knowsAbout: skills },
    { "@type": "EducationalOrganization", "@id": `${origin}/academy#organization`, name: "AI VIDEO CREATOR Academy", alternateName: "Idayat Ibrahim Academy", url: `${origin}/academy`, founder: { "@id": `${origin}/#idayat-ibrahim` } },
    ...courses.map(course => ({ "@type": "Course", "@id": `${origin}/courses/${course.slug}#course`, name: course.title, description: course.shortDescription || undefined, url: `${origin}/courses/${course.slug}`, provider: { "@id": `${origin}/academy#organization` } })),
  ] };
  return <main className="public-page academy-scope academy-redesign">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <div className="avc-top">
      <AcademyHeader site={{ ...site, creatorName: "AI VIDEO CREATOR" }} current="/academy" signedIn={Boolean(user)} />
      <section className="avc-hero" aria-labelledby="academy-heading">
        <p className="avc-kicker"><span /> THE NEXT CHAPTER OF YOUR CREATIVITY</p>
        <h1 id="academy-heading">Big ideas.<br />Extraordinary <em>possibilities.</em></h1>
        <p className="avc-intro">Learn to turn your imagination into AI-powered films, product ads and stories worth watching. Create with purpose. Learn with Idayat Ibrahim.</p>
        <div className="avc-actions"><Link className="avc-button" href="#courses">Explore the courses <Arrow /></Link><Link className="avc-text-link" href="#how-it-works">See how you’ll learn <span aria-hidden="true">↓</span></Link></div>
        <div className="avc-hero-stage">
          <div className="avc-scene avc-scene-left"><Image src="/img4.png" alt="A close-up product composition of a metallic control dial" fill sizes="(max-width: 700px) 30vw, 250px" /><span>THE DETAIL</span></div>
          <div className="avc-scene avc-scene-main"><Image src="/img8.png" alt="A cinematic fashion composition against a deep red background" fill priority sizes="(max-width: 700px) 75vw, 650px" /><div className="avc-frame-label"><span><i /> YOUR VISION, IN MOTION</span><span>01 / 03</span></div><span className="avc-scene-caption">From a spark.<br />To a story.</span></div>
          <div className="avc-scene avc-scene-right"><Image src="/img1.png" alt="An editorial portrait exploring light, texture and styling" fill sizes="(max-width: 700px) 30vw, 240px" /><span>THE PERSPECTIVE</span></div>
          <div className="avc-hero-note"><span className="avc-note-star" aria-hidden="true">✳</span><strong>Human imagination.<br />AI possibilities.</strong><p>The tools are new.<br />The story is yours.</p></div>
          <p className="avc-stage-foot">A space to explore what you can create.</p>
        </div>
      </section>
    </div>
    <AcademyMarquee />
    <section className="avc-section avc-about" id="instructor">
      <div className="avc-about-image"><Image src="/idayat-ibrahim.jpg" alt="Idayat Ibrahim, AI video creator and Academy instructor" fill sizes="(max-width: 700px) 100vw, 380px" style={{ objectPosition: "50% 20%" }} /><span>IDEAS DESERVE TO BE SEEN.</span></div>
      <div className="avc-about-copy"><p className="avc-label">MEET YOUR INSTRUCTOR</p><h2>A creator’s eye.<br />A teacher’s heart.</h2><p>Idayat Ibrahim is an AI Video Creator, AI Video Editor, Visual Storyteller and AI Tutor based in Nigeria.</p><p>She creates AI-powered commercials, product videos, UGC-style content and branded films for businesses and creators in Nigeria and worldwide. Here, she shares the thinking behind the work — from the first prompt to the final edit.</p><Link className="avc-button" href="/about">More about Idayat <Arrow /></Link></div>
      <aside className="avc-about-note"><span aria-hidden="true">↗</span><h3>Make more than<br />a good-looking video.</h3><p>Build the skills to tell a clear story, shape an idea and create with intention.</p><div>NIGERIA BASED<br />OPEN TO THE WORLD</div></aside>
    </section>
    <section className="avc-learning" id="how-it-works"><div className="avc-section"><div className="avc-section-head"><div><p className="avc-label">FROM CURIOUS TO CREATING</p><h2>Your ideas.<br />A whole new skill set.</h2></div><p>Learn the creative process behind AI video production. Bring your curiosity; build your confidence one step at a time.</p></div><div className="avc-step-grid">{steps.map((step,index) => <article key={step.title}><div className="avc-step-number">0{index+1}<Arrow /></div><p className="avc-label">{step.tag}</p><h3>{step.title}</h3><p>{step.body}</p></article>)}</div><div className="avc-skill-tags">{skills.map(skill => <span key={skill}>{skill}</span>)}</div></div></section>
    <section className="avc-section avc-courses" id="courses"><div className="avc-section-head"><div><p className="avc-label">FIND YOUR NEXT CHAPTER</p><h2>Small steps.<br />Real creative progress.</h2></div><Link className="avc-text-link" href="/courses">View all courses <Arrow /></Link></div>
      {courses.length ? <div className="avc-course-grid">{courses.map(course => <article className="avc-course-card" key={course.id}><Link href={`/courses/${course.slug}`} className="avc-course-image">{course.coverImageUrl ? <Image src={course.coverImageUrl} alt={course.title} fill unoptimized sizes="(max-width: 700px) 100vw, 400px" style={{ objectPosition: `${course.coverFocalX}% ${course.coverFocalY}%` }} /> : <span className="avc-course-art" aria-hidden="true">PLAY.<br />CREATE.<br />REPEAT.</span>}<span className="avc-course-level">{course.difficulty}</span></Link><div className="avc-course-body"><p className="avc-label">{course.category || "AI VIDEO CREATION"}</p><h3><Link href={`/courses/${course.slug}`}>{course.title}</Link></h3><p>{course.shortDescription}</p><div><strong>{course.isFree ? "Free" : formatMoney(coursePrice(course),course.currency)}</strong><Link href={`/courses/${course.slug}`} aria-label={`Explore ${course.title}`}>Explore course <Arrow /></Link></div></div></article>)}</div> : <div className="avc-course-empty"><span aria-hidden="true">✳</span><div><h3>Your next creative chapter is coming.</h3><p>No courses are available to browse right now. Get in touch about AI video training and we’ll help you find your next step.</p></div><Link className="avc-button" href="/contact">Ask about training <Arrow /></Link></div>}
    </section>
    <section className="avc-section avc-faq" id="questions"><div><p className="avc-label">A LITTLE CLARITY</p><h2>Curious?<br />You’re in the right place.</h2><p>Have something else in mind?</p><Link className="avc-text-link" href="/contact">Let’s talk <Arrow /></Link></div><div>{faqs.map(([question,answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="avc-final"><p className="avc-label">YOUR NEXT GREAT IDEA STARTS HERE</p><h2>Imagine it.<br /><em>Learn to create it.</em></h2><Link className="avc-button" href="#courses">Find your course <Arrow /></Link><span className="avc-final-mark" aria-hidden="true">✳</span></section>
    <PublicFooter site={{...site,creatorName:"AI VIDEO CREATOR Academy"}} socialLinks={socialLinks} />
  </main>;
}

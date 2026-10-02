import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import PublicFooter from "@/Components/PublicFooter";
import { formatMoney } from "@/lib/data/courses";
import { getPublishedCourses } from "@/lib/data/courses";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = {
  title: "Academy — learn to make commercials people watch",
  description: "A self-paced course that takes you from a brand brief to a finished, commercial-grade film.",
};

// ---- copy below is placeholder text ----
// every string in this block is meant to be rewritten. it is deliberately kept
// in one place so editing the page never means hunting through markup.
const copy = {
  eyebrow: "IDAYAT ACADEMY",
  headline: "Learn to make commercials people actually watch.",
  description: "A self-paced course that takes you from a brand brief to a finished, commercial-grade film. AI does the heavy production work; you stay in charge of the story. You finish with a 15-second commercial you can put in front of a client.",
  primaryCta: "Enrol now",
  secondaryCta: "See the curriculum",
  trustPoints: ["12 lessons", "3+ hours of instruction", "Lifetime access", "Certificate on completion"],
  deliverableTitle: "What you walk away with",
  deliverableBody: "One finished 15-second commercial — written, generated, edited and sound-designed by you, built from a real brief instead of a demo idea.",
  includes: [
    "12 recorded lessons you can watch at your own pace",
    "Lifetime access, including future updates to the course",
    "Downloadable brief templates, shot lists and edit checklists",
    "One brief worked end to end as a full example",
    "Certificate of completion with a public verification link",
  ],
  notForYou: [
    "You want a shortcut that skips the story work — the tools are the easy part here.",
    "You are looking for a live cohort with weekly deadlines. This course is self-paced.",
    "You expect to shoot on set. This is built around AI generation plus editing.",
    "You want a software tutorial. This teaches decisions, not button locations.",
  ],
  faqs: [
    { question: "How long does it take to finish?", answer: "Most students work through it in two to three weeks at a few hours a week. Nothing expires, so you can take longer." },
    { question: "Do I need experience with AI tools?", answer: "No. Every tool is introduced in context. If you can edit basic video, you are ready." },
    { question: "Which software do I need?", answer: "An AI image or video generator, an editor and a way to record audio. The lessons focus on decisions that carry across tools." },
    { question: "Is it really self-paced?", answer: "Yes. Every lesson is available as soon as you enrol, and access does not expire." },
    { question: "How does the certificate work?", answer: "Finish every lesson and a certificate is issued to your dashboard with a public verification link you can share." },
    { question: "What if it is not for me?", answer: "Placeholder — set your refund window here before launch, for example a 7-day refund with no questions asked." },
  ],
};

// tolerant of minor shape differences between list and detail course objects
function priceLabel(course) {
  if (course.isFree || course.is_free) return "Free";
  const minor = Number(course.priceMinor ?? course.price_minor ?? 0);
  if (!minor) return "Free";
  return formatMoney(minor, course.currency || "NGN");
}

export default async function AcademyPage() {
  const [site, socialLinks, courses] = await Promise.all([getSiteContent(), getPublicSocialLinks(), getPublishedCourses()]);

  return <main className="public-page">
    <PublicHeader site={site} current="/academy" />

    <section className="academy-hero">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.headline}</h1>
      <p className="academy-lede">{copy.description}</p>
      <div className="academy-actions">
        <Link className="button" href="/courses">{copy.primaryCta}</Link>
        <Link className="button button-secondary" href="#curriculum">{copy.secondaryCta}</Link>
      </div>
      <ul className="academy-trust">{copy.trustPoints.map((point) => <li key={point}>{point}</li>)}</ul>
    </section>

    <section className="academy-section">
      <p className="academy-note">Placeholder copy — every string on this page sits in the copy block at the top of app/academy/page.js</p>
      <h2>{copy.deliverableTitle}</h2>
      <p>{copy.deliverableBody}</p>
    </section>

    <section className="academy-section" id="curriculum">
      <p className="eyebrow">CURRICULUM</p>
      <h2>Every course in the academy.</h2>
      <p>Enrol once and keep access for life. Each course is self-paced and finishes with a certificate you can verify publicly.</p>
      {courses.length ? <div className="academy-grid">{courses.map((course) => <article className="academy-card" key={course.id || course.slug}>
        <h3>{course.title}</h3>
        {(course.shortDescription || course.short_description) && <p>{course.shortDescription || course.short_description}</p>}
        <p className="academy-price">{priceLabel(course)}</p>
        <Link className="inline-link" href={`/courses/${course.slug}`}>See what is inside</Link>
      </article>)}</div> : <p>Courses are being prepared. Check back shortly, or get in touch to be told when the first one opens.</p>}
      <h2 style={{ marginTop: "56px" }}>What is included</h2>
      <ul className="academy-list">{copy.includes.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>

    <section className="academy-section">
      <p className="eyebrow">HONESTLY</p>
      <h2>This is not for everyone.</h2>
      <ul className="academy-list">{copy.notForYou.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>

    <section className="academy-section">
      <p className="eyebrow">QUESTIONS</p>
      <h2>The things people ask first.</h2>
      <div className="academy-faq">{copy.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
    </section>

    <section className="academy-cta">
      <h2>{copy.headline}</h2>
      <div className="academy-actions">
        <Link className="button" href="/courses">{copy.primaryCta}</Link>
        <Link className="button button-secondary" href="/contact">Ask a question first</Link>
      </div>
    </section>

    <PublicFooter site={site} socialLinks={socialLinks} />
  </main>;
}

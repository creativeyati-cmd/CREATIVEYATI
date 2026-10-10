import { Fragment } from "react";
import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import CourseCard from "@/Components/CourseCard";
import PublicFooter from "@/Components/PublicFooter";
import Showreel from "@/Components/Showreel";
import { getPublicPortfolio } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";
import { getCourseSettings } from "@/lib/data/settings";
import { getPublishedCourses } from "@/lib/data/courses";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = {
  title: { absolute: "Idayat Ibrahim | AI Video Creator, Video Editor & AI Tutor in Nigeria" },
  description: "Idayat Ibrahim is an AI Video Creator, AI Video Editor, Visual Storyteller and AI Tutor based in Nigeria, creating AI commercials, product ads, UGC-style videos and branded content for clients worldwide.",
  alternates: { canonical: "https://aivideocreator.cv/" },
};

// The home page leads with the studio hero. The WebGL carousel is deliberately
// not mounted here; its engine is untouched and still available where it is used.
//
// The gallery drifts left continuously like the carousel did. The strip is
// rendered twice and the track translates by exactly half its width, so the loop
// is seamless. Cards share a height and retain each image's aspect ratio.
const WASHES = [
  "linear-gradient(170deg, #cdc7bd 0%, #8f877c 100%)",
  "linear-gradient(170deg, #d7d2c8 0%, #a49c90 100%)",
  "linear-gradient(170deg, #c6c9c4 0%, #878d86 100%)",
  "linear-gradient(170deg, #d9d4cc 0%, #9c948a 100%)",
  "linear-gradient(170deg, #c9c4bb 0%, #8b8478 100%)",
  "linear-gradient(170deg, #d3cec5 0%, #9d968a 100%)",
  "linear-gradient(170deg, #c4bfb6 0%, #857f75 100%)",
];

// the schema has changed hands a few times, so accept whichever image field a
// project actually carries rather than assuming one
function stillFor(video) {
  return video?.posterUrl || video?.poster_url || video?.thumbnailUrl || video?.thumbnail_url || video?.imageUrl || video?.image_url || video?.src || video?.url || "";
}

// Each word rises on its own delay, so the headline assembles rather than
// appearing as a block. `base` is seconds from page load.
function Words({ text, base }) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  return words.map((word, i) => (
    <Fragment key={`${word}-${i}`}>
      <span className="lh-word" style={{ animationDelay: `${Math.round((base + i * 0.045) * 1000)}ms` }}>{word}</span>
      {i < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

// The rotating keyword sits in the CMS highlight-word slot, so the heading
// stays editable: "I turn brand ideas into [Videos] people want to watch."
const ROTATING = ["Videos", "Commercials", "Films", "Campaigns", "Content"];

function headlineSides(text, highlight) {
  const marker = String(highlight || "").trim();
  const source = String(text || "");
  if (!marker || !source.includes(marker)) {
    const words = source.split(/\s+/).filter(Boolean);
    const cut = Math.max(1, Math.round(words.length / 3));
    return { before: words.slice(0, cut).join(" "), after: words.slice(cut).join(" ") };
  }
  const [before = "", ...rest] = source.split(marker);
  return { before: before.trim(), after: rest.join(marker).trim() };
}

export default async function Home() {
  const [{ videos, error }, site, courseSettings, socialLinks] = await Promise.all([getPublicPortfolio(), getSiteContent(), getCourseSettings(), getPublicSocialLinks()]);
  const courses = courseSettings.homepageEnabled ? await getPublishedCourses({ featured: true, limit: courseSettings.homepageLimit }) : [];

  const { before, after } = headlineSides(site.heroHeading, site.highlightWord);
  // entrance order: prefix words, then the rotator, then the tail
  const rotatorBase = 0.14 + (before ? before.split(/\s+/).length : 0) * 0.045 + 0.04;
  const afterBase = rotatorBase + 0.07;
  // every published project drifts past, not a selection of them: upload more
  // and they join the loop without a code change
  const cards = videos || [];

  // the showreel leads with real work; local/empty catalogues still need a frame
  const reelStill = stillFor(cards[0]) || "/img12.jpg";
  const reelAlt = cards[0]?.title || "AI commercial showreel still";
  const floatA = stillFor(cards[1]) || "/img3.png";
  const floatB = stillFor(cards[2]) || "/img11.png";

  function Card({ video, index, keyPrefix }) {
    const still = stillFor(video);
    return <figure
      className="lh-card"
      key={`${keyPrefix}-${video.id || index}`}
    >
      {still
        ? <img src={still} alt={video.title || "Studio work"} loading="lazy" />
        : <span className="lh-card-wash" style={{ background: WASHES[index % WASHES.length] }} />}
    </figure>;
  }

  return <main className="portfolio-home">
    <section className="hero-work" style={{ "--site-accent": site.accentColor }}>
      <PublicHeader site={site} current="/" />

      <section className="lh-hero">
        <div className="lh-hero-grid">
          <div className="lh-hero-copy">
            <p className="lh-badge"><span className="lh-badge-dot" aria-hidden="true" />AI VIDEO CREATOR · VIDEO EDITOR · AI TUTOR</p>
            <h1 className="lh-headline" aria-label={`${before} ${ROTATING[0]} ${after}`}>
              {/* the keyword owns its line: nothing follows it, so the fixed
                  width never shows as a gap and no sibling can be pushed */}
              <span className="lh-line"><Words text={before} base={0.14} /></span>
              <span className="lh-line">
                <span className="lh-rotator" aria-hidden="true" style={{ animationDelay: `${Math.round(rotatorBase * 1000)}ms` }}>
                  {ROTATING.map((word, i) => (
                    <span className="lh-rot-word" style={{ animationDelay: `${i * 2}s` }} key={word}>{word}</span>
                  ))}
                </span>
              </span>
              <span className="lh-line"><Words text={after} base={afterBase} /></span>
            </h1>
            <p className="lh-lede">Idayat Ibrahim is an AI video creator and editor based in Nigeria, creating AI commercials, product films, UGC-style content and branded campaigns for clients worldwide.</p>
            <div className="lh-actions">
              <Link className="lh-btn lh-btn-primary" href="/work">View Selected Work</Link>
              <Link className="lh-btn lh-btn-secondary" href="/contact">Let&apos;s Work Together <span aria-hidden="true">↗</span></Link>
            </div>
            <p className="lh-cred">Commercials · Product Films · UGC · Campaigns</p>
          </div>

          <div className="lh-hero-media">
            <span className="lh-float lh-float-a" aria-hidden="true"><img src={floatA} alt="" /></span>
            <span className="lh-float lh-float-b" aria-hidden="true"><img src={floatB} alt="" /></span>
            <Showreel still={reelStill} alt={reelAlt} />
          </div>
        </div>
      </section>

      {error ? <p className="empty-state">{error}</p> : null}

      {cards.length ? <section className="lh-gallery" aria-label="Selected work">
        {/* duration scales with the count so the drift speed stays the same as
            the catalogue grows, rather than accelerating */}
        <div className="lh-marquee" style={{ "--marquee-duration": `${Math.max(30, cards.length * 6)}s` }}>
          <div className="lh-strip">
            {cards.map((video, index) => <Card keyPrefix="a" video={video} index={index} key={`a-${video.id || index}`} />)}
          </div>
          {/* the second copy is what makes the loop seamless; hidden from readers */}
          <div className="lh-strip" aria-hidden="true">
            {cards.map((video, index) => <Card keyPrefix="b" video={video} index={index} key={`b-${video.id || index}`} />)}
          </div>
        </div>
      </section> : <p className="empty-state">No published work yet.</p>}
    </section>

    {courses.length > 0 && <section className="home-courses">
      <p className="eyebrow">LEARN</p><h2>{courseSettings.homepageHeading}</h2><p>{courseSettings.homepageCopy}</p>
      <div className="course-grid">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div>
      <Link className="inline-link" href="/courses">View all courses</Link>
    </section>}

    <PublicFooter site={site} socialLinks={socialLinks} />
  </main>;
}

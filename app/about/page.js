import Link from "next/link";
import ProfileAvatar from "@/Components/ProfileAvatar";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import PublicFooter from "@/Components/PublicFooter";
import SocialLinks from "@/Components/SocialLinks";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: { absolute: "About Idayat Ibrahim | AI Video Creator & Visual Storyteller" }, description: "Meet Idayat Ibrahim, an AI Video Creator, AI Video Editor, Visual Storyteller and AI Tutor based in Nigeria, working with brands and creators worldwide.", alternates: { canonical: "https://aivideocreator.cv/about" } };

export default async function AboutPage() {
  const [site, socialLinks] = await Promise.all([getSiteContent(), getPublicSocialLinks()]);
  const initials = String(site.creatorName || "Portfolio").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const focal = `${Number(site.profileFocalX) || 50}% ${Number(site.profileFocalY) || 50}%`;

  const sections = [
    {
      id: "profile",
      heading: "01 / Profile",
      body: <p data-reveal>Idayat Ibrahim is an AI Video Creator, AI Video Editor, Visual Storyteller and AI Video Tutor based in Nigeria. She creates AI-powered commercials, product videos, UGC-style content, branded films and social media campaigns for businesses, brands and creators in Nigeria and internationally.</p>,
    },
    { id: "current-work", heading: "02 / Current work", body: <p data-reveal>{site.aboutCurrentWork}</p> },
    { id: "approach", heading: "03 / Approach", body: <p data-reveal>{site.aboutApproach}</p> },
    { id: "philosophy", heading: "04 / Philosophy", quote: site.aboutPhilosophy },
    { id: "experience", heading: "05 / Experience", body: <p data-reveal>{site.aboutExperience}</p> },
    {
      id: "teaching",
      heading: "06 / Teaching",
      body: <p data-reveal>Alongside her production work, Idayat teaches AI video creation through <Link href="/academy">AI VIDEO CREATOR Academy</Link>, helping creators learn AI image generation, AI video generation, visual storytelling, prompting, editing, sound design and commercial video production.</p>,
    },
  ];

  return <main className="about-page public-page">
    <PublicHeader site={site} current="/about" />

    <PublicTextReveal as="article" className="about-layout">
      <header className="about-intro">
        <p className="eyebrow" data-reveal>ABOUT</p>
        <h1 className="page-title" data-reveal>{site.aboutHeading || "Made for attention, built with intent."}</h1>
        <p className="public-lede" data-reveal>{site.aboutCopy || "I shape films and moving images for brands with something worth saying."}</p>
        {site.availability && <p className="availability-status"><span aria-hidden="true" /><small data-reveal>{site.availability}</small></p>}
      </header>

      <div className="about-body">
        <aside className="about-rail">
          <ProfileAvatar className="about-portrait" src={site.profileImage} width={1000} height={1333} sizes="(max-width: 980px) 92px, 300px" style={{ objectPosition: focal }} alt={`${site.creatorName} profile`} initials={initials} />
          <div className="about-rail-meta">
            <h2 className="about-rail-name">{site.creatorName}</h2>
            <p className="about-rail-title">{site.professionalTitle}</p>
          </div>
        </aside>

        <div className="about-sections">
          {sections.map((section) => <section className="about-section" key={section.id}>
            <h2 className="about-label">{section.heading}</h2>
            {section.quote ? <blockquote className="about-quote" data-reveal>{section.quote}</blockquote> : <div className="about-prose">{section.body}</div>}
          </section>)}
        </div>
      </div>

      <footer className="about-cta">
        <p>Available for commercial films, branded content, social campaigns and creative collaborations.</p>
        <div className="about-actions">
          <Link className="button button-dark" href="/contact">Start a project enquiry <span aria-hidden="true">&rarr;</span></Link>
          <Link className="button button-secondary" href="/work">View selected work</Link>
        </div>
      </footer>

      {socialLinks.length > 0 && <aside className="direct-contact about-social" aria-label="Social profiles">
        <p>Elsewhere</p>
        <SocialLinks links={socialLinks} />
      </aside>}
    </PublicTextReveal>

    <PublicFooter site={site} socialLinks={[]} />
  </main>;
}

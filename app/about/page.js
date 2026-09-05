import Link from "next/link";
import ProfileAvatar from "@/Components/ProfileAvatar";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import PublicFooter from "@/Components/PublicFooter";
import SocialLinks from "@/Components/SocialLinks";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "About", description: "About the director and visual storyteller behind the portfolio." };

export default async function AboutPage() {
  const [site, socialLinks] = await Promise.all([getSiteContent(), getPublicSocialLinks()]);
  const initials = String(site.creatorName || "Portfolio").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const focal = `${Number(site.profileFocalX) || 50}% ${Number(site.profileFocalY) || 50}%`;
  return <main className="about-page public-page">
    <PublicHeader site={site} current="/about" />
    <PublicTextReveal as="article" className="about-note public-note">
      <div className="about-identity"><ProfileAvatar className="about-avatar" src={site.profileImage} width={52} height={52} sizes="52px" style={{ objectPosition: focal }} alt={`${site.creatorName} profile`} initials={initials} /><div><h1 data-reveal>{site.creatorName}</h1><p data-reveal>{site.professionalTitle}</p>{site.availability && <small data-reveal>{site.availability}</small>}</div></div>
      <div className="about-copy"><p data-reveal>{site.aboutCurrentWork}</p><p data-reveal>{site.aboutApproach}</p><p data-reveal>{site.aboutExperience}</p><p data-reveal>{site.aboutPhilosophy}</p></div>
      <p className="about-links" data-reveal>Available for commercial films, branded content, social campaigns and creative collaborations. <Link href="/work">View selected work</Link> or <Link href="/contact">start a project enquiry</Link>.</p>
      <SocialLinks links={socialLinks} />
    </PublicTextReveal>
    <PublicFooter site={site} socialLinks={socialLinks} />
  </main>;
}

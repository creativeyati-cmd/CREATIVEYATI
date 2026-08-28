import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import { getSiteContent } from "@/lib/data/site";

export const metadata = { title: "About", description: "About the director and visual storyteller behind the portfolio." };

export default async function AboutPage() {
  const site = await getSiteContent();
  return <main className="about-page public-page">
    <PublicHeader site={site} current="/about" />
    <PublicTextReveal as="article" className="about-note public-note">
      <div className="about-identity">{site.profileImage ? <img className="about-avatar" src={site.profileImage} alt="" /> : <span className="about-avatar identity-mark">FM</span>}<div><h1 data-reveal>{site.creatorName}</h1><p data-reveal>{site.professionalTitle}</p>{site.availability && <small data-reveal>{site.availability}</small>}</div></div>
      <div className="about-copy"><p data-reveal>{site.aboutCurrentWork}</p><p data-reveal>{site.aboutApproach}</p><p data-reveal>{site.aboutExperience}</p><p data-reveal>{site.aboutPhilosophy}</p></div>
      <p className="about-links" data-reveal>Available for commercial films, branded content, social campaigns and creative collaborations. {site.youtubeUrl && <a href={site.youtubeUrl} target="_blank" rel="noreferrer">View selected work on YouTube</a>}{site.youtubeUrl && site.instagramUrl && " and "}{site.instagramUrl && <a href={site.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}. You can reach me {site.publicEmail && <a href={`mailto:${site.publicEmail}`}>by email</a>}{site.publicEmail && site.whatsappUrl && " or "}{site.whatsappUrl && <a href={site.whatsappUrl} target="_blank" rel="noreferrer">on WhatsApp</a>} {(site.publicEmail || site.whatsappUrl) && " or "}<Link href="/contact">through the project enquiry form</Link>.</p>
    </PublicTextReveal>
    <footer>{site.footerText || `© ${new Date().getFullYear()} ${site.creatorName}`} <Link href="/">Home</Link></footer>
  </main>;
}

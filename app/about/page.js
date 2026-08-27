import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";

export const metadata = { title: "About | Frame / Motion", description: "About the director and visual storyteller behind Frame / Motion." };

export default async function AboutPage() {
  const site = await getSiteContent();
  return <main className="about-page">
    <PublicHeader site={site} current="/about" />
    <article className="about-note">
      <div className="about-identity">{site.profileImage ? <img className="about-avatar" src={site.profileImage} alt="" /> : <span className="about-avatar identity-mark">FM</span>}<div><h1>{site.creatorName}</h1><p>{site.professionalTitle}</p>{site.availability && <small>{site.availability}</small>}</div></div>
      <div className="about-copy"><p>{site.aboutCurrentWork}</p><p>{site.aboutApproach}</p><p>{site.aboutExperience}</p><p>{site.aboutPhilosophy}</p></div>
      <p className="about-links">Available for commercial films, branded content, social campaigns and creative collaborations. {site.youtubeUrl && <a href={site.youtubeUrl} target="_blank" rel="noreferrer">View selected work on YouTube</a>}{site.youtubeUrl && site.instagramUrl && " and "}{site.instagramUrl && <a href={site.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>}. You can reach me {site.publicEmail && <a href={`mailto:${site.publicEmail}`}>by email</a>} {site.publicEmail && " or "}<Link href="/contact">through the project enquiry form</Link>.</p>
    </article>
    <footer>{site.footerText || `© ${new Date().getFullYear()} ${site.creatorName}`} <Link href="/">Home</Link></footer>
  </main>;
}

import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import PublicFooter from "@/Components/PublicFooter";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const [site, socialLinks] = await Promise.all([getSiteContent(), getPublicSocialLinks()]);
  return <main className="public-page"><PublicHeader site={site} current="/services" /><PublicTextReveal as="article" className="about-note public-note"><p className="eyebrow" data-reveal>SERVICES</p><h1 className="page-title" data-reveal>From a clear idea to a considered final cut.</h1><div className="about-copy"><p data-reveal>Direction, concept development, production and post-production for commercial films, branded content and social campaigns.</p><p data-reveal>Every project begins with the message, the audience and the moment the work needs to create. The format follows from there.</p></div></PublicTextReveal><PublicFooter site={site} socialLinks={socialLinks} /></main>;
}

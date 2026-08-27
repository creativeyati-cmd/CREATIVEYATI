import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import { getSiteContent } from "@/lib/data/site";
export const metadata = { title: "Services | Frame / Motion" };
export default async function ServicesPage() { const site = await getSiteContent(); return <main className="public-page"><PublicHeader site={site} current="/services" /><PublicTextReveal as="article" className="about-note public-note"><p className="eyebrow" data-reveal>SERVICES</p><h1 className="page-title" data-reveal>From a clear idea to a considered final cut.</h1><div className="about-copy"><p data-reveal>Direction, concept development, production and post-production for commercial films, branded content and social campaigns.</p><p data-reveal>Every project begins with the message, the audience and the moment the work needs to create. The format follows from there.</p></div></PublicTextReveal></main>; }

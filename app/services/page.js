import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
export const metadata = { title: "Services | Frame / Motion" };
export default async function ServicesPage() { const site = await getSiteContent(); return <main><PublicHeader site={site} current="/services" /><article className="about-note"><p className="eyebrow">SERVICES</p><h1 className="page-title">From a clear idea to a considered final cut.</h1><div className="about-copy"><p>Direction, concept development, production and post-production for commercial films, branded content and social campaigns.</p><p>Every project begins with the message, the audience and the moment the work needs to create. The format follows from there.</p></div></article></main>; }

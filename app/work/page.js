import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import PublicFooter from "@/Components/PublicFooter";
import WorkGrid from "@/Components/WorkGrid";
import { getSiteContent } from "@/lib/data/site";
import { getPublicPortfolio } from "@/lib/data/public";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "Work" };

export default async function WorkPage() {
  const [{ videos, error }, site, socialLinks] = await Promise.all([getPublicPortfolio(), getSiteContent(), getPublicSocialLinks()]);
  return <main className="public-page">
    <PublicHeader site={site} current="/work" />
    <section className="work-page public-note">
      <PublicTextReveal><p className="eyebrow" data-reveal>SELECTED WORK</p><h1 className="page-title" data-reveal>Films made to hold attention.</h1></PublicTextReveal>
      {error ? <p className="empty-state">{error}</p> : videos.length ? <WorkGrid videos={videos} /> : <p className="empty-state">No published work yet.</p>}
    </section>
    <PublicFooter site={site} socialLinks={socialLinks} />
  </main>;
}

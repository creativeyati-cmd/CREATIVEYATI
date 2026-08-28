import Link from "next/link";
import CarouselSection from "@/Components/CarouselSection";
import PublicHeader from "@/Components/PublicHeader";
import { getPublicPortfolio } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";

export default async function Home() {
  const [{ videos, error }, site] = await Promise.all([getPublicPortfolio(), getSiteContent()]);
  const heading = site.heroHeading.split(site.highlightWord);
  return <main className="portfolio-home"><section className="hero-work" style={{ "--site-accent": site.accentColor }}><PublicHeader site={site} current="/" />{error ? <p className="empty-state">{error}</p> : videos.length ? <CarouselSection projects={videos} showMetadata={false} /> : <p className="empty-state">No published work yet.</p>}<section className="hero-statement"><h1>{heading[0]}<em>{site.highlightWord}</em>{heading.slice(1).join(site.highlightWord)}</h1><p>{site.heroCopy}</p><Link className="button" href="/contact">{site.ctaLabel}</Link></section></section></main>;
}

import Link from "next/link";
import CarouselSection from "@/Components/CarouselSection";
import MobilePortfolio from "@/Components/MobilePortfolio";
import PublicHeader from "@/Components/PublicHeader";
import { getPublicPortfolio } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";

export default async function Home({ searchParams }) {
  const { category } = await searchParams;
  const [{ videos, categories, error }, site] = await Promise.all([getPublicPortfolio(category), getSiteContent()]);
  const heading = site.heroHeading.split(site.highlightWord);
  return <main className="portfolio-home"><section className="hero-work" style={{ "--site-accent": site.accentColor }}><PublicHeader site={site} current="/" /><div className="filter-bar"><Link href="/" className={!category ? "is-active" : ""}>All</Link>{categories.slice(0, 5).map((item) => <Link key={item.id} className={category === item.slug ? "is-active" : ""} href={`/?category=${item.slug}`}>{item.name}</Link>)}</div>{error ? <p className="empty-state">{error}</p> : videos.length ? <><CarouselSection projects={videos} /><MobilePortfolio key={`${category || "all"}-${videos.map((video) => video.id).join("-")}`} videos={videos} /></> : <p className="empty-state">No published work in this category yet.</p>}<section className="hero-statement"><h1>{heading[0]}<em>{site.highlightWord}</em>{heading.slice(1).join(site.highlightWord)}</h1><p>{site.heroCopy}</p><Link className="button" href="/contact">{site.ctaLabel}</Link></section></section></main>;
}

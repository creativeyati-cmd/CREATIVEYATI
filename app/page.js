import Link from "next/link";
import CarouselSection from "@/Components/CarouselSection";
import MobilePortfolio from "@/Components/MobilePortfolio";
import ThemeToggle from "@/Components/ThemeToggle";
import ContactForm from "@/Components/ContactForm";
import { getPublicPortfolio } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";

export default async function Home({ searchParams }) {
  const { category } = await searchParams; const [{ videos, categories, error }, site] = await Promise.all([getPublicPortfolio(category), getSiteContent()]);
  return <main className="portfolio-home">
    <section id="work" className="hero-work" style={{ "--site-accent": site.accentColor, "--site-light-background": site.lightBackground, "--site-dark-background": site.darkBackground }}><header className="site-header"><Link href="/" className="identity">{site.profileImage ? <img className="profile-image" src={site.profileImage} alt="" /> : <span className="identity-mark">FM</span>}<span>{site.creatorName}</span><span aria-hidden="true">⌄</span></Link><nav><ThemeToggle /><a className="header-cta" href={site.ctaHref}>{site.ctaLabel}</a></nav></header>
    <div className="filter-bar"><Link href="/" className={!category ? "is-active" : ""}>All</Link>{categories.slice(0, 5).map((item) => <Link key={item.id} className={category === item.slug ? "is-active" : ""} href={`/?category=${item.slug}`}>{item.name}</Link>)}</div>
      {error ? <p className="empty-state">{error}</p> : videos.length ? <><CarouselSection projects={videos} /><MobilePortfolio videos={videos} /></> : <p className="empty-state">No published work in this category yet.</p>}
    </section>
    <section className="hero-statement"><h1>{site.heroHeading.split(site.highlightWord)[0]}<em>{site.highlightWord}</em>{site.heroHeading.split(site.highlightWord).slice(1).join(site.highlightWord)}</h1><p>{site.heroCopy}</p><a className="button" href={site.ctaHref}>{site.ctaLabel}</a></section>
    <section id="about" className="editorial"><p>ABOUT</p><h2>{site.aboutHeading}</h2><p>{site.aboutCopy}</p><Link className="inline-link" href="/about">Read more about my practice</Link></section>
    <section id="contact" className="contact"><p>CONTACT</p><h2>{site.contactHeading}</h2><p>{site.contactCopy}</p><ContactForm /></section>
    <footer>{site.footerText || `© ${new Date().getFullYear()} ${site.creatorName}`} <Link href="/admin/login">Admin</Link></footer>
  </main>;
}

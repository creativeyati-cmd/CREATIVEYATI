import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import ContactForm from "@/Components/ContactForm";
import { getSiteContent } from "@/lib/data/site";
export const metadata = { title: "Contact | Frame / Motion" };
export default async function ContactPage() { const site = await getSiteContent(); return <main className="public-page"><PublicHeader site={site} current="/contact" /><section className="contact-page public-note"><PublicTextReveal><p className="eyebrow" data-reveal>CONTACT</p><h1 className="page-title" data-reveal>{site.contactHeading}</h1><p className="public-lede" data-reveal>{site.contactCopy}</p>{site.publicEmail && <p data-reveal><a className="inline-link" href={`mailto:${site.publicEmail}`}>{site.publicEmail}</a></p>}</PublicTextReveal><ContactForm /></section></main>; }

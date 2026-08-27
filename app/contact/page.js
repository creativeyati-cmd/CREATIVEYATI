import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import ContactForm from "@/Components/ContactForm";
import { getSiteContent } from "@/lib/data/site";
export const metadata = { title: "Contact | Frame / Motion" };
export default async function ContactPage() { const site = await getSiteContent(); return <main><PublicHeader site={site} current="/contact" /><section className="contact-page"><p>CONTACT</p><h1>{site.contactHeading}</h1><p>{site.contactCopy}</p>{site.publicEmail && <p><a className="inline-link" href={`mailto:${site.publicEmail}`}>{site.publicEmail}</a></p>}<ContactForm /></section></main>; }

import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import PublicFooter from "@/Components/PublicFooter";
import SocialLinks from "@/Components/SocialLinks";
import ContactForm from "@/Components/ContactForm";
import CalBookingEmbed from "@/Components/CalBookingEmbed";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const [site, socialLinks] = await Promise.all([getSiteContent(), getPublicSocialLinks()]);
  return <main className="public-page">
    <PublicHeader site={site} current="/contact" />
    <section className="contact-page public-note">
      <PublicTextReveal><p className="eyebrow" data-reveal>CONTACT</p><h1 className="page-title" data-reveal>{site.contactHeading}</h1><p className="public-lede" data-reveal>{site.contactCopy}</p><div className="contact-links">{site.publicEmail && <p data-reveal><a className="inline-link" href={`mailto:${site.publicEmail}`}>{site.publicEmail}</a></p>}{site.phone && <p data-reveal><a className="inline-link" href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}>{site.phone}</a></p>}{site.location && <p data-reveal>{site.location}</p>}{site.availability && <p data-reveal>{site.availability}</p>}</div></PublicTextReveal>
      <SocialLinks links={socialLinks} />
      {site.bookingUrl && <CalBookingEmbed bookingUrl={site.bookingUrl} />}
      <ContactForm />
    </section>
    <PublicFooter site={site} socialLinks={socialLinks} />
  </main>;
}

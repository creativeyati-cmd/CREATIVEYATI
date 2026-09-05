import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import PublicFooter from "@/Components/PublicFooter";
import SocialLinks from "@/Components/SocialLinks";
import ContactForm from "@/Components/ContactForm";
import { getSiteContent } from "@/lib/data/site";
import { getPublicSocialLinks } from "@/lib/data/social";

export const metadata = { title: "Contact" };

function discoveryCallUrl(bookingUrl) {
  try {
    const url = new URL(bookingUrl);
    if (url.hostname === "cal.com" && url.pathname.split("/").filter(Boolean).length === 1) url.pathname = `${url.pathname.replace(/\/$/, "")}/30min`;
    return url.toString();
  } catch {
    return bookingUrl;
  }
}

export default async function ContactPage() {
  const [site, socialLinks] = await Promise.all([getSiteContent(), getPublicSocialLinks()]);
  const bookingUrl = site.bookingUrl ? discoveryCallUrl(site.bookingUrl) : "";
  const contactSocials = socialLinks.filter((link) => ["instagram", "youtube", "tiktok", "whatsapp"].includes(link.platform));
  const contactCopy = !site.contactCopy || site.contactCopy === "Tell me what you are making and where it needs to go." ? "Tell me what you\u2019re making, what you need, and where you want it to go." : site.contactCopy;
  const availability = site.availability === "Available for select collaborations" ? "Available for selected projects" : site.availability;

  return <main className="public-page contact-public-page">
    <PublicHeader site={site} current="/contact" />
    <section className="contact-page contact-layout">
      <header className="contact-introduction">
        <PublicTextReveal>
          <p className="eyebrow" data-reveal>CONTACT</p>
          <h1 className="page-title" data-reveal>{site.contactHeading || "Have a story in mind?"}</h1>
          <p className="public-lede" data-reveal>{contactCopy}</p>
          {availability && <p className="availability-status" data-reveal><span aria-hidden="true" />{availability}</p>}
        </PublicTextReveal>
      </header>

      <div className="contact-options">
        <section className="booking-option" aria-labelledby="booking-heading">
          <h2 id="booking-heading">Book a call</h2>
          <p>Choose a time for a short conversation about your project.</p>
          <div className="booking-summary"><strong>Project discovery call</strong><span>30 minutes</span></div>
          {bookingUrl ? <a className="button booking-action" href={bookingUrl} target="_blank" rel="noreferrer">Choose a date and time <span aria-hidden="true">&rarr;</span></a> : <p className="booking-unavailable">Booking is temporarily unavailable. Please send an enquiry instead.</p>}
        </section>

        <section className="enquiry-option" aria-labelledby="enquiry-heading">
          <h2 id="enquiry-heading">Send an enquiry</h2>
          <p>Share a few details and I&rsquo;ll get back to you.</p>
          <ContactForm />
        </section>
      </div>

      {(site.publicEmail || contactSocials.length > 0) && <aside className="direct-contact" aria-label="Direct contact and social profiles">
        {site.publicEmail && <p>Prefer email? <a className="inline-link" href={`mailto:${site.publicEmail}`}>{site.publicEmail}</a></p>}
        <SocialLinks links={contactSocials} />
      </aside>}
    </section>
    <PublicFooter site={site} socialLinks={[]} />
  </main>;
}

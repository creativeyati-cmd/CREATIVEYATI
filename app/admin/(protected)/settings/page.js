import Link from "next/link";

export default function Settings() {
  return <>
    <div className="admin-title"><p>SETTINGS</p><h1>Site configuration</h1><p className="admin-lede">Manage public contact details, social profiles, email and payment APIs, search metadata and course presentation.</p></div>
    <div className="admin-list settings-list">
      <Link href="/admin/settings/carousel"><span>Carousel motion<small>Continuous direction, speed, interaction recovery and reduced-motion behaviour</small></span><b>Open</b></Link>
      <Link href="/admin/settings/contact"><span>Contact details<small>Public email, phone, WhatsApp, location and booking availability</small></span><b>Open</b></Link>
      <Link href="/admin/settings/social"><span>Social profiles<small>Add, disable, remove and reorder public platform links</small></span><b>Open</b></Link>
      <Link href="/admin/settings/email"><span>SMTP email API<small>Encrypted SMTP configuration, enquiry notifications and live connection testing</small></span><b>Open</b></Link>
      <Link href="/admin/payments"><span>Bachs payment API<small>Encrypted checkout key, signed webhook secret and connection testing</small></span><b>Open</b></Link>
      <Link href="/admin/settings/seo"><span>SEO defaults<small>Site title, description, canonical URL and social image</small></span><b>Open</b></Link>
      <Link href="/admin/course-settings"><span>Course presentation<small>Control the optional featured course section on the homepage</small></span><b>Open</b></Link>
    </div>
  </>;
}

import SettingsNavigation from "@/Components/SettingsNavigation";
import { Input, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { saveContactSettings } from "@/app/admin/actions";
import { getContactSettings } from "@/lib/data/settings";
import { getSiteContent } from "@/lib/data/site";

export default async function ContactSettings({ searchParams }) {
  const [stored, site, query] = await Promise.all([getContactSettings(), getSiteContent(), searchParams]);
  const settings = stored._configured ? stored : { ...stored, publicEmail: site.publicEmail, phone: site.phone, bookingUrl: site.bookingUrl, availability: site.availability, instagramUrl: site.instagramUrl, youtubeUrl: site.youtubeUrl };
  return <><PageHeader title={<>Contact details</>} eyebrow={<>SETTINGS</>} description={<>These values update the public portfolio immediately after saving.</>} actions={<><Link href="/contact">Preview contact page</Link></>}/><SettingsNavigation/>{query.saved && <p className="success-note">Contact settings updated.</p>}{query.error && <p className="form-error">{query.error}</p>}<form className="admin-form" action={saveContactSettings}><label>Public email<Input name="publicEmail" type="email" defaultValue={settings.publicEmail} /></label><label>Phone<Input name="phone" type="tel" defaultValue={settings.phone} /></label><label>Booking URL<Input name="bookingUrl" type="url" placeholder="https://cal.com/your-name" defaultValue={settings.bookingUrl} /></label><label>WhatsApp URL<Input name="whatsappUrl" type="url" placeholder="https://wa.me/234..." defaultValue={settings.whatsappUrl} /></label><label>Location<Input name="location" defaultValue={settings.location} placeholder="Lagos, Nigeria" /></label><label className="form-wide">Availability message<Input name="availability" defaultValue={settings.availability} /></label><label>Instagram URL<Input name="instagramUrl" type="url" defaultValue={settings.instagramUrl} /></label><label>YouTube URL<Input name="youtubeUrl" type="url" defaultValue={settings.youtubeUrl} /></label><Button className="button">Save contact settings</Button></form></>;
}

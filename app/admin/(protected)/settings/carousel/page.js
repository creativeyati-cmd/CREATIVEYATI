import SettingsNavigation from "@/Components/SettingsNavigation";
import { Input, Select, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { saveCarouselSettings } from "@/app/admin/actions";
import { getCarouselSettings } from "@/lib/data/settings";

export default async function CarouselSettingsPage({ searchParams }) {
  const [settings, query] = await Promise.all([getCarouselSettings(), searchParams]);
  return <>
    <PageHeader title={<>Carousel motion</>} eyebrow={<>SETTINGS</>} description={<>Control the homepage film-reel movement. Safe speed limits keep the portfolio readable.</>} actions={<><Link href="/">Preview homepage</Link></>}/><SettingsNavigation/>
    {query.saved && <p className="success-note">Carousel motion settings updated.</p>}
    <form className="admin-form" action={saveCarouselSettings}>
      <label className="check-label form-wide"><Input name="enabled" type="checkbox" defaultChecked={settings.enabled} />Continuous movement enabled</label>
      <label>Direction<Select name="direction" defaultValue={settings.direction}><option value="left">Left</option><option value="right">Right</option></Select></label>
      <label>Desktop speed (px/s)<Input name="desktopSpeed" type="number" min="10" max="60" step="1" defaultValue={settings.desktopSpeed} required /></label>
      <label>Mobile speed (px/s)<Input name="mobileSpeed" type="number" min="10" max="40" step="1" defaultValue={settings.mobileSpeed} required /></label>
      <label>Resume delay (ms)<Input name="resumeDelay" type="number" min="0" max="6000" step="100" defaultValue={settings.resumeDelay} required /></label>
      <label className="check-label form-wide"><Input name="disableForReducedMotion" type="checkbox" defaultChecked={settings.disableForReducedMotion} />Disable automatic motion when reduced motion is requested</label>
      <Button className="button">Save carousel settings</Button>
    </form>
  </>;
}

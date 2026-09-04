import Link from "next/link";
import { saveCarouselSettings } from "@/app/admin/actions";
import { getCarouselSettings } from "@/lib/data/settings";

export default async function CarouselSettingsPage({ searchParams }) {
  const [settings, query] = await Promise.all([getCarouselSettings(), searchParams]);
  return <>
    <div className="admin-title"><p>SETTINGS</p><h1>Carousel motion</h1><p className="admin-lede">Control the homepage film-reel movement. Safe speed limits keep the portfolio readable.</p><Link href="/">Preview homepage</Link></div>
    {query.saved && <p className="success-note">Carousel motion settings updated.</p>}
    <form className="admin-form" action={saveCarouselSettings}>
      <label className="check-label form-wide"><input name="enabled" type="checkbox" defaultChecked={settings.enabled} />Continuous movement enabled</label>
      <label>Direction<select name="direction" defaultValue={settings.direction}><option value="left">Left</option><option value="right">Right</option></select></label>
      <label>Desktop speed (px/s)<input name="desktopSpeed" type="number" min="10" max="60" step="1" defaultValue={settings.desktopSpeed} required /></label>
      <label>Mobile speed (px/s)<input name="mobileSpeed" type="number" min="10" max="40" step="1" defaultValue={settings.mobileSpeed} required /></label>
      <label>Resume delay (ms)<input name="resumeDelay" type="number" min="0" max="6000" step="100" defaultValue={settings.resumeDelay} required /></label>
      <label className="check-label form-wide"><input name="disableForReducedMotion" type="checkbox" defaultChecked={settings.disableForReducedMotion} />Disable automatic motion when reduced motion is requested</label>
      <button className="button">Save carousel settings</button>
    </form>
  </>;
}

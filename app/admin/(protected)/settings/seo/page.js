import SettingsNavigation from "@/Components/SettingsNavigation";
import { Input, Textarea, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { saveSeoSettings } from "@/app/admin/actions";
import { getSeoSettings } from "@/lib/data/settings";

export default async function SeoSettings({ searchParams }) {
  const [settings, query] = await Promise.all([getSeoSettings(), searchParams]);
  return <><PageHeader title={<>SEO defaults</>} eyebrow={<>SETTINGS</>} description={<>Control the default browser, search-engine and social-sharing metadata.</>} actions={<><Link href="/">Preview website</Link></>}/><SettingsNavigation/>{query.saved && <p className="success-note">SEO defaults updated.</p>}{query.error && <p className="form-error">{query.error}</p>}<form className="admin-form" action={saveSeoSettings}><label className="form-wide">Site title<Input name="siteTitle" required maxLength="100" defaultValue={settings.siteTitle} /></label><label className="form-wide">Site description<Textarea name="siteDescription" required maxLength="320" rows="4" defaultValue={settings.siteDescription} /></label><label>Canonical site URL<Input name="canonicalUrl" type="url" required defaultValue={settings.canonicalUrl} /></label><label>Default social image URL<Input name="defaultOgImage" type="url" defaultValue={settings.defaultOgImage} placeholder="https://.../share-image.jpg" /></label><Button className="button">Save SEO settings</Button></form></>;
}

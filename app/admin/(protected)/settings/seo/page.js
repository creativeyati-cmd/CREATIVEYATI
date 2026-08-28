import Link from "next/link";
import { saveSeoSettings } from "@/app/admin/actions";
import { getSeoSettings } from "@/lib/data/settings";

export default async function SeoSettings({ searchParams }) {
  const [settings, query] = await Promise.all([getSeoSettings(), searchParams]);
  return <><div className="admin-title"><p>SETTINGS</p><h1>SEO defaults</h1><p className="admin-lede">Control the default browser, search-engine and social-sharing metadata.</p><Link href="/">Preview website</Link></div>{query.saved && <p className="success-note">SEO defaults updated.</p>}{query.error && <p className="form-error">{query.error}</p>}<form className="admin-form" action={saveSeoSettings}><label className="form-wide">Site title<input name="siteTitle" required maxLength="100" defaultValue={settings.siteTitle} /></label><label className="form-wide">Site description<textarea name="siteDescription" required maxLength="320" rows="4" defaultValue={settings.siteDescription} /></label><label>Canonical site URL<input name="canonicalUrl" type="url" required defaultValue={settings.canonicalUrl} /></label><label>Default social image URL<input name="defaultOgImage" type="url" defaultValue={settings.defaultOgImage} placeholder="https://.../share-image.jpg" /></label><button className="button">Save SEO settings</button></form></>;
}

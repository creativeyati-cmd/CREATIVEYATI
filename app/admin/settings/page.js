import Link from "next/link";
export default function Settings() { return <><div className="admin-title"><p>SETTINGS</p><h1>Site configuration</h1></div><div className="admin-list"><Link href="/admin/settings/contact">Contact details</Link><Link href="/admin/settings/email">Email delivery</Link><Link href="/admin/settings/seo">SEO defaults</Link></div></>; }

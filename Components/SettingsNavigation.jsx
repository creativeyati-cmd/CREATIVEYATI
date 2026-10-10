"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [["/admin/settings", "General"], ["/admin/course-settings", "Academy"], ["/admin/settings/documents", "Documents"], ["/admin/settings/contact", "Contact"], ["/admin/settings/social", "Social profiles"], ["/admin/settings/email", "Email"], ["/admin/payments", "Payments"], ["/admin/settings/seo", "SEO"], ["/admin/settings/carousel", "Carousel"]];
export default function SettingsNavigation() {
 const path = usePathname();
 return <nav className="settings-links" aria-label="Settings sections">{links.map(([href,label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>)}</nav>;
}

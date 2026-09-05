"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon } from "@/Components/Icons";

const links = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/videos", label: "Videos", icon: "video" },
  { href: "/admin/categories", label: "Categories", icon: "folder" },
  { href: "/admin/content", label: "Website content", icon: "folder" },
  { href: "/admin/enquiries", label: "Enquiries", icon: "mail" },
  { href: "/admin/courses", label: "Courses", icon: "video" },
  { href: "/admin/orders", label: "Orders", icon: "folder" },
  { href: "/admin/payments", label: "Bachs payments", icon: "folder" },
  { href: "/admin/coupons", label: "Coupons", icon: "folder" },
  { href: "/admin/settings/social", label: "Social profiles", icon: "user" },
  { href: "/admin/settings/email", label: "SMTP email", icon: "mail" },
  { href: "/admin/course-settings", label: "Course settings", icon: "settings" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function isCurrentPage(pathname, href) {
  if (href === "/admin") return pathname === href;
  if (["/admin/settings/social", "/admin/settings/email"].includes(href)) return pathname === href;
  if (href === "/admin/settings") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !["/admin/settings/social", "/admin/settings/email"].includes(pathname));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNavigation() {
  const pathname = usePathname();

  return <nav aria-label="Dashboard">
    {links.map((item) => {
      const active = isCurrentPage(pathname, item.href);
      return <Link className={active ? "is-active" : undefined} href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
        <AdminIcon name={item.icon} />
        {item.label}
      </Link>;
    })}
    <Link href="/" target="_blank" rel="noreferrer"><AdminIcon name="home" />View website</Link>
  </nav>;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminIcon } from "@/Components/Icons";
import { getAdminUser } from "@/lib/supabase/server";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  return <div className="admin-shell"><aside><Link className="wordmark" href="/admin">FRAME / MOTION</Link><nav><Link href="/admin"><AdminIcon name="home" />Overview</Link><Link href="/admin/videos"><AdminIcon name="video" />Videos</Link><Link href="/admin/categories"><AdminIcon name="folder" />Categories</Link><Link href="/admin/content"><AdminIcon name="folder" />Website content</Link><Link href="/admin/enquiries"><AdminIcon name="mail" />Enquiries</Link><Link href="/admin/courses"><AdminIcon name="video" />Courses</Link><Link href="/admin/orders"><AdminIcon name="folder" />Orders</Link><Link href="/admin/payments"><AdminIcon name="folder" />Payments</Link><Link href="/admin/coupons"><AdminIcon name="folder" />Coupons</Link><Link href="/admin/settings/social"><AdminIcon name="user" />Social profiles</Link><Link href="/admin/course-settings"><AdminIcon name="settings" />Course settings</Link><Link href="/admin/settings"><AdminIcon name="settings" />Settings</Link><Link href="/" target="_blank"><AdminIcon name="home" />View website</Link></nav><form action={logout}><button type="submit"><AdminIcon name="logout" />Log out</button></form></aside><section className="admin-main">{children}</section></div>;
}

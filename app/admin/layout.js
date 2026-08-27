import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/Components/ThemeToggle";
import { AdminIcon } from "@/Components/Icons";
import { getAdminUser } from "@/lib/supabase/server";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }) { if (!(await getAdminUser())) redirect("/admin/login"); return <div className="admin-shell"><aside><Link className="wordmark" href="/admin">FRAME / MOTION</Link><nav><Link href="/admin"><AdminIcon name="home" />Overview</Link><Link href="/admin/videos"><AdminIcon name="video" />Videos</Link><Link href="/admin/categories"><AdminIcon name="folder" />Categories</Link><Link href="/admin/content"><AdminIcon name="folder" />Website content</Link><Link href="/admin/enquiries"><AdminIcon name="mail" />Enquiries</Link><Link href="/admin/settings"><AdminIcon name="settings" />Settings</Link><Link href="/" target="_blank"><AdminIcon name="home" />View website</Link></nav><form action={logout}><button type="submit"><AdminIcon name="logout" />Log out</button></form></aside><section className="admin-main"><header><ThemeToggle /></header>{children}</section></div>; }

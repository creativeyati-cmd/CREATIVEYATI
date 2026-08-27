import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/Components/ThemeToggle";
import { getAdminUser } from "@/lib/supabase/server";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }) { if (!(await getAdminUser())) redirect("/admin/login"); return <div className="admin-shell"><aside><Link className="wordmark" href="/admin">FRAME / MOTION</Link><nav><Link href="/admin">Overview</Link><Link href="/admin/videos">Videos</Link><Link href="/admin/categories">Categories</Link><Link href="/admin/content">Website content</Link><Link href="/admin/enquiries">Enquiries</Link><Link href="/admin/settings">Settings</Link><Link href="/">View website</Link></nav><form action={logout}><button type="submit">Log out</button></form></aside><section className="admin-main"><header><ThemeToggle /></header>{children}</section></div>; }

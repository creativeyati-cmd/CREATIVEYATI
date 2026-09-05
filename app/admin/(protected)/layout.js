import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNavigation from "@/Components/AdminNavigation";
import { AdminIcon } from "@/Components/Icons";
import { getAdminUser } from "@/lib/supabase/server";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  return <div className="admin-shell"><aside><Link className="wordmark" href="/admin">FRAME / MOTION</Link><AdminNavigation /><form action={logout}><button type="submit"><AdminIcon name="logout" />Log out</button></form></aside><section className="admin-main">{children}</section></div>;
}

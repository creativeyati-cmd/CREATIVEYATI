import Link from "next/link";
import { redirect } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import { getStudentUser } from "@/lib/supabase/server";
import { studentSignOut } from "@/app/student-actions";

export const dynamic = "force-dynamic";
export default async function LearnLayout({ children }) { const [user, site] = await Promise.all([getStudentUser(), getSiteContent()]); if (!user) redirect("/login?next=/learn"); return <main className="public-page learn-area"><PublicHeader site={site} /><div className="learn-account"><Link href="/learn">My learning</Link><span>{user.email}</span><form action={studentSignOut}><button>Sign out</button></form></div>{children}</main>; }

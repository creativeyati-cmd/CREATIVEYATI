import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/data/courses";

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();
  const [publishedResult, draftsResult, enquiriesResult, coursesResult, studentsResult, ordersResult, failedResult, revenueResult] = await Promise.all([
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("payment_status", "successful"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("payment_status", "failed"),
    supabase.from("orders").select("amount_minor,currency").eq("payment_status", "successful"),
  ]);
  const revenue = (revenueResult.data || []).filter((item) => item.currency === "NGN").reduce((sum, item) => sum + Number(item.amount_minor), 0);
  const stats = [["Published projects", publishedResult.count || 0],["Draft projects", draftsResult.count || 0],["New enquiries", enquiriesResult.count || 0],["Published courses", coursesResult.count || 0],["Total students", studentsResult.count || 0],["Successful orders", ordersResult.count || 0],["Revenue", formatMoney(revenue, "NGN")],["Failed payments", failedResult.count || 0]];
  return <><div className="admin-title"><p>OVERVIEW</p><h1>Keep the work moving.</h1></div><div className="stats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="admin-actions"><Link className="button" href="/admin/videos/new">Add project</Link><Link href="/admin/videos">Reorder portfolio</Link><Link href="/admin/courses/new">Add course</Link><Link href="/admin/orders">View orders</Link><Link href="/admin/enquiries">View enquiries</Link></div></>;
}

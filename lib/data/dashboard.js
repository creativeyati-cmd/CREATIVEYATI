import "server-only";
import { createSupabaseServerClient, getAdminUser } from "@/lib/supabase/server";
import { dailySeries, dayKey, platformProgress } from "@/lib/dashboard-metrics";

export async function readDashboardRows(query) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query().range(offset, offset + 499);
    if (error || !data) throw new Error("Dashboard data could not be loaded. Please try again.");
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export async function getAdminWorkspace() {
  if (!await getAdminUser()) throw new Error("Administrator access required.");
  const db = await createSupabaseServerClient();
  const now = new Date();
  const rows = (table, columns, filter = query => query) => readDashboardRows(() => filter(db.from(table).select(columns)).order("id"));
  const count = async (table, filter = query => query) => {
    const { count, error } = await filter(db.from(table).select("id", { count: "exact", head: true }));
    if (error || count == null) throw new Error("Dashboard counts are unavailable.");
    return count;
  };
  const [courses, students, certificates, newStudents, orders, enrolments, lessons, progress, enquiries, pending, drafts, projects, activity] = await Promise.all([
    rows("courses", "id,title,status,created_at", q => q.is("deleted_at", null)),
    count("student_profiles"), count("certificates", q => q.eq("status", "valid")),
    rows("student_profiles", "id,created_at", q => q.gte("created_at", new Date(now.getTime() - 61 * 86400000).toISOString())),
    rows("orders", "id,amount_minor,currency,paid_at", q => q.eq("payment_status", "successful").gte("paid_at", new Date(now.getTime() - 190 * 86400000).toISOString())),
    rows("enrolments", "id,student_id,course_id", q => q.eq("active", true)),
    rows("course_lessons", "id,course_id", q => q.eq("status", "published")),
    rows("lesson_progress", "id,student_id,course_id,lesson_id,completed", q => q.eq("completed", true)),
    count("enquiries", q => q.eq("status", "new")),
    count("orders", q => q.eq("payment_status", "pending")),
    count("videos", q => q.eq("status", "draft")),
    count("videos", q => q.eq("status", "published")),
    db.from("certificates").select("id,course_title,issued_at").eq("status", "valid").order("issued_at", { ascending: false }).limit(3),
  ]);
  if (activity.error) throw new Error("Recent activity could not be loaded.");
  const month = dayKey(now).slice(0, 7);
  const monthlyOrders = orders.filter(row => dayKey(row.paid_at).startsWith(month));
  const currencies = [...new Set(["NGN", ...orders.map(row => row.currency)])];
  const revenue = Object.fromEntries(currencies.map(currency => [currency, dailySeries(orders.filter(row => row.currency === currency), "paid_at", 180, now, row => Number(row.amount_minor) / 100)]));
  const published = courses.filter(row => row.status === "published");
  const spotlight = published[0] || courses[0] || null;
  const activeEnrolments = enrolments.filter(row => published.some(course => course.id === row.course_id));
  return {
    courses: published.length, students, certificates, revenue,
    monthlyRevenue: monthlyOrders.filter(row => row.currency === "NGN").reduce((sum, row) => sum + Number(row.amount_minor), 0) / 100,
    otherCurrencies: [...new Set(monthlyOrders.filter(row => row.currency !== "NGN").map(row => row.currency))],
    growth: dailySeries(newStudents, "created_at", 60, now),
    newStudents: newStudents.filter(row => dayKey(row.created_at).startsWith(month)).length,
    spotlight: spotlight && { ...spotlight, ...platformProgress(enrolments.filter(row => row.course_id === spotlight.id), lessons, progress), enrolled: enrolments.filter(row => row.course_id === spotlight.id).length, lessons: lessons.filter(row => row.course_id === spotlight.id).length },
    health: platformProgress(activeEnrolments, lessons, progress), enquiries, pending, drafts, projects,
    draftCourses: courses.filter(row => row.status === "draft").length,
    activity: activity.data, month: now.toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "Africa/Lagos" }),
  };
}

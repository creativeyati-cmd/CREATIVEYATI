import DataTable, { Pagination } from "@/Components/DataTable";
import Drawer from "@/Components/Drawer";
import { Input, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { createSupabaseServerClient, getAdminUser } from "@/lib/supabase/server";
import { readDashboardRows } from "@/lib/data/dashboard";

export default async function StudentsPage({ searchParams }) {
  if (!await getAdminUser()) throw new Error("Administrator access required.");
  const params = await searchParams;
  const search = String(params.q || "").trim().slice(0, 100).replace(/[%_]/g, "");
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.page, 10) || 1));
  const db = await createSupabaseServerClient();
  let query = db.from("student_profiles").select("id,full_name,created_at", { count: "exact" }).order("created_at", { ascending: false }).order("id");
  if (search) query = query.ilike("full_name", `%${search}%`);
  const { data, count, error } = await query.range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Students could not be loaded. Please try again.");
  const ids = data.map(row => row.id);
  const enrolments = ids.length ? await readDashboardRows(() => db.from("enrolments").select("id,student_id,course_id,courses(title)").in("student_id", ids).eq("active", true).order("id")) : [];
  const pageLink = number => `/admin/students?q=${encodeURIComponent(search)}&page=${number}`;
  return <><PageHeader title={<>Students</>} eyebrow={<>ACADEMY</>} description={<>Manage student profiles and course enrolments.</>}/><p><Link className="button" href="/admin/communications/messages">Send message to paid students</Link></p><form className="admin-form activity-filters" action="/admin/students"><label>Search by name<Input type="search" name="q" defaultValue={search} maxLength={100}/></label><Button className="button">Search students</Button></form><DataTable label="Students" searchable={false} pageSize={25} emptyTitle="No students found" emptyDescription="Try another name or clear your search."><div><b>Student</b><b>Registered</b><b>Active enrolments</b><b>Actions</b></div>{data.map(student => { const courses = enrolments.filter(row => row.student_id === student.id); return <div key={student.id}><strong>{student.full_name || "Student"}</strong><span>{new Date(student.created_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</span><span>{courses.length} courses</span><Drawer label={student.full_name || "Student"} trigger="View student"><Link className="button" href={`/admin/communications/messages?student=${student.id}`}>Send message</Link><h3>Active enrolments</h3>{courses.length ? <div className="admin-list">{courses.map(row => <Link key={row.id} href={`/admin/courses/${row.course_id}/students`}>{row.courses?.title || "View course enrolment"}</Link>)}</div> : <p>No active enrolments.</p>}</Drawer></div>; })}</DataTable><Pagination previous={page > 1 ? pageLink(page - 1) : undefined} next={page * 25 < count ? pageLink(page + 1) : undefined} label="Student pages">Page {page} · {count} students</Pagination></>;
}

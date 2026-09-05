import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAdminCourse } from "@/lib/data/courses";
import { grantCourseAccess, revokeCourseAccess } from "@/app/admin/actions";

export default async function CourseStudentsPage({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await getAdminCourse(id);
  if (!course) notFound();
  const service = createSupabaseServiceClient();
  const [{ data: enrolments = [], error: enrolmentsError }, usersResult] = await Promise.all([
    service.from("enrolments").select("*").eq("course_id", id).order("created_at", { ascending: false }),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const users = new Map((usersResult.data?.users || []).map((user) => [user.id, user]));

  return <>
    <div className="admin-title"><p>COURSES</p><h1>{course.title} students</h1><div className="admin-subnav"><Link href={`/admin/courses/${id}/edit`}>Course details</Link><Link href={`/admin/courses/${id}/curriculum`}>Curriculum</Link></div></div>
    {query.saved === "granted" && <p className="success-note">Course access granted.</p>}
    {query.saved === "revoked" && <p className="success-note">Course access revoked.</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    {(enrolmentsError || usersResult.error) && <p className="form-error">Student access records could not be loaded.</p>}
    <form className="admin-form compact" action={grantCourseAccess}><input type="hidden" name="courseId" value={id} /><label>Student email<input type="email" name="email" required /></label><button className="button">Grant access</button></form>
    {enrolments.length ? <div className="admin-list">{enrolments.map((enrolment) => <form key={enrolment.id} action={revokeCourseAccess}><input type="hidden" name="id" value={enrolment.id} /><input type="hidden" name="courseId" value={id} /><span>{users.get(enrolment.student_id)?.email || enrolment.student_id}<small>{enrolment.access_source} · {enrolment.active ? "Active" : "Revoked"}</small></span>{enrolment.active && <button>Revoke access</button>}</form>)}</div> : !enrolmentsError && <p>No enrolled students yet.</p>}
  </>;
}

import DataTable from "@/Components/DataTable";
import Badge from "@/Components/Badge";
import ConfirmActionForm from "@/Components/ConfirmActionForm";
import { Input, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import CourseWorkflowNav from "@/Components/CourseWorkflowNav";
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
    <PageHeader title={<>{course.title} students</>} eyebrow={<>COURSES</>}/><CourseWorkflowNav courseId={id} course={course} active="students" />
    {query.saved === "granted" && <p className="success-note">Course access granted.</p>}
    {query.saved === "revoked" && <p className="success-note">Course access revoked.</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    {(enrolmentsError || usersResult.error) && <p className="form-error">Student access records could not be loaded.</p>}
    <form className="admin-form compact" action={grantCourseAccess}><Input type="hidden" name="courseId" value={id} /><label>Student email<Input type="email" name="email" required /></label><label className="check-label"><input type="checkbox" name="paidApproved"/>I have verified payment for this manual enrollment</label><Button className="button">Grant access</Button></form>
    <DataTable label="Enrolments" error={enrolmentsError ? "Student access records could not be loaded." : undefined} emptyTitle="No enrolled students yet" emptyDescription="Grant access above to enrol a student."><div><b>Student</b><b>Source</b><b>Status</b><b>Actions</b></div>{enrolments.map(enrolment => <div key={enrolment.id}><span>{users.get(enrolment.student_id)?.email || enrolment.student_id}</span><span>{enrolment.access_source}</span><Badge tone={enrolment.active ? "success" : "error"}>{enrolment.active ? "Active" : "Revoked"}</Badge><span>{enrolment.active && <ConfirmActionForm action={revokeCourseAccess} fields={{id:enrolment.id,courseId:id}} className="danger-action" label="Revoke access" confirmText="Revoke this student's access to the course?"/>}</span></div>)}</DataTable>
  </>;
}

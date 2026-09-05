import Link from "next/link";
import { notFound } from "next/navigation";
import CourseForm from "@/Components/CourseForm";
import CourseWorkflowNav from "@/Components/CourseWorkflowNav";
import AdminToast from "@/Components/AdminToast";
import { getAdminCourse } from "@/lib/data/courses";
import { getCoursePublishIssues } from "@/lib/data/course-publishing";
import { deleteCourse, duplicateCourse, saveCourse, updateCoursePublication } from "@/app/admin/actions";
import ConfirmSubmitButton from "@/Components/ConfirmSubmitButton";

export default async function EditCoursePage({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]); const course = await getAdminCourse(id); if (!course) notFound(); const step = ["details", "pricing", "publish"].includes(query.step) ? query.step : "details"; const issues = step === "publish" ? await getCoursePublishIssues(id) : [];
  return <><div className="admin-title"><p>COURSES</p><h1>{course.title}</h1><p className="admin-lede">Build, preview and publish this course through one connected workflow.</p><div className="admin-subnav"><Link href="/admin/courses">All courses</Link><Link href={`/admin/courses/${id}/students`}>Students</Link></div></div>
    <CourseWorkflowNav courseId={id} course={course} active={step} />
    <AdminToast message={query.error || (query.saved ? query.saved === "1" ? "Course draft saved." : `Course ${query.saved}.` : "")} kind={query.error ? "error" : "success"} />
    {step !== "publish" ? <div className="course-editor-shell"><CourseForm course={course} action={saveCourse} step={step} /><aside className="course-editor-sidebar"><small>DRAFT STATUS</small><strong>{course.status}</strong><p>{step === "details" ? "Complete the public information, cover and promotional preview." : "Free courses bypass payment. Paid checkout uses the stored database price through Bachs."}</p><dl><div><dt>Sections</dt><dd>{course.sections.length}</dd></div><div><dt>Lessons</dt><dd>{course.sections.reduce((total, section) => total + section.lessons.length, 0)}</dd></div></dl></aside></div> : <section className="course-publish-panel">
      <div><p className="eyebrow">CURRENT STATUS</p><h2>{course.status}</h2>{course.scheduledFor && <p>Scheduled for {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(course.scheduledFor))}</p>}</div>
      <section><h2>Publish checklist</h2>{issues.length ? <ul className="publish-issues">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="field-success">Ready to publish. The course has the required details, pricing and lesson content.</p>}</section>
      <form action={updateCoursePublication} className="publish-actions"><input type="hidden" name="courseId" value={id} /><button className="button" name="intent" value="publish" disabled={issues.length > 0}>Publish now</button><label>Schedule date and time<input type="datetime-local" name="scheduledFor" defaultValue={course.scheduledFor?.slice(0, 16)} /></label><button name="intent" value="schedule" disabled={issues.length > 0}>Schedule</button>{["published", "scheduled"].includes(course.status) && <button name="intent" value="unpublish">Unpublish</button>}<button name="intent" value="archive">Archive</button></form>
      <div className="course-danger-zone"><h2>Course actions</h2><form action={duplicateCourse}><input type="hidden" name="courseId" value={id} /><button>Duplicate course</button></form><form action={deleteCourse}><input type="hidden" name="courseId" value={id} /><ConfirmSubmitButton message="Delete this course from the dashboard? Existing student and order records are retained.">Delete course</ConfirmSubmitButton></form></div>
    </section>}
  </>;
}

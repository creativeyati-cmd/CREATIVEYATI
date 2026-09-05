import Link from "next/link";
import { formatMoney, getAdminCourses } from "@/lib/data/courses";

export default async function AdminCoursesPage() {
  const courses = await getAdminCourses();
  return <>
    <div className="admin-title"><p>COURSES</p><h1>Courses</h1><p className="admin-lede">Create the course first, then add video links, lesson content and uploaded PDFs in Curriculum.</p><Link className="button" href="/admin/courses/new">Add course</Link></div>
    {courses.length ? <div className="admin-list course-admin-list">{courses.map((course) => <div key={course.id}>
      <span>{course.title}<small>{course.category || "Uncategorised"} · {course.status} · {course.isFree ? "Free" : formatMoney(course.priceMinor, course.currency)}</small></span>
      <span className="course-row-actions"><Link href={`/admin/courses/${course.id}/edit`}>Edit details</Link><Link href={`/admin/courses/${course.id}/curriculum`}>Curriculum</Link></span>
    </div>)}</div> : <p className="empty-state">No courses yet. Add a course to start building its curriculum.</p>}
  </>;
}

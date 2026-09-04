import Link from "next/link";
import { notFound } from "next/navigation";
import CourseForm from "@/Components/CourseForm";
import { getAdminCourse } from "@/lib/data/courses";
import { saveCourse } from "@/app/admin/actions";
export default async function EditCoursePage({ params, searchParams }) { const [{ id }, query] = await Promise.all([params, searchParams]); const course = await getAdminCourse(id); if (!course) notFound(); return <><div className="admin-title"><p>COURSES</p><h1>Edit course</h1><div className="admin-subnav"><Link href="/admin/courses">All courses</Link><Link href={`/admin/courses/${id}/curriculum`}>Curriculum</Link><Link href={`/admin/courses/${id}/students`}>Students</Link><Link href={`/courses/${course.slug}`} target="_blank">Preview</Link></div></div>{query.saved && <p className="success-note">Course saved.</p>}{query.error && <p className="form-error">{query.error}</p>}<CourseForm course={course} action={saveCourse} /></>; }

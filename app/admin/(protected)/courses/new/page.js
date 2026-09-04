import Link from "next/link";
import CourseForm from "@/Components/CourseForm";
import { saveCourse } from "@/app/admin/actions";
export default async function NewCoursePage({ searchParams }) { const query = await searchParams; return <><div className="admin-title"><p>COURSES</p><h1>Add course</h1><Link href="/admin/courses">Back to courses</Link></div>{query.error && <p className="form-error">{query.error}</p>}<CourseForm action={saveCourse} /></>; }

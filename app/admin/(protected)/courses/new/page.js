import Link from "next/link";
import CourseForm from "@/Components/CourseForm";
import CourseWorkflowNav from "@/Components/CourseWorkflowNav";
import AdminToast from "@/Components/AdminToast";
import { saveCourse } from "@/app/admin/actions";

export default async function NewCoursePage({ searchParams }) { const query = await searchParams; return <><div className="admin-title"><p>COURSES</p><h1>Add course</h1><p className="admin-lede">Start with the public course information. Curriculum and media unlock after the draft is saved.</p><Link href="/admin/courses">Back to courses</Link></div><CourseWorkflowNav active="details" /><AdminToast message={query.error || ""} kind="error" /><div className="course-editor-shell"><CourseForm action={saveCourse} step="details" /><aside className="course-editor-sidebar"><small>STEP 1 OF 6</small><strong>Course details</strong><p>Save this page to create the draft. Pricing, curriculum, materials, preview and publishing then become available.</p></aside></div></>; }

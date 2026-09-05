import { notFound } from "next/navigation";
import CourseWorkflowNav from "@/Components/CourseWorkflowNav";
import AdminToast from "@/Components/AdminToast";
import { deleteCourseResource } from "@/app/admin/actions";
import { getAdminCourse } from "@/lib/data/courses";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export default async function MaterialsPage({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]); const course = await getAdminCourse(id); if (!course) notFound(); const service = createSupabaseServiceClient(); const { data: materials = [] } = await service.from("course_resources").select("*").eq("course_id", id).is("lesson_id", null).order("display_order");
  return <><div className="admin-title"><p>COURSES</p><h1>{course.title} materials</h1><p className="admin-lede">Upload private course-level PDFs. Students receive short-lived signed access after enrolment.</p></div><CourseWorkflowNav courseId={id} course={course} active="materials" /><AdminToast message={query.error || (query.saved ? query.saved === "deleted" ? "Material removed." : "Material saved." : "")} kind={query.error ? "error" : "success"} />
    <section className="course-materials-list">{materials.map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{item.description}</p><small>{Math.ceil(Number(item.file_size || 0) / 1024)} KB · {item.allow_download ? "download enabled" : "view only"}{item.preview_allowed ? " · public preview" : ""}</small></div><a href={`/api/learn/resources/${item.id}?admin=1`} target="_blank" rel="noreferrer">Preview</a><form action={deleteCourseResource}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="courseId" value={id} /><input type="hidden" name="returnTo" value="materials" /><button>Remove</button></form></article>)}</section>
    <form className="admin-form course-material-upload" action="/api/admin/course-resource" method="post" encType="multipart/form-data"><input type="hidden" name="courseId" value={id} /><label>Material title<input name="title" required /></label><label>Description<input name="description" /></label><label className="form-wide">PDF file<input type="file" name="file" accept="application/pdf,.pdf" required /></label><label className="check-label"><input type="checkbox" name="allowDownload" />Allow student download</label><label className="check-label"><input type="checkbox" name="previewAllowed" />Allow public preview</label><button className="button">Upload private PDF</button></form>
  </>;
}

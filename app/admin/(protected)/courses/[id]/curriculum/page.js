import Link from "next/link";
import { notFound } from "next/navigation";
import CurriculumReorder from "@/Components/CurriculumReorder";
import { getAdminCourse } from "@/lib/data/courses";
import { deleteCourseLesson, deleteCourseResource, deleteCourseSection, saveCourseLesson, saveCourseSection } from "@/app/admin/actions";

const providers = ["", "youtube", "vimeo", "mux", "bunny", "cloudflare"];

function LessonFields({ lesson }) {
  return <>
    <label>Title<input name="title" defaultValue={lesson?.title} required /></label>
    <label>Slug<input name="slug" defaultValue={lesson?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
    <label>Type<select name="lessonType" defaultValue={lesson?.lessonType || "video"}><option value="video">Recorded video</option><option value="pdf">PDF</option><option value="text">Text</option><option value="external">External resource</option><option value="mixed">Mixed</option></select></label>
    <label>Video provider<select name="videoProvider" defaultValue={lesson?.videoProvider || ""}>{providers.map((value) => <option key={value} value={value}>{value || "None"}</option>)}</select></label>
    <label>Video asset ID<input name="videoAssetId" defaultValue={lesson?.videoAssetId} /></label>
    <label>Protected video URL<input type="url" name="videoUrl" defaultValue={lesson?.videoUrl} /></label>
    <label>External resource URL<input type="url" name="externalUrl" defaultValue={lesson?.externalUrl} /></label>
    <label>Duration in seconds<input type="number" name="durationSeconds" min="0" defaultValue={lesson?.durationSeconds || 0} /></label>
    <label className="form-wide">Lesson text<textarea name="body" rows="5" defaultValue={lesson?.body} /></label>
    <label className="check-label"><input type="checkbox" name="isPreview" defaultChecked={lesson?.isPreview} />Free preview</label>
  </>;
}

function ResourceEditor({ course, lesson }) {
  return <section className="resource-admin">
    <h3>Private PDF resources</h3>
    {lesson.resources.map((resource) => <div key={resource.id} className="resource-row">
      <span>{resource.title} · {resource.allowDownload ? "Download allowed" : "View only"} · <a href={`/api/learn/resources/${resource.id}?admin=1`} target="_blank" rel="noreferrer">Preview</a></span>
      <details><summary>Replace PDF</summary><form action="/api/admin/course-resource" method="post" encType="multipart/form-data">
        <input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="lessonId" value={lesson.id} /><input type="hidden" name="replacementId" value={resource.id} />
        <label>Resource title<input name="title" defaultValue={resource.title} required /></label><label>New PDF<input type="file" name="file" accept="application/pdf,.pdf" required /></label><label className="check-label"><input type="checkbox" name="allowDownload" defaultChecked={resource.allowDownload} />Allow download</label><button className="button">Replace safely</button>
      </form></details>
      <form action={deleteCourseResource}><input type="hidden" name="id" value={resource.id} /><input type="hidden" name="courseId" value={course.id} /><button>Remove</button></form>
    </div>)}
    <form action="/api/admin/course-resource" method="post" encType="multipart/form-data">
      <input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="lessonId" value={lesson.id} />
      <label>Resource title<input name="title" required /></label><label>PDF<input type="file" name="file" accept="application/pdf,.pdf" required /></label><label className="check-label"><input type="checkbox" name="allowDownload" />Allow download</label><button className="button">Upload private PDF</button>
    </form>
  </section>;
}

export default async function CurriculumPage({ params, searchParams }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await getAdminCourse(id);
  if (!course) notFound();
  const savedMessage = query.saved === "resource" ? "Resource saved." : query.saved === "section" ? "Section saved." : query.saved === "lesson" ? "Lesson saved." : query.saved === "deleted" ? "Curriculum item deleted." : "";

  return <>
    <div className="admin-title"><p>COURSES</p><h1>{course.title} curriculum</h1><div className="admin-subnav"><Link href={`/admin/courses/${id}/edit`}>Course details</Link><Link href={`/admin/courses/${id}/students`}>Students</Link></div></div>
    {savedMessage && <p className="success-note">{savedMessage}</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    <CurriculumReorder courseId={course.id} sections={course.sections} />
    <section className="curriculum-editor">
      {course.sections.map((section) => <article key={section.id} className="curriculum-section">
        <form className="admin-form compact" action={saveCourseSection}>
          <input type="hidden" name="id" value={section.id} /><input type="hidden" name="courseId" value={course.id} />
          <label>Section title<input name="title" defaultValue={section.title} required /></label><label>Description<input name="description" defaultValue={section.description} /></label><button className="button">Update section</button><button formAction={deleteCourseSection}>Delete section</button>
        </form>
        {section.lessons.map((lesson) => <details key={lesson.id} className="lesson-editor"><summary>{lesson.title} {lesson.isPreview && <small>Preview</small>}</summary>
          <form className="admin-form" action={saveCourseLesson}><input type="hidden" name="id" value={lesson.id} /><input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="sectionId" value={section.id} /><LessonFields lesson={lesson} /><button className="button">Update lesson</button><button formAction={deleteCourseLesson}>Delete lesson</button></form>
          <ResourceEditor course={course} lesson={lesson} />
        </details>)}
        <details className="lesson-editor"><summary>Add lesson to {section.title}</summary><form className="admin-form" action={saveCourseLesson}><input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="sectionId" value={section.id} /><LessonFields /><button className="button">Add lesson</button></form></details>
      </article>)}
    </section>
    <form className="admin-form compact" action={saveCourseSection}><input type="hidden" name="courseId" value={course.id} /><label>New section title<input name="title" required /></label><label>Description<input name="description" /></label><button className="button">Add section</button></form>
    <p className="form-warning">For paid lessons, use Vimeo domain privacy or another protected provider. YouTube unlisted links are convenient but are not strong content protection.</p>
  </>;
}

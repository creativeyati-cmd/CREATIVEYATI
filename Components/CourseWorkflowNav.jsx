import Link from "next/link";

const steps = [["details", "Details"], ["pricing", "Pricing"], ["curriculum", "Curriculum"], ["materials", "Materials"], ["preview", "Preview"], ["publish", "Publish"]];

export default function CourseWorkflowNav({ courseId, course, active = "details" }) {
  const completion = { details: Boolean(course?.title && course?.description && course?.coverImageUrl), pricing: Boolean(course?.isFree || course?.priceMinor > 0), curriculum: Boolean(course?.sections?.some((section) => section.lessons?.length)), materials: Boolean(courseId), preview: Boolean(courseId), publish: ["published", "scheduled"].includes(course?.status) };
  return <nav className="course-workflow-nav" aria-label="Course setup steps">{steps.map(([key, label], index) => {
    const href = !courseId ? (key === "details" ? "/admin/courses/new" : "") : ["curriculum", "materials", "preview"].includes(key) ? `/admin/courses/${courseId}/${key}` : `/admin/courses/${courseId}/edit?step=${key}`;
    const content = <><small>{completion[key] ? "✓" : index + 1}</small><span>{label}</span></>;
    return href ? <Link key={key} href={href} data-complete={completion[key] || undefined} aria-current={active === key ? "step" : undefined}>{content}</Link> : <span key={key} aria-disabled="true">{content}</span>;
  })}</nav>;
}

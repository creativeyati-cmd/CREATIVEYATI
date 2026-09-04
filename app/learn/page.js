import Link from "next/link";
import { updateStudentProfile } from "@/app/student-actions";
import { formatMoney, getStudentDashboard } from "@/lib/data/courses";

export const metadata = { title: "My learning" };

function courseState(item) {
  const lessons = item.course?.sections.flatMap((section) => section.lessons) || [];
  const completed = item.progress.filter((entry) => entry.completed).length;
  const percent = lessons.length ? Math.round(completed / lessons.length * 100) : 0;
  const recentProgress = [...item.progress].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
  const recentLesson = lessons.find((lesson) => lesson.id === recentProgress?.lesson_id);
  const nextLesson = recentLesson || lessons.find((lesson) => !item.progress.some((entry) => entry.lesson_id === lesson.id && entry.completed)) || lessons[0];
  const resources = item.course?.sections.flatMap((section) => section.lessons.flatMap((lesson) => lesson.resources.map((resource) => ({ ...resource, lessonTitle: lesson.title })))) || [];
  return { lessons, percent, recentProgress, recentLesson, nextLesson, resources };
}

export default async function LearnPage({ searchParams }) {
  const [{ user, profile, enrolments, orders }, query] = await Promise.all([getStudentDashboard(), searchParams]);
  const states = enrolments.map((item) => ({ item, ...courseState(item) }));
  const completedCount = states.filter((entry) => entry.lessons.length > 0 && entry.percent === 100).length;
  const latest = states.filter((entry) => entry.recentLesson).sort((a, b) => new Date(b.recentProgress.updated_at) - new Date(a.recentProgress.updated_at))[0];
  const resources = states.flatMap((entry) => entry.resources.map((resource) => ({ ...resource, course: entry.item.course })));

  return <section className="learn-dashboard public-note">
    <p className="eyebrow">MY LEARNING</p><h1 className="page-title">Keep going.</h1>
    {query.message && <p className="success-note">{query.message}</p>}{query.error && <p className="form-error">{query.error}</p>}
    <details className="student-profile"><summary>Profile</summary><form action={updateStudentProfile}><label>Name<input name="fullName" defaultValue={profile?.full_name || user?.user_metadata?.full_name || ""} required /></label><label>Email<input value={user?.email || ""} disabled /></label><button className="button">Save profile</button></form></details>
    <div className="learning-summary"><div><small>Enrolled</small><strong>{states.length}</strong></div><div><small>Completed</small><strong>{completedCount}</strong></div><div><small>Recently viewed</small><strong>{latest ? latest.recentLesson.title : "Start a lesson"}</strong></div></div>
    {states.length ? <div className="learning-grid">{states.map(({ item, percent, recentLesson, nextLesson }) => <article key={item.id}><img src={item.course.coverImageUrl} alt="" /><div><span>{percent}% complete</span><h2>{item.course.title}</h2>{recentLesson && <small>Last viewed: {recentLesson.title}</small>}<progress max="100" value={percent}>{percent}%</progress><Link className="button" href={nextLesson ? `/learn/${item.course.slug}/lesson/${nextLesson.id}` : `/learn/${item.course.slug}`}>{percent === 100 ? "Review course" : "Continue learning"}</Link></div></article>)}</div> : <div className="empty-state"><p>You have not enrolled in a course yet.</p><Link className="button" href="/courses">Browse courses</Link></div>}
    {resources.length > 0 && <section className="student-downloads"><h2>Course materials</h2><div className="admin-list">{resources.map((resource) => <div key={resource.id}><span>{resource.title}<small>{resource.course.title} · {resource.lessonTitle}</small></span><span><a className="inline-link" href={`/api/learn/resources/${resource.id}`} target="_blank" rel="noreferrer">View</a>{resource.allowDownload && <a className="inline-link" href={`/api/learn/resources/${resource.id}?download=1`}>Download</a>}</span></div>)}</div></section>}
    <section className="purchase-history"><h2>Purchase history</h2>{orders.length ? <div className="admin-list">{orders.map((order) => <div key={order.id}><span>{order.courses?.title || order.reference}<small>{order.reference}</small></span><strong>{formatMoney(order.amount_minor, order.currency)} · {order.payment_status}</strong></div>)}</div> : <p>No purchases yet.</p>}</section>
  </section>;
}

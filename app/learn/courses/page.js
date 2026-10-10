import { PageHeader } from "@/Components/DashboardPageShell";
import { courseState } from "@/lib/learning-progress";
import Link from "next/link";
import Image from "next/image";
import { getStudentDashboard } from "@/lib/data/courses";
import Tabs from "@/Components/Tabs";
import { EmptyState } from "@/Components/Feedback";

export const metadata = { title: "My courses" };
export const dynamic = "force-dynamic";


const TABS = [
  { value: "", label: "All" },
  { value: "progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export default async function MyCoursesPage({ searchParams }) {
  const [{ enrolments }, query] = await Promise.all([getStudentDashboard(), searchParams]);
  const status = String(query.status || "");
  const states = enrolments.map((item) => ({ item, ...courseState(item) }));
  const filtered = states.filter((entry) => status === "completed" ? entry.percent === 100 : status === "progress" ? entry.percent < 100 : true);
  const counts = { "": states.length, progress: states.filter((entry) => entry.percent < 100).length, completed: states.filter((entry) => entry.percent === 100).length };
  const resources = states.flatMap((entry) => entry.resources.map((resource) => ({ ...resource, course: entry.item.course })));

  return <section className="public-note">
    <PageHeader title={<>My courses</>} eyebrow={<>MY LEARNING</>} description={<>Everything you are enrolled in, with progress and the next lesson.</>}/>
    {states.length ? <>
      <Tabs basePath="/learn/courses" param="status" current={status} items={TABS.map((tab) => ({ value: tab.value, label: tab.label, count: counts[tab.value] }))} />
      <div className="learning-grid">{filtered.map(({ item, percent, nextLesson }) => <article key={item.id}>
        {item.course.coverImageUrl ? <Image src={item.course.coverImageUrl} alt={item.course.title + " cover"} width={640} height={360} sizes="(max-width: 767px) 90vw, 180px" unoptimized /> : null}
        <div>
          <span className="fm-ring" style={{ background: "conic-gradient(#2c543c " + (percent * 3.6) + "deg, #E9E9E1 0deg)" }} role="img" aria-label={percent + " percent complete"}><span>{percent}%</span></span>
          <h2>{item.course.title}</h2>
          <p className="fm-continue-meta">{nextLesson ? "Next: " + nextLesson.title : "All lessons complete"}</p>
          <progress max="100" value={percent}>{percent}%</progress>
          <Link className="button" href={nextLesson ? "/learn/" + item.course.slug + "/lesson/" + nextLesson.id : "/learn/" + item.course.slug}>{percent === 100 ? "Review course" : "Continue"}</Link>
        </div>
      </article>)}</div>
      {!filtered.length && <EmptyState title="Nothing here yet">Nothing in this tab.</EmptyState>}
    </> : <EmptyState title="You haven't enrolled yet" action={<Link className="button" href="/courses">Browse courses</Link>}>When you enrol, your course appears here with its progress and the next lesson.</EmptyState>}
    {resources.length > 0 && <section className="student-downloads"><h2>Course materials</h2><div className="admin-list">{resources.map((resource) => <div key={resource.id}><span>{resource.title}<small>{resource.course.title} / {resource.lessonTitle}</small></span><span><a className="inline-link" href={"/api/learn/resources/" + resource.id} target="_blank" rel="noreferrer">View</a>{resource.allowDownload && <a className="inline-link" href={"/api/learn/resources/" + resource.id + "?download=1"}>Download</a>}</span></div>)}</div></section>}
  </section>;
}

import { Select } from "./FormControls";
import { PageHeader } from "./DashboardPageShell";
import { MetricCard } from "./WorkspaceParts";
import Link from "next/link";
import WorkspaceChart from "./WorkspaceChart";
import SubmitButton from "./SubmitButton";
import { WorkspaceIcon as Icon, ProgressBar, ProgressRing } from "./WorkspaceParts";
import { courseState } from "@/lib/learning-progress";
import { dailySeries, learningStreak } from "@/lib/dashboard-metrics";
import "./admin-workspace.css";
import "./student-workspace.css";
import "./live-workspace.css";

export default function StudentWorkspace({ dashboard, certificates, query, saveGoal }) {
  const { user, enrolments, progress = [] } = dashboard;
  const states = enrolments.filter(item => item.course).map(item => ({ item, ...courseState(item) }));
  const completed = states.reduce((sum, state) => sum + state.completed, 0);
  const total = states.reduce((sum, state) => sum + state.lessons.length, 0);
  const ongoing = states.filter(state => state.lessons.length && state.percent < 100);
  const current = [...ongoing].sort((a, b) => new Date(b.recentProgress?.updated_at || 0) - new Date(a.recentProgress?.updated_at || 0))[0] || states[0];
  const done = new Set(progress.filter(row => row.completed).map(row => row.lesson_id));
  const upcoming = current?.lessons.filter(lesson => !done.has(lesson.id)).slice(0, 3) || [];
  const lessonHref = (state, lesson) => `/learn/${state.item.course.slug}${lesson ? `/lesson/${lesson.id}` : ""}`;
  const milestones = [...ongoing].sort((a, b) => b.percent - a.percent);
  const milestone = milestones[0];
  const validCertificates = certificates.filter(item => item.status === "valid");
  const series = dailySeries(progress.filter(row => row.completed), "completed_at", 14);
  const goal = [3, 5, 7].includes(user?.user_metadata?.weekly_learning_goal) ? user.user_metadata.weekly_learning_goal : 5;
  const streak = learningStreak(progress);
  const weekly = series.slice(-7).reduce((sum, row) => sum + row.value, 0);
  const activity = [
    ...states.flatMap(state => state.item.progress.filter(row => row.completed && row.completed_at && state.lessons.some(lesson => lesson.id === row.lesson_id)).map(row => ({ id: row.lesson_id, title: `Completed ${state.lessons.find(lesson => lesson.id === row.lesson_id).title}`, detail: state.item.course.title, date: row.completed_at, href: lessonHref(state, { id: row.lesson_id }), icon: "check" }))),
    ...validCertificates.map(item => ({ id: item.id, title: "Certificate earned", detail: item.courseTitle, date: item.issuedAt, href: "/learn/certificates", icon: "award" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  const metrics = [
    { label: "Courses in progress", value: ongoing.length, icon: "book", href: "/learn/courses", caption: "Your next creative chapter" },
    { label: "Lessons completed", value: completed, icon: "check", href: "#learning-momentum", caption: `${total} lessons across your courses` },
    { label: "Certificates earned", value: validCertificates.length, icon: "award", href: "/learn/certificates", caption: "Achievements, made official", gold: true },
    { label: "Current streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, icon: "flame", href: "#weekly-goal", caption: "Consecutive days completing lessons" },
  ];
  return <div className="student-workspace live-workspace">
    <PageHeader title="Your workspace, organised." eyebrow="YOUR CREATIVE WORKSPACE" description={completed ? "You’re making real progress. Keep going." : "Your next creative chapter starts with one lesson."} actions={<Link href="#recent-activity" className="sw-bell" aria-label="View recent learning activity"><Icon name="bell"/></Link>}/>
    {query.message && <p role="status" className="success-note">{query.message}</p>}{query.error && <p role="alert" className="form-error">{query.error}</p>}
    <section className="dashboard-metrics" aria-label="Your learning at a glance">{metrics.map(item => <MetricCard key={item.label} {...item}/>)}</section>
    <div className="sw-columns"><div className="sw-primary">
      <section className="sw-continue sw-card"><div className="sw-continue-copy"><p className="sw-eyebrow">{current ? "CONTINUE LEARNING" : "MAKE YOUR FIRST MOVE"}</p><h2>{current?.item.course.title || "Turn your ideas into films."}</h2><p className="sw-module">{current?.nextLesson?.title || "Explore practical courses and build your creative confidence."}</p>{current && <><div className="sw-progress-label"><strong>{current.percent}% complete</strong><span>{current.completed} of {current.lessons.length} lessons</span></div><ProgressBar value={current.percent} label="Course completion"/></>}<div className="sw-resume"><Link className="sw-primary-button" href={current ? lessonHref(current, current.nextLesson) : "/courses"}>{current ? current.percent === 100 ? "Review course" : "Continue lesson" : "Browse courses"}<Icon name="arrow"/></Link></div></div><div className="sw-film-art" aria-hidden="true"><span className="sw-film-orbit"/><div className="sw-film-frame sw-film-back"/><div className="sw-film-frame sw-film-front"><span>YOUR NEXT CHAPTER</span><div className="sw-art-sun"/><div className="sw-art-hill"/></div></div></section>
      <div id="learning-momentum"><WorkspaceChart series={{ Lessons: series }} title="Your Learning Momentum"/></div>
      <section className="sw-card sw-activity" id="recent-activity"><div className="sw-section-title"><h2>A little progress, every day</h2><span className="sw-muted">Recent activity</span></div>{activity.length ? <ol>{activity.map(item => <li key={item.id}><span className="sw-activity-icon"><Icon name={item.icon}/></span><div><Link href={item.href}><strong>{item.title}</strong></Link><p>{item.detail}</p></div><time>{new Date(item.date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</time></li>)}</ol> : <p>Complete your first lesson to start your learning timeline.</p>}</section>
      <section className="sw-card sw-quick"><h2>Your courses</h2><div>{states.map(state => <Link key={state.item.id} href={lessonHref(state, state.nextLesson)}>{state.item.course.title}<span>{state.percent}% →</span></Link>)}{!states.length && <Link href="/courses">Find your first course →</Link>}</div></section>
    </div><div className="sw-secondary">
      <section className="sw-motivation sw-card"><span className="sw-motivation-label">KEEP SHOWING UP</span><div className="sw-growth-art" aria-hidden="true">{[25, 42, 58, 77, 100].map(height => <span key={height} style={{ height: `${height}%` }}><i/></span>)}</div><h2>{weekly >= goal ? "You reached your weekly goal." : "Small steps. Real progress."}</h2><p>{weekly} {weekly === 1 ? "lesson" : "lessons"} completed in the last 7 days. Your goal is {goal}.</p><span className="sw-keep">MAKE YOUR NEXT IDEA REAL</span></section>
      <section className="sw-card sw-milestone"><div className="sw-section-title"><h2>Your next milestone</h2><Icon name="award"/></div><div className="sw-milestone-content"><ProgressRing value={milestone?.percent || (total ? Math.round(completed / total * 100) : 0)}/><div><strong>{milestone?.item.course.title || (validCertificates.length ? "Celebrate your progress" : "Your first achievement")}</strong><p>{milestone ? `${milestone.lessons.length - milestone.completed} lessons left to complete this course.` : "Your certificates will appear here after course completion."}</p></div></div><Link className="sw-subtle-button" href="/learn/certificates">View certificates <Icon name="arrow"/></Link></section>
      <section className="sw-card sw-quick"><h2>Make your next move</h2><div>{[["Browse all courses", "/courses"], ["View certificates", "/learn/certificates"], ["Download receipts", "/learn/orders"], ["Edit profile", "/learn/profile"], ["Set weekly goal", "#weekly-goal"]].map(([label, href]) => <Link key={href} href={href}>{label}<span>→</span></Link>)}</div></section>
      <section className="sw-card sw-quick" id="weekly-goal"><h2>Your weekly goal</h2><p>Choose a rhythm that works for you. Saved to your account.</p><form action={saveGoal} className="workspace-goal"><label htmlFor="weeklyGoal">Lessons per week</label><Select id="weeklyGoal" name="weeklyGoal" defaultValue={goal}>{[3, 5, 7].map(value => <option value={value} key={value}>{value} lessons</option>)}</Select><SubmitButton pendingLabel="Saving goal…">Save goal</SubmitButton></form></section>
      <section className="sw-card sw-upcoming"><h2>Up next for you</h2>{upcoming.length ? upcoming.map((lesson, index) => <Link key={lesson.id} href={lessonHref(current, lesson)}><span className="sw-lesson-number">{index + 1}</span><span><strong>{lesson.title}</strong><small>{lesson.durationSeconds ? `${Math.ceil(lesson.durationSeconds / 60)} min · ` : ""}{lesson.lessonType} lesson</small></span><Icon name="arrow"/></Link>) : <p>{current ? "You’re all caught up. Review a lesson or explore another course." : "Your upcoming lessons will appear when you enrol."}</p>}</section>
    </div></div><footer className="sw-footer"><span>Progress starts with your next lesson.</span><span>KEEP CREATING.</span></footer>
  </div>;
}

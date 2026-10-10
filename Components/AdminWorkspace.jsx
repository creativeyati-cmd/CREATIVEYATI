import { PageHeader } from "./DashboardPageShell";
import { MetricCard } from "./WorkspaceParts";
import Link from "next/link";
import WorkspaceChart from "./WorkspaceChart";
import { WorkspaceIcon as Icon, ProgressBar } from "./WorkspaceParts";
import "./admin-workspace.css";
import "./live-workspace.css";

const money = value => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(value);
export default function AdminWorkspace({ data, paymentsReady }) {
  const course = data.spotlight;
  const metrics = [
    { label: "Active Courses", value: data.courses, icon: "book", href: "/admin/courses", caption: "Published courses" },
    { label: "Total Students", value: data.students, icon: "people", href: "/admin/students", caption: `${data.newStudents} joined this month` },
    { label: "Certificates Issued", value: data.certificates, icon: "award", href: "/admin/certificates", caption: "Valid certificates", gold: true },
    { label: "Monthly Revenue", value: money(data.monthlyRevenue), icon: "wallet", href: "/admin/orders", caption: "Successful course payments · NGN" },
  ];
  const attention = [
    { title: `${data.enquiries} new enquiries`, href: "/admin/enquiries", detail: "Review questions and project requests." },
    { title: `${data.pending} pending payments`, href: "/admin/orders", detail: "Review payment status before granting access." },
    { title: `${data.draftCourses} course drafts`, href: "/admin/courses", detail: "Finish modules, lessons, and publishing." },
  ];
  return <div className="admin-workspace live-workspace">
    <PageHeader title="Your workspace, organised." eyebrow="PLATFORM CONTROL CENTER" description="Admin overview · Your platform at a glance" actions={<><span className="aw-sample">LIVE PLATFORM DATA</span><Link href="/admin/enquiries" className="aw-bell" aria-label="View enquiries"><Icon name="bell"/></Link></>}/>
    {!paymentsReady && <Link className="dashboard-alert" href="/admin/payments"><strong>Payments need configuration</strong><span>Review payment settings before accepting purchases.</span></Link>}
    <div className="aw-summary-line"><span>Updated when you open this page</span><span>{data.month} · Africa/Lagos</span></div>
    <section className="dashboard-metrics" aria-label="Platform metrics">{metrics.map(item => <MetricCard key={item.label} {...item}/>)}</section>
    <div className="aw-layout"><div className="aw-analytics-column">
      <section className="aw-card aw-spotlight"><div className="aw-spotlight-copy"><p className="aw-eyebrow">COURSE SPOTLIGHT</p><h2>{course?.title || "Your next great course"}</h2><p>{course ? `${course.lessons} published lessons · ${course.enrolled} active enrolments` : "Build your first course, one module at a time."}</p>{course && <><div className="aw-progress-label"><span>Average learner progress</span><strong>{course.average}%</strong></div><ProgressBar value={course.average} label="Average learner progress"/></>}<div className="aw-spotlight-bottom"><Link className="aw-primary" href={course ? `/admin/courses/${course.id}/edit` : "/admin/courses/new"}>{course ? "View course" : "Create course"}<Icon name="arrow"/></Link></div></div><div className="aw-course-art" aria-hidden="true"><div className="aw-art-grid"/><div className="aw-art-frame"><span>CREATE / TEACH</span><div className="aw-art-sun"/><div className="aw-art-mountain"/></div></div></section>
      <WorkspaceChart series={data.revenue} title="Revenue Overview" money/>
      {data.otherCurrencies.length > 0 && <p>Other payment currencies: {data.otherCurrencies.join(", ")}. Select each currency above; amounts are never combined.</p>}
      <WorkspaceChart series={{ Students: data.growth }} title="Student Growth" ranges/>
    </div><div className="aw-control-column">
      <section className="aw-card aw-actions"><h2>Quick Actions</h2><p>Your next move, one click away.</p><Link className="aw-create" href="/admin/courses/new">Create new course <Icon name="arrow"/></Link><div className="aw-action-grid">{[["View certificates", "/admin/certificates"], ["View all orders", "/admin/orders"], ["Manage students", "/admin/students"], ["Academy settings", "/admin/course-settings"], ["Manage portfolio", "/admin/videos"], ["Client invoices", "/admin/invoices"]].map(([label, href]) => <Link href={href} key={href}>{label}<Icon name="arrow"/></Link>)}</div></section>
      <section className="aw-card aw-health"><h2>Platform Health</h2><p className="aw-health-intro">Learning progress across active enrolments in published courses.</p><div className="aw-health-row"><span>Completion rate</span><strong>{data.health.completion}%</strong></div><ProgressBar value={data.health.completion} label="Course completion rate"/><div className="aw-health-row"><span>Average course progress</span><strong>{data.health.average}%</strong></div><ProgressBar value={data.health.average} label="Average course progress"/><p className="aw-health-intro">{data.health.count} enrolments with published lessons.</p><Link className="aw-health-row" href="/admin/videos"><span>Portfolio</span><strong>{data.projects} published · {data.drafts} drafts</strong></Link></section>
      <section className="aw-card aw-attention"><h2>Needs attention</h2><div className="aw-attention-list">{attention.map(item => <Link href={item.href} key={item.href}><span className="aw-item-icon"><Icon name="arrow"/></span><span><strong>{item.title}</strong><small>{item.detail}</small></span></Link>)}</div></section>
      <section className="aw-card aw-attention"><h2>Recent certificates</h2>{data.activity.length ? <ol className="aw-recent">{data.activity.map(item => <li key={item.id}><span className="aw-item-icon"><Icon name="award"/></span><div><strong>{item.course_title}</strong><p>Certificate issued</p><time>{new Date(item.issued_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</time></div></li>)}</ol> : <p>No certificates issued yet.</p>}<Link className="aw-all-activity" href="/admin/activity">View platform activity <Icon name="arrow"/></Link></section>
    </div></div>
  </div>;
}

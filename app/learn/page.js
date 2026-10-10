import CourseCommunity from "@/Components/CourseCommunity";
import { redirect } from "next/navigation";
import StudentWorkspace from "@/Components/StudentWorkspace";
import { getStudentDashboard } from "@/lib/data/courses";
import { getStudentCertificates } from "@/lib/data/certificates";
import { updateWeeklyGoal } from "@/app/student-actions";

export const metadata = { title: "My learning" };
export const dynamic = "force-dynamic";
export default async function LearnPage({ searchParams }) {
  const [dashboard, certificates, query] = await Promise.all([getStudentDashboard(), getStudentCertificates(), searchParams]);
  if (!dashboard.user) redirect("/login?next=/learn");
  return <><StudentWorkspace dashboard={dashboard} certificates={certificates} query={query} saveGoal={updateWeeklyGoal}/>{dashboard.enrolments.map(e=><CourseCommunity key={e.id} courseId={e.course_id}/>)}</>;
}

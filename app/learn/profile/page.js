import EmailPreferences from "@/Components/EmailPreferences";
import { Input } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { updateStudentProfile } from "@/app/student-actions";
import { getStudentDashboard } from "@/lib/data/courses";
import SubmitButton from "@/Components/SubmitButton";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function StudentProfilePage({ searchParams }) {
  const [{ user, profile }, query] = await Promise.all([getStudentDashboard(), searchParams]);
  return <section className="public-note">
    <PageHeader title={<>Profile</>} eyebrow={<>MY LEARNING</>} description={<>Your name appears on your certificate, so keep it as you want it printed.</>}/>
    {query.message && <p className="success-note">{query.message}</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    <form className="admin-form" action={updateStudentProfile}>
      <label>Full name<Input name="fullName" defaultValue={profile?.full_name || user?.user_metadata?.full_name || ""} required /><small>Shown on your certificates and in the dashboard greeting.</small></label>
      <label>Email<Input value={user?.email || ""} disabled /><small>Contact support to change the email on your account.</small></label>
      <SubmitButton className="button" pendingLabel="Saving...">Save profile</SubmitButton>
    </form>
    <EmailPreferences />
    <p><Link className="inline-link" href="/learn/certificates">My certificates</Link></p>
  </section>;
}

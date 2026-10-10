import DashboardUiReview from "@/scripts/DashboardUiReview";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/Components/AdminShell";
import AdminWorkspacePreview from "@/Components/AdminWorkspacePreview";
import StudentShell from "@/Components/StudentShell";
import StudentWorkspacePreview from "@/Components/StudentWorkspacePreview";
import InvoiceDocument from "@/Components/InvoiceDocument";
import CertificateDocument from "@/Components/CertificateDocument";
import { documentDefaults } from "@/lib/documents/brand";
import AdminWorkspace from "@/Components/AdminWorkspace";
import StudentWorkspace from "@/Components/StudentWorkspace";
import { dashboardFixtures } from "@/scripts/dashboard-fixtures";

export const dynamic = "force-dynamic";
export default async function DesignReview({searchParams}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view = "documents" } = await searchParams;
  async function noop() { "use server"; }
  if (view === "ui-admin" || view === "ui-student") return view === "ui-admin" ? <AdminShell logout={noop}><DashboardUiReview action={noop}/></AdminShell> : <StudentShell site={{creatorName:"AI VIDEO CREATOR"}} user={{email:"sample@example.com"}} signOut={noop}><DashboardUiReview student action={noop}/></StudentShell>;
  if (view.startsWith("live-admin") || view.startsWith("live-student")) {
    const fixture = dashboardFixtures(view.endsWith("empty"));
    const notice = <p role="note">Development fixture · sample records for layout testing only.</p>;
    return view.startsWith("live-admin")
      ? <AdminShell logout={noop}>{notice}<AdminWorkspace data={fixture.admin} paymentsReady/></AdminShell>
      : <StudentShell site={{creatorName:"AI VIDEO CREATOR"}} user={{email:"sample@example.com"}} signOut={noop}>{notice}<StudentWorkspace dashboard={fixture.student} certificates={[]} query={{}} saveGoal={noop}/></StudentShell>;
  }
  const navigation = <p className="no-print"><Link href="/design-review">Documents</Link> / <Link href="/design-review?view=admin">Admin shell</Link> / <Link href="/design-review?view=student">Student shell</Link></p>;
  if(view === "admin") return <AdminShell logout={noop}><AdminWorkspacePreview /></AdminShell>;
  if(view === "student") return <StudentShell site={{creatorName:"AI VIDEO CREATOR"}} user={{email:"sample@example.com"}} signOut={noop}><StudentWorkspacePreview /></StudentShell>;
  const invoice = {number:"INV-2026-0042",documentType:"invoice",status:"paid",clientName:"Adéọlá Johnson",clientEmail:"student@example.com",currency:"NGN",subtotalMinor:27500000,discountMinor:0,totalMinor:27500000,issuedAt:"2026-10-04",items:[{id:"1",description:"AI Filmmaking: The Complete Course",quantity:1,unitPriceMinor:27500000}],receipts:[{receiptNumber:"RCT-2026-0042"}]};
  const certificate = {studentName:"Adéọlá Johnson",courseTitle:"AI Filmmaking: From Idea to Final Film",lessonCount:24,instructionMinutes:360,status:"valid",serial:"AVC-2026-0042",issuedAt:"2026-10-04",verifyPath:"/verify/AVC-2026-0042"};
  return <main style={{padding:"24px",maxWidth:1200,margin:"auto"}}>{navigation}<p>Design samples only. These are not issued documents.</p><InvoiceDocument invoice={invoice} branding={documentDefaults}/><div style={{height:40}}/><CertificateDocument certificate={certificate} branding={documentDefaults}/></main>;
}

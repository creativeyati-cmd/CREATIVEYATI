import DataTable from "@/Components/DataTable";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import Badge, { toneForStatus } from "@/Components/Badge";
import { EmptyState } from "@/Components/Feedback";
import RevokeCertificateDialog from "@/Components/RevokeCertificateDialog";
import { formatCertificateDate, getAdminCertificates } from "@/lib/data/certificates";

export const metadata = { title: "Certificates" };

export default async function AdminCertificatesPage({ searchParams }) {
  const [certificates, query] = await Promise.all([getAdminCertificates(), searchParams]);
  const valid = certificates.filter((certificate) => certificate.status === "valid").length;

  return <>
    <PageHeader title={<>Certificates</>} eyebrow={<>ACADEMY</>} description={<>Review issued certificates and verification status.</>}/>
    {query.revoked && <p className="success-note">Certificate revoked. The public verification page now reports it as revoked.</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    <section className="admin-section-heading"><p>ISSUED</p><h2>{certificates.length} certificate{certificates.length === 1 ? "" : "s"} · {valid} valid</h2></section>
    {certificates.length ? <DataTable label="Certificates">
      <div><b>Serial</b><b>Student</b><b>Course</b><b>Issued</b><b>Status</b><b>Actions</b></div>
      {certificates.map((certificate) => <div key={certificate.id}>
        <span>{certificate.serial}<small>{certificate.lessonCount} lessons · {certificate.instructionMinutes} min</small></span>
        <span>{certificate.studentName || "—"}</span>
        <span>{certificate.courseTitle || "—"}</span>
        <span>{formatCertificateDate(certificate.issuedAt)}</span>
        <span><Badge tone={toneForStatus(certificate.status)}>{certificate.status}</Badge>{certificate.status === "revoked" && certificate.revokeReason ? <small>{certificate.revokeReason}</small> : null}</span>
        <span>
          <Link className="inline-link" href={certificate.verifyPath} target="_blank" rel="noreferrer">Verify</Link>
          {certificate.status === "valid" ? <RevokeCertificateDialog id={certificate.id} serial={certificate.serial} /> : null}
        </span>
      </div>)}
    </DataTable> : <EmptyState title="No certificates yet">They appear here the moment a student finishes every lesson in a course.</EmptyState>}
  </>;
}


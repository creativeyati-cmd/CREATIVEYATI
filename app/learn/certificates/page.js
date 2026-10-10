import { PageHeader } from "@/Components/DashboardPageShell";
import { EmptyState } from "@/Components/Feedback";
import Link from "next/link";
import CertificateDocument from "@/Components/CertificateDocument";
import PrintDocumentButton from "@/Components/PrintDocumentButton";
import { getStudentCertificates } from "@/lib/data/certificates";

export const metadata = { title: "My certificates" };

export default async function StudentCertificatesPage() {
  const certificates = await getStudentCertificates();
  return <section className="learn-dashboard public-note">
    <PageHeader title="Certificates" eyebrow="MY LEARNING" description="Your achievements, ready to download and share."/>
    {certificates.length ? <div className="certificate-list">{certificates.map((certificate) => <div key={certificate.id}>
      <CertificateDocument certificate={certificate} />
      <div className="no-print certificate-actions">
        <a className="button" href={`/api/learn/certificate/${certificate.id}`}>Download PDF</a>
        <PrintDocumentButton label="Print certificate" className="button button-secondary" />
        <Link className="inline-link" href={certificate.verifyPath}>Open verification page</Link>
      </div>
    </div>)}</div> : <EmptyState title="Your next achievement is ahead" action={<Link className="button" href="/learn/courses">Continue learning</Link>}>Complete every published lesson in a course to earn your certificate.</EmptyState>}
  </section>;
}

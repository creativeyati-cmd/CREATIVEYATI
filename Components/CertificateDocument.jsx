import qrcode from "qrcode-generator";
import { documentDate } from "@/lib/documents/brand";
import { getDocumentSettings } from "@/lib/data/settings";
export default async function CertificateDocument({ certificate, branding }) {
  const brand=branding || await getDocumentSettings();
  const url=(process.env.NEXT_PUBLIC_SITE_URL||"https://aivideocreator.cv").replace(/\/$/,"")+certificate.verifyPath;
  const qr=qrcode(0,"M");qr.addData(url);qr.make();
  return <article className="print-document certificate-document">
    <div className="certificate-border" aria-hidden="true"/><div className="certificate-brand"><strong>{brand.academyName}</strong><span>Learn. Create. Complete.</span></div>
    <h2>CERTIFICATE</h2><p className="certificate-subtitle">OF COMPLETION</p><p className="certificate-presented">proudly presented to</p>
    <p className="certificate-name">{certificate.studentName||"Student"}</p><p className="certificate-course">for completing {certificate.courseTitle}</p><p className="certificate-facts">{certificate.lessonCount} lessons / {certificate.instructionMinutes} minutes</p>
    {certificate.status!=="valid"&&<p className="certificate-revoked">REVOKED {certificate.revokeReason&&" / "+certificate.revokeReason}</p>}
    <footer className="certificate-footer"><div className="certificate-signature"><strong>{brand.signerName||brand.businessName}</strong><span>{brand.signerTitle}</span></div><div className="certificate-seal"><strong>COMPLETED</strong><span>ACADEMY</span></div><div className="certificate-verification"><a href={certificate.verifyPath} aria-label="Verify certificate" dangerouslySetInnerHTML={{__html:qr.createSvgTag({cellSize:3,margin:4})}}/><span>{documentDate(certificate.issuedAt)}</span><span>{certificate.serial}</span></div></footer>
  </article>;
}

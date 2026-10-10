import { getStudentUser } from "@/lib/supabase/server";
import { getStudentCertificates } from "@/lib/data/certificates";
import { buildCertificatePdf } from "@/lib/documents/certificate-pdf";
import { getDocumentSettings } from "@/lib/data/settings";

// the certificate is fetched through the student's own list rather than by id
// alone, so one student can never download another student's certificate
export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getStudentUser();
  if (!user) return Response.json({ error: "Sign in to download this certificate." }, { status: 401 });
  const certificates = await getStudentCertificates();
  const certificate = certificates.find((item) => item.id === id);
  if (!certificate) return Response.json({ error: "Certificate not found." }, { status: 404 });

  const pdf = await buildCertificatePdf(certificate, await getDocumentSettings());
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.serial}.pdf"`,
      // a personal document: never cached by a shared proxy
      "Cache-Control": "private, no-store",
    },
  });
}

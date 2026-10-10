import { getInvoiceByToken } from "@/lib/data/invoices";
import { buildInvoicePdf } from "@/lib/documents/invoice-pdf";
import { getDocumentSettings } from "@/lib/data/settings";

// the access token is the authorisation, exactly as it is for the page a client
// already opens: whoever holds the link holds the document
export async function GET(request, { params }) {
  const { token } = await params;
  const invoice = await getInvoiceByToken(token);
  if (!invoice) return Response.json({ error: "This document could not be found." }, { status: 404 });

  const pdf = await buildInvoicePdf(invoice, await getDocumentSettings());
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

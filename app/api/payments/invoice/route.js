import { getInvoiceByToken, invoiceBalance } from "@/lib/data/invoices";
import { initialiseInvoiceCheckout } from "@/lib/payments/invoices";

// the token is the authorisation: a client pays from the link they were sent,
// without an account, and only the stored document decides the amount
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const invoice = await getInvoiceByToken(String(body.token || ""));
  if (!invoice) return Response.json({ error: "This document could not be found." }, { status: 404 });
  if (["void", "declined"].includes(invoice.status)) return Response.json({ error: "This document is not payable." }, { status: 400 });
  if (invoice.documentType === "quote" && !invoice.acceptedAt) return Response.json({ error: "Accept the quotation before paying it." }, { status: 400 });
  if (invoiceBalance(invoice) <= 0) return Response.json({ error: "This document is already settled." }, { status: 400 });
  try {
    const checkout = await initialiseInvoiceCheckout(invoice);
    return Response.json({ authorizationUrl: checkout.checkout_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}

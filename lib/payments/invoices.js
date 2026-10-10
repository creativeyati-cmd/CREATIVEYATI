import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createOrderReference, initialiseCheckout } from "@/lib/payments/provider";


function decimalToMinor(value) {
  const amount = Number(String(value ?? "").trim());
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
}

// a delivery carries either the checkout id or the reference we sent to Bachs
async function findInvoiceForPayment(supabase, data) {
  const checkoutId = String(data.checkout_id || data.checkout?.checkout_id || "");
  const reference = String(data.reference || "");
  if (checkoutId) {
    const { data: row } = await supabase.from("invoices").select("*").eq("checkout_id", checkoutId).maybeSingle();
    if (row) return row;
  }
  if (reference) {
    const { data: row } = await supabase.from("invoices").select("*").eq("checkout_reference", reference).maybeSingle();
    if (row) return row;
  }
  return null;
}

// one receipt per invoice; a replay cannot issue a second
export async function issueInvoiceReceipt(supabase, invoice, { channel, reference, amountMinor }) {
  const { data, error } = await supabase.rpc("settle_invoice_with_receipt", {
    target_invoice: invoice.id, expected_amount: amountMinor, expected_currency: invoice.currency,
    settled_channel: channel || null, settled_reference: reference || null,
  });
  if (error) throw new Error("Invoice settlement could not be completed.");
  return data;
}
// starts a hosted checkout for a document balance; takes the mapped invoice from lib/data/invoices
export async function initialiseInvoiceCheckout(invoice) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Card payment is not configured.");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
  // reusing the reference keeps a repeated click idempotent at Bachs
  const reference = invoice.checkoutReference || createOrderReference();
  const checkout = await initialiseCheckout({
    email: invoice.clientEmail,
    name: invoice.clientCompany || invoice.clientName,
    amountMinor: invoice.totalMinor,
    currency: invoice.currency,
    reference,
    successUrl: `${siteUrl}/q/${invoice.accessToken}?status=paid`,
    cancelUrl: `${siteUrl}/q/${invoice.accessToken}?status=cancelled`,
    metadata: { invoice_id: invoice.id, invoice_number: invoice.number },
  });
  await supabase.from("invoices").update({ checkout_id: checkout.checkout_id, checkout_reference: reference, updated_at: new Date().toISOString() }).eq("id", invoice.id);
  return checkout;
}

// settlement is the only place an invoice becomes paid. amount, currency and
// reference must all match what was stored, exactly as the course orders do.
export async function settleVerifiedInvoice(data) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { matched: false };
  const invoice = await findInvoiceForPayment(supabase, data);
  if (!invoice) return { matched: false };

  const status = String(data.payment_status || data.status || data.charge?.status || "").toLowerCase();
  const amountMinor = decimalToMinor(data.amount ?? data.charge?.amount);
  const currency = String(data.currency || data.charge?.currency || "").toUpperCase();
  const reference = String(data.reference || "");
  const checkoutId = String(data.checkout_id || data.checkout?.checkout_id || "");

  if (!["succeeded", "accepted"].includes(status) || amountMinor !== Number(invoice.total_minor) || currency !== invoice.currency.toUpperCase() || (invoice.checkout_reference && reference !== invoice.checkout_reference) || (invoice.checkout_id && checkoutId && checkoutId !== invoice.checkout_id)) {
    await supabase.from("invoices").update({ updated_at: new Date().toISOString() }).eq("id", invoice.id);
    return { matched: true, ok: false, error: "Payment verification did not match the invoice." };
  }

  const channel = String(data.channel || data.payment_method || "bachs");
  const providerReference = String(data.charge_id || data.reference || "");
  await issueInvoiceReceipt(supabase, invoice, { channel, reference: providerReference, amountMinor });
  return { matched: true, ok: true };
}

// failed, underpaid or expired collections clear the checkout so the client can retry
export async function recordInvoiceCollectionFailure(data) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { matched: false };
  const invoice = await findInvoiceForPayment(supabase, data);
  if (!invoice) return { matched: false };
  if (invoice.status !== "paid") {
    await supabase.from("invoices").update({ checkout_id: null, checkout_reference: null, updated_at: new Date().toISOString() }).eq("id", invoice.id);
  }
  return { matched: true, ok: false };
}

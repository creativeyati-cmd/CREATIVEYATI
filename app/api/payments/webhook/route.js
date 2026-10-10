import { completeVerifiedOrder, recordFailedCollection, recordRefund, recordWebhookEvent, validWebhookSignature } from "@/lib/payments/provider";
import { recordInvoiceCollectionFailure, settleVerifiedInvoice } from "@/lib/payments/invoices";

// Provider callbacks authenticate the provider, never the browser: the
// customer's session is irrelevant to a server-to-server event.
export async function POST(request) {
  const raw = await request.text();
  const requestId = request.headers.get("x-bachs-event-id") || "unknown";
  try {
    const valid = await validWebhookSignature(raw, request.headers.get("x-bachs-timestamp"), request.headers.get("x-bachs-signature"));
    if (!valid) {
      console.error("payment.webhook_signature_rejected", { event_id: requestId, reason: "signature or timestamp mismatch" });
      return new Response("Invalid signature", { status: 401 });
    }
    const event = JSON.parse(raw);
    if (!event.id || !event.type || !event.data) return new Response("Invalid event", { status: 400 });
    console.info("payment.webhook_received", { event_id: event.id, type: event.type });
    // invoice documents are matched first; anything unmatched falls through to the
    // existing order handling, so course checkout behaviour is unchanged
    if (event.type === "collection.succeeded") { const settled = await settleVerifiedInvoice(event.data); if (!settled.matched) await completeVerifiedOrder(event.data, { confirmed: true }); }
    else if (["collection.failed", "collection.underpaid"].includes(event.type)) { const failed = await recordInvoiceCollectionFailure(event.data); if (!failed.matched) await recordFailedCollection(event.data, "failed"); }
    else if (event.type === "checkout.expired") { const expired = await recordInvoiceCollectionFailure(event.data); if (!expired.matched) await recordFailedCollection(event.data, "abandoned"); }
    else if (event.type === "refund.created") await recordRefund({ ...event.data, status: "processing" });
    else if (event.type === "refund.paid") await recordRefund({ ...event.data, status: "paid" });
    else if (event.type === "refund.failed") await recordRefund({ ...event.data, status: "failed" });
    await recordWebhookEvent(event);
    return new Response("OK");
  } catch (error) {
    // a 500 tells Bachs to retry; without the message an unconfigured signing
    // secret or a rejected insert is invisible from the dashboard
    console.error("payment.webhook_processing_failed", { event_id: requestId, message: error?.message || "unknown" });
    return new Response("Webhook processing failed", { status: 500 });
  }
}

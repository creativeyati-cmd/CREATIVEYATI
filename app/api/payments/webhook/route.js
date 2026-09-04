import { completeVerifiedOrder, recordFailedCollection, recordRefund, recordWebhookEvent, validWebhookSignature } from "@/lib/payments/provider";

export async function POST(request) {
  const raw = await request.text();
  try {
    const valid = validWebhookSignature(raw, request.headers.get("x-bachs-timestamp"), request.headers.get("x-bachs-signature"));
    if (!valid) return new Response("Invalid signature", { status: 401 });
    const event = JSON.parse(raw);
    if (!event.id || !event.type || !event.data) return new Response("Invalid event", { status: 400 });
    if (event.type === "collection.succeeded") await completeVerifiedOrder(event.data);
    else if (["collection.failed", "collection.underpaid"].includes(event.type)) await recordFailedCollection(event.data, "failed");
    else if (event.type === "checkout.expired") await recordFailedCollection(event.data, "abandoned");
    else if (event.type === "refund.created") await recordRefund({ ...event.data, status: "processing" });
    else if (event.type === "refund.paid") await recordRefund({ ...event.data, status: "paid" });
    else if (event.type === "refund.failed") await recordRefund({ ...event.data, status: "failed" });
    await recordWebhookEvent(event);
    return new Response("OK");
  } catch {
    return new Response("Webhook processing failed", { status: 500 });
  }
}

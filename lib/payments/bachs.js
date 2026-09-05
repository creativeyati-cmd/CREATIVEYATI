import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendCourseConfirmation } from "@/lib/email/delivery";

function apiKey() {
  if (!process.env.BACHS_API_KEY) throw new Error("Bachs is not configured.");
  return process.env.BACHS_API_KEY;
}

function apiBase() {
  return apiKey().startsWith("sk_sandbox_") ? "https://sandbox-api.bachs.io" : "https://api.bachs.io";
}

function webhookSecret() {
  if (!process.env.BACHS_WEBHOOK_SECRET) throw new Error("Bachs webhook signing is not configured.");
  return process.env.BACHS_WEBHOOK_SECRET;
}

export function getBachsConfiguration() {
  const key = String(process.env.BACHS_API_KEY || "");
  const checkoutReady = key.startsWith("sk_sandbox_") || key.startsWith("sk_live_");
  const webhookReady = Boolean(process.env.BACHS_WEBHOOK_SECRET);
  return {
    checkoutReady,
    webhookReady,
    ready: checkoutReady && webhookReady,
    environment: key.startsWith("sk_live_") ? "live" : key.startsWith("sk_sandbox_") ? "sandbox" : "unconfigured",
  };
}

async function requestBachs(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.message || "The payment provider rejected the request.");
  return body;
}

export function createOrderReference() {
  return `CY-${Date.now().toString(36).toUpperCase()}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function minorToDecimal(amountMinor) {
  return (Number(amountMinor) / 100).toFixed(2);
}

function decimalToMinor(amount) {
  const value = String(amount ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export async function initialiseCheckout({ email, name, amountMinor, currency, reference, successUrl, cancelUrl, metadata }) {
  return requestBachs("/v1/checkout-sessions", {
    method: "POST",
    headers: { "Idempotency-Key": reference },
    body: JSON.stringify({
      customer: { email, ...(name ? { name } : {}) },
      pricing: { amount: minorToDecimal(amountMinor), currency },
      reference,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    }),
  });
}

export async function retrieveCheckout(checkoutId) {
  return requestBachs(`/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`);
}

export async function requestRefund({ chargeId, reference, reason }) {
  return requestBachs("/v1/refunds", {
    method: "POST",
    headers: { "Idempotency-Key": reference },
    body: JSON.stringify({ charge_id: chargeId, reference, reason }),
  });
}

export function validWebhookSignature(rawBody, timestampHeader, signatureHeader) {
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatureHeader) return false;
  const expected = createHmac("sha256", webhookSecret()).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const left = Buffer.from(expected); const right = Buffer.from(String(signatureHeader));
  return left.length === right.length && timingSafeEqual(left, right);
}

function safePaymentPayload(data) {
  return { checkout_id: data.checkout_id || null, charge_id: data.charge_id || data.charge?.charge_id || data.charge?.payment_id || null, payment_id: data.payment_id || data.charge?.payment_id || null, status: data.payment_status || data.status || null, amount: data.amount, currency: data.currency, payment_method: data.payment_method || null, completed_at: data.completed_at || null };
}

async function findOrderForPayment(data) {
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Payment storage is not configured.");
  let order = null;
  if (data.checkout_id) ({ data: order } = await service.from("orders").select("*").eq("checkout_id", data.checkout_id).maybeSingle());
  if (!order && data.reference) ({ data: order } = await service.from("orders").select("*").eq("reference", data.reference).maybeSingle());
  return { service, order };
}

export async function completeVerifiedOrder(data) {
  const { service, order } = await findOrderForPayment(data);
  if (!order) throw new Error("Order not found.");
  if (order.payment_status === "successful") {
    const chargeId = String(data.charge_id || data.charge?.charge_id || "");
    if (chargeId.startsWith("ch_") && order.gateway_reference !== chargeId) await Promise.all([service.from("orders").update({ gateway_reference: chargeId, updated_at: new Date().toISOString() }).eq("id", order.id), service.from("payments").update({ gateway_reference: chargeId }).eq("order_id", order.id)]);
    return { ok: true, order };
  }
  const status = String(data.payment_status || data.status || data.charge?.status || "").toLowerCase();
  const amount = decimalToMinor(data.amount ?? data.charge?.amount);
  const currency = String(data.currency || data.charge?.currency || "").toUpperCase();
  const reference = String(data.reference || order.reference);
  const checkoutId = String(data.checkout_id || order.checkout_id || "");
  if (!(["succeeded", "accepted"].includes(status)) || amount !== Number(order.amount_minor) || currency !== order.currency.toUpperCase() || reference !== order.reference || (order.checkout_id && checkoutId !== order.checkout_id)) {
    await service.from("orders").update({ payment_status: "failed", verification_response: safePaymentPayload(data), updated_at: new Date().toISOString() }).eq("id", order.id);
    return { ok: false, error: "Payment verification did not match the order." };
  }
  const payload = safePaymentPayload(data);
  const providerReference = String(data.charge_id || data.charge?.charge_id || data.charge?.payment_id || data.payment_id || checkoutId);
  const { error } = await service.rpc("complete_course_purchase", { order_reference: order.reference, provider_reference: providerReference, provider_channel: data.payment_method || "checkout", provider_payload: payload });
  if (error) throw new Error("Payment was verified, but enrolment could not be created.");
  const [{ data: course }, { data: { user } }] = await Promise.all([service.from("courses").select("title").eq("id", order.course_id).single(), service.auth.admin.getUserById(order.student_id)]);
  if (user?.email) sendCourseConfirmation({ email: user.email, courseTitle: course?.title || "your course", reference: order.reference, amount: order.amount_minor, currency: order.currency }).catch(() => {});
  return { ok: true, order: { ...order, payment_status: "successful" } };
}

export async function verifyCheckout(checkoutId) {
  const checkout = await retrieveCheckout(checkoutId);
  return completeVerifiedOrder(checkout);
}

export async function recordFailedCollection(data, status = "failed") {
  const { service, order } = await findOrderForPayment(data);
  if (!order || order.payment_status === "successful" || order.payment_status === "refunded") return;
  await service.from("orders").update({ payment_status: status, verification_response: safePaymentPayload(data), updated_at: new Date().toISOString() }).eq("id", order.id);
}

export async function recordRefund(data, actor = null) {
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Payment storage is not configured.");
  const chargeId = String(data.charge_id || "");
  const { data: order } = await service.from("orders").select("*").eq("gateway_reference", chargeId).maybeSingle();
  if (!order) throw new Error("Refund order not found.");
  const status = String(data.status || "processing");
  if (!["processing", "paid", "failed"].includes(status)) throw new Error("Unknown refund status.");
  const amount = decimalToMinor(data.refunded_amount || data.requested_amount || minorToDecimal(order.amount_minor));
  if (amount !== Number(order.amount_minor)) throw new Error("Refund amount did not match the order.");
  const safe = { refund_id: data.refund_id || null, charge_id: chargeId, reference: data.reference || null, status, requested_amount: data.requested_amount || null, refunded_amount: data.refunded_amount || null, completed_at: data.completed_at || null };
  const now = new Date().toISOString();
  const update = { refund_status: status, refund_response: safe, refund_requested_at: order.refund_requested_at || now, updated_at: now };
  if (status === "paid") { update.payment_status = "refunded"; update.refunded_at = data.completed_at || now; }
  await service.from("orders").update(update).eq("id", order.id);
  if (status === "paid") await Promise.all([service.from("payments").update({ status: "refunded", provider_response: safe }).eq("order_id", order.id), service.from("enrolments").update({ active: false, revoked_at: now }).eq("order_id", order.id)]);
  await service.from("admin_audit_logs").insert({ actor_id: actor?.id && actor.id !== "direct-admin" ? actor.id : null, actor_label: actor?.email || (actor ? "direct-admin" : "bachs-webhook"), action: `refund_${status}`, entity_type: "order", entity_id: order.id, details: safe });
  return { order, status };
}

export async function recordWebhookEvent(event) {
  const service = createSupabaseServiceClient();
  const { error } = await service.from("payment_webhook_events").insert({ provider: "bachs", event_id: event.id, event_type: event.type, payload: event });
  return !error;
}

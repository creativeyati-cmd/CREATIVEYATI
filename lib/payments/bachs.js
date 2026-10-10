import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendCourseConfirmation } from "@/lib/email/delivery";
import { getStoredBachsSettings } from "@/lib/data/settings";

async function credentials() {
  const service = createSupabaseServiceClient();
  const stored = service ? await getStoredBachsSettings(service) : { enabled: true };
  const key = String(stored.apiKey || process.env.BACHS_API_KEY || "").trim();
  const signingSecret = String(stored.webhookSecret || process.env.BACHS_WEBHOOK_SECRET || "").trim();
  return {
    enabled: stored._configured ? stored.enabled !== false : true,
    key,
    signingSecret,
    storedApiKey: Boolean(stored.apiKey),
    storedWebhookSecret: Boolean(stored.webhookSecret),
    decryptionError: Boolean(stored._decryptionError),
  };
}

function validApiKey(value) {
  return value.startsWith("sk_sandbox_") || value.startsWith("sk_live_");
}

function apiBase(key) {
  return key.startsWith("sk_sandbox_") ? "https://sandbox-api.bachs.io" : "https://api.bachs.io";
}

export async function getBachsConfiguration() {
  const value = await credentials();
  const checkoutReady = value.enabled && validApiKey(value.key);
  const webhookReady = Boolean(value.signingSecret);
  return {
    enabled: value.enabled,
    checkoutReady,
    webhookReady,
    ready: checkoutReady && webhookReady,
    environment: value.key.startsWith("sk_live_") ? "live" : value.key.startsWith("sk_sandbox_") ? "sandbox" : "unconfigured",
    hasStoredApiKey: value.storedApiKey,
    hasStoredWebhookSecret: value.storedWebhookSecret,
    apiKeySource: value.storedApiKey ? "dashboard" : validApiKey(value.key) ? "deployment" : "missing",
    webhookSecretSource: value.storedWebhookSecret ? "dashboard" : value.signingSecret ? "deployment" : "missing",
    decryptionError: value.decryptionError,
  };
}

async function requestBachs(path, options = {}) {
  const value = await credentials();
  if (!value.enabled) throw new Error("Bachs checkout is disabled in the dashboard.");
  if (!validApiKey(value.key)) throw new Error("Bachs is not configured.");
  const response = await fetch(`${apiBase(value.key)}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${value.key}`, "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.message || "The payment provider rejected the request.");
  return body;
}

export async function testBachsConnection() {
  const value = await credentials();
  if (!validApiKey(value.key)) throw new Error("Add a valid Bachs API key first.");
  const response = await fetch(`${apiBase(value.key)}/v1/balances`, {
    headers: { Authorization: `Bearer ${value.key}`, Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 403) return { ok: true, limited: true };
  if (!response.ok) throw new Error(body.detail || body.message || "Bachs rejected the connection test.");
  return { ok: true, limited: false };
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

export async function validWebhookSignature(rawBody, timestampHeader, signatureHeader) {
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatureHeader) return false;
  const value = await credentials();
  if (!value.signingSecret) throw new Error("Bachs webhook signing is not configured.");
  const expected = createHmac("sha256", value.signingSecret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const left = Buffer.from(expected); const right = Buffer.from(String(signatureHeader));
  return left.length === right.length && timingSafeEqual(left, right);
}

function safePaymentPayload(data) {
  return { checkout_id: data.checkout_id || null, charge_id: data.charge_id || data.charge?.charge_id || data.charge?.payment_id || null, payment_id: data.payment_id || data.charge?.payment_id || null, status: data.payment_status || data.status || null, amount: data.amount, currency: data.currency, payment_method: data.payment_method || null, completed_at: data.completed_at || null };
}

// A checkout Bachs has not settled yet must stay pending: marking it failed
// would strand a payment that is only delayed.
const SETTLED_STATUSES = ["succeeded", "accepted", "paid", "complete", "completed", "success"];
const TERMINAL_STATUSES = ["failed", "declined", "cancelled", "canceled", "expired", "abandoned", "underpaid"];

async function findOrderForPayment(data) {
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Payment storage is not configured.");
  let order = null;
  if (data.checkout_id) ({ data: order } = await service.from("orders").select("*").eq("checkout_id", data.checkout_id).maybeSingle());
  if (!order && data.reference) ({ data: order } = await service.from("orders").select("*").eq("reference", data.reference).maybeSingle());
  return { service, order };
}

export async function completeVerifiedOrder(data, options = {}) {
  const { service, order } = await findOrderForPayment(data);
  if (!order) {
    console.error("payment.order_not_found", { checkout_id: data.checkout_id || null, reference: data.reference || null, status: data.payment_status || data.status || null });
    throw new Error("Order not found.");
  }
  if (order.payment_status === "successful") {
    console.info("payment.duplicate_ignored", { reference: order.reference, status: order.payment_status });
    const chargeId = String(data.charge_id || data.charge?.charge_id || "");
    if (chargeId.startsWith("ch_") && order.gateway_reference !== chargeId) await Promise.all([service.from("orders").update({ gateway_reference: chargeId, updated_at: new Date().toISOString() }).eq("id", order.id), service.from("payments").update({ gateway_reference: chargeId }).eq("order_id", order.id)]);
    return { ok: true, order };
  }
  const status = String(data.payment_status || data.status || data.charge?.status || "").toLowerCase();
  const amount = decimalToMinor(data.amount ?? data.charge?.amount);
  const currency = String(data.currency || data.charge?.currency || "").toUpperCase();
  const reference = String(data.reference || order.reference);
  const checkoutId = String(data.checkout_id || order.checkout_id || "");
  const mismatched = amount !== Number(order.amount_minor) || currency !== order.currency.toUpperCase() || reference !== order.reference || (order.checkout_id && checkoutId !== order.checkout_id);
  if (mismatched) {
    console.error("payment.verification_mismatch", { reference: order.reference, expected_minor: order.amount_minor, received_minor: amount, currency, reference_seen: reference, checkout_id: checkoutId || null });
    await service.from("orders").update({ payment_status: "failed", verification_response: safePaymentPayload(data), updated_at: new Date().toISOString() }).eq("id", order.id);
    return { ok: false, error: "Payment verification did not match the order." };
  }
  // a signed collection.succeeded event is authoritative; a poll of the checkout
  // session only settles when Bachs reports a settled status
  if (!options.confirmed && !SETTLED_STATUSES.includes(status)) {
    const terminal = TERMINAL_STATUSES.includes(status);
    console.info(terminal ? "payment.marked_failed" : "payment.still_pending", { reference: order.reference, status: status || "unknown" });
    if (terminal) await service.from("orders").update({ payment_status: "failed", verification_response: safePaymentPayload(data), updated_at: new Date().toISOString() }).eq("id", order.id);
    return { ok: false, error: terminal ? "Payment was not completed." : "Bachs has not confirmed this payment yet." };
  }
  const payload = safePaymentPayload(data);
  const providerReference = String(data.charge_id || data.charge?.charge_id || data.charge?.payment_id || data.payment_id || checkoutId);
  const { error } = await service.rpc("complete_course_purchase", { order_reference: order.reference, provider_reference: providerReference, provider_channel: data.payment_method || "checkout", provider_payload: payload });
  if (error) {
    console.error("payment.enrolment_failed", { reference: order.reference, message: error.message });
    throw new Error("Payment was verified, but enrolment could not be created.");
  }
  console.info("payment.settled", { reference: order.reference, provider_reference: providerReference });
  const [{ data: course }, { data: { user } }] = await Promise.all([service.from("courses").select("title").eq("id", order.course_id).single(), service.auth.admin.getUserById(order.student_id)]);
  // The enrollment trigger queues exactly one welcome once communications is installed.
  const {error: queueUnavailable}=await service.from("email_deliveries").select("id").limit(0);
  if (["42P01", "PGRST205"].includes(queueUnavailable?.code) && user?.email) sendCourseConfirmation({ email: user.email, courseTitle: course?.title || "your course", reference: order.reference, amount: order.amount_minor, currency: order.currency }).catch(() => {});
  return { ok: true, order: { ...order, payment_status: "successful" } };
}

export async function verifyCheckout(checkoutId) {
  const checkout = await retrieveCheckout(checkoutId);
  return completeVerifiedOrder(checkout);
}

// Re-asks Bachs about one order and adopts whatever the provider says. This is
// the recovery path for a webhook that never arrived or a customer who closed
// the browser: the local ledger catches up to the provider's own record.
export async function reconcileOrder(order) {
  if (order.payment_status !== "pending") return { ok: order.payment_status === "successful", status: order.payment_status, changed: false };
  if (order.gateway !== "bachs" || !order.checkout_id) return { ok: false, status: order.payment_status, changed: false, error: "No provider checkout is stored for this order." };
  console.info("payment.reconcile_start", { reference: order.reference, checkout_id: order.checkout_id });
  try {
    await verifyCheckout(order.checkout_id);
  } catch (error) {
    console.error("payment.reconcile_error", { reference: order.reference, message: error?.message || "unknown" });
    return { ok: false, status: order.payment_status, changed: false, error: error?.message || "Bachs could not be reached." };
  }
  const service = createSupabaseServiceClient();
  const { data } = await service.from("orders").select("payment_status").eq("id", order.id).maybeSingle();
  const status = data?.payment_status || order.payment_status;
  return { ok: status === "successful", status, changed: status !== order.payment_status, error: status === "pending" ? "Bachs has not confirmed this payment yet." : undefined };
}

export async function reconcilePendingOrders({ olderThanMinutes = 15, limit = 10 } = {}) {
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Payment storage is not configured.");
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
  const { data: stale = [], error } = await service.from("orders").select("id,reference,checkout_id,gateway,payment_status,created_at").eq("payment_status", "pending").neq("gateway", "free").lt("created_at", cutoff).order("created_at", { ascending: true }).limit(limit);
  if (error) throw new Error(error.message);
  const results = [];
  for (const order of stale) results.push({ reference: order.reference, ...(await reconcileOrder(order)) });
  console.info("payment.reconcile_batch", { checked: results.length, settled: results.filter((item) => item.changed).length });
  return { checked: results.length, results };
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

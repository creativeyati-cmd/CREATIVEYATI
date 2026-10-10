"use server";

import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyCheckout } from "@/lib/payments/provider";

// The reference travels in the URL so verification can be retried from an
// expired or foreign session without re-entering the purchase.
function successPath(order) {
  return `/payment/success?reference=${encodeURIComponent(order.reference)}${order.checkout_id ? `&checkout_id=${encodeURIComponent(order.checkout_id)}` : ""}`;
}

export async function verifyPayment(formData) {
  const reference = String(formData.get("reference") || "");
  const checkoutId = String(formData.get("checkout_id") || "");
  const service = createSupabaseServiceClient();
  if (!service) redirect("/payment/failed?reason=Payments+are+not+configured");

  let request = service.from("orders").select("id,reference,checkout_id,gateway,payment_status").eq("reference", reference);
  if (checkoutId) request = service.from("orders").select("id,reference,checkout_id,gateway,payment_status").eq("checkout_id", checkoutId);
  const { data: order } = await request.maybeSingle();

  if (!order) redirect("/payment/failed?reason=Order+not+found");
  if (order.payment_status !== "successful" && order.gateway === "bachs" && order.checkout_id) {
    try { await verifyCheckout(order.checkout_id); }
    catch { /* the page re-reads local status and reports it either way */ }
  }
  redirect(successPath(order));
}

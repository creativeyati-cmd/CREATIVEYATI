import { createHmac, timingSafeEqual } from "node:crypto";
import { reconcilePendingOrders } from "@/lib/payments/provider";

// Compare digests so a shared secret is not probed byte by byte.
function secretMatches(provided, expected) {
  const key = "payment-reconcile";
  const left = createHmac("sha256", key).update(String(provided)).digest();
  const right = createHmac("sha256", key).update(String(expected)).digest();
  return timingSafeEqual(left, right);
}

// Scheduler entry point: recovers orders whose webhook never arrived. Guarded by
// a shared secret rather than a user session, and safe to call repeatedly
// because settlement is idempotent.
export async function POST(request) {
  const secret = String(process.env.PAYMENT_RECONCILE_SECRET || "").trim();
  if (!secret) return Response.json({ error: "Reconciliation is not configured." }, { status: 503 });
  if (!secretMatches(request.headers.get("x-reconcile-secret") || "", secret)) return Response.json({ error: "Not authorised." }, { status: 401 });
  try {
    const report = await reconcilePendingOrders({ olderThanMinutes: 15, limit: 50 });
    return Response.json(report);
  } catch (error) {
    console.error("payment.reconcile_failed", { message: error?.message || "unknown" });
    return Response.json({ error: error?.message || "Reconciliation failed." }, { status: 500 });
  }
}

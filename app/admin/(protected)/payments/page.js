import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/data/courses";
import { getBachsConfiguration } from "@/lib/payments/provider";

export default async function PaymentsPage() {
  const service = createSupabaseServiceClient();
  const configuration = getBachsConfiguration();
  const { data: payments = [], error } = await service.from("payments").select("*,orders(reference)").order("created_at", { ascending: false }).limit(250);

  return <>
    <div className="admin-title">
      <p>COMMERCE</p>
      <h1>Payments</h1>
      <p className="admin-lede">Verified Bachs collections, channels, refunds, and their matching portfolio orders.</p>
    </div>
    <section className={`integration-status ${configuration.ready ? "is-ready" : "needs-action"}`} aria-live="polite">
      <div><strong>Bachs checkout</strong><span>{configuration.checkoutReady ? `${configuration.environment} key configured` : "API key required"}</span></div>
      <div><strong>Webhook fulfillment</strong><span>{configuration.webhookReady ? "Signing secret configured" : "Webhook secret required"}</span></div>
      {!configuration.ready && <p>Paid checkout is not fully active. Add the missing Bachs secrets to the deployment environment; free-course enrolment remains available.</p>}
    </section>
    {error ? <p className="form-error">Payments could not be loaded. Check the database connection and commerce migration.</p> : payments.length ? <div className="admin-table">
      <div><b>Order</b><b>Gateway reference</b><b>Amount</b><b>Channel</b><b>Status</b></div>
      {payments.map((payment) => <div key={payment.id}><span>{payment.orders?.reference || "—"}</span><span>{payment.gateway_reference}</span><span>{formatMoney(payment.amount_minor, payment.currency)}</span><span>{payment.channel || "—"}</span><span>{payment.status}</span></div>)}
    </div> : <p className="empty-state admin-empty-state">No verified payments yet. Completed checkouts will appear here after the signed Bachs webhook is received.</p>}
  </>;
}

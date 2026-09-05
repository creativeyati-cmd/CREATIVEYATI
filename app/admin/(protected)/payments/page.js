import { saveBachsSettings, testBachsSettings } from "@/app/admin/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/data/courses";
import { canEncryptSecrets } from "@/lib/email/crypto";
import { getBachsConfiguration } from "@/lib/payments/provider";

const WEBHOOK_URL = "https://aivideocreator.cv/api/payments/webhook";

export default async function PaymentsPage({ searchParams }) {
  const service = createSupabaseServiceClient();
  const [configuration, query] = await Promise.all([getBachsConfiguration(), searchParams]);
  const { data: payments = [], error } = await service.from("payments").select("*,orders(reference)").order("created_at", { ascending: false }).limit(250);
  const encryptionReady = canEncryptSecrets();

  return <>
    <div className="admin-title">
      <p>COMMERCE</p>
      <h1>Bachs payments</h1>
      <p className="admin-lede">Configure hosted checkout and signed webhook fulfillment, then review the collections matched to portfolio orders.</p>
    </div>
    {query.saved && <p className="success-note">Bachs payment settings updated securely.</p>}
    {query.tested === "connected" && <p className="success-note">Bachs API connection verified.</p>}
    {query.tested === "limited" && <p className="success-note">Bachs authenticated the key. The key does not include balance-reading permission, but checkout access can still be used.</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    {configuration.decryptionError && <p className="form-error">The saved Bachs credentials could not be decrypted. Replace them below before enabling checkout.</p>}
    {!encryptionReady && <p className="form-error">Server-side secret encryption is not configured, so dashboard credentials cannot be stored safely.</p>}
    <section className={`integration-status ${configuration.ready ? "is-ready" : "needs-action"}`} aria-live="polite">
      <div><strong>Bachs checkout</strong><span>{configuration.checkoutReady ? `${configuration.environment} key · ${configuration.apiKeySource}` : configuration.enabled ? "API key required" : "Disabled in dashboard"}</span></div>
      <div><strong>Webhook fulfillment</strong><span>{configuration.webhookReady ? `Signing secret · ${configuration.webhookSecretSource}` : "Webhook secret required"}</span></div>
      {!configuration.ready && <p>Paid checkout is not fully active. Complete and enable the secure configuration below; free-course enrolment remains available.</p>}
    </section>
    <form className="admin-form integration-form" action={saveBachsSettings}>
      <label className="check-label form-wide"><input name="enabled" type="checkbox" defaultChecked={configuration.enabled} /> Enable Bachs paid checkout</label>
      <label className="form-wide">Bachs API key<input name="apiKey" type="password" autoComplete="new-password" placeholder={configuration.apiKeySource !== "missing" ? `Saved in ${configuration.apiKeySource} — leave blank to keep` : "sk_sandbox_… or sk_live_…"} disabled={!encryptionReady} /><small>Stored encrypted when entered here. Sandbox and live keys automatically use their matching API host.</small></label>
      <label className="form-wide">Webhook signing secret<input name="webhookSecret" type="password" autoComplete="new-password" placeholder={configuration.webhookSecretSource !== "missing" ? `Saved in ${configuration.webhookSecretSource} — leave blank to keep` : "Paste the signing secret from Bachs"} disabled={!encryptionReady} /></label>
      <label className="check-label"><input name="clearApiKey" type="checkbox" /> Remove dashboard API key</label>
      <label className="check-label"><input name="clearWebhookSecret" type="checkbox" /> Remove dashboard webhook secret</label>
      <label className="form-wide">Webhook endpoint<input value={WEBHOOK_URL} readOnly /><small>Add this endpoint in Bachs for collection, checkout-expired, and refund events.</small></label>
      <button className="button" type="submit" disabled={!encryptionReady}>Save payment settings</button>
    </form>
    <form className="admin-test-form" action={testBachsSettings}>
      <button className="button button-secondary" type="submit" disabled={!configuration.checkoutReady}>Test Bachs connection</button>
      <small>Save first. The test authenticates against Bachs without creating a charge.</small>
    </form>
    <section className="admin-section-heading"><p>TRANSACTIONS</p><h2>Verified collections</h2></section>
    {error ? <p className="form-error">Payments could not be loaded. Check the database connection and commerce migration.</p> : payments.length ? <div className="admin-table">
      <div><b>Order</b><b>Gateway reference</b><b>Amount</b><b>Channel</b><b>Status</b></div>
      {payments.map((payment) => <div key={payment.id}><span>{payment.orders?.reference || "—"}</span><span>{payment.gateway_reference}</span><span>{formatMoney(payment.amount_minor, payment.currency)}</span><span>{payment.channel || "—"}</span><span>{payment.status}</span></div>)}
    </div> : <p className="empty-state admin-empty-state">No verified payments yet. Completed checkouts will appear here after the signed Bachs webhook is received.</p>}
  </>;
}

import DataTable from "@/Components/DataTable";
import Badge from "@/Components/Badge";
import ConfirmActionForm from "@/Components/ConfirmActionForm";
import { Input, Select, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { deleteCoupon, saveCoupon, toggleCoupon } from "@/app/admin/actions";

export default async function CouponsPage({ searchParams }) {
  const [query, service] = await Promise.all([searchParams, Promise.resolve(createSupabaseServiceClient())]);
  const { data: coupons = [], error } = await service.from("coupons").select("*").order("created_at", { ascending: false });
  const success = query.saved === "created" ? "Coupon created." : query.saved === "updated" ? "Coupon status updated." : query.saved === "deleted" ? "Coupon deleted." : "";

  return <>
    <PageHeader title={<>Coupons</>} eyebrow={<>COMMERCE</>} description={<>Create controlled discounts for course checkout and monitor redemption limits.</>}/>
    {success && <p className="success-note">{success}</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    <form className="admin-form compact" action={saveCoupon}>
      <label>Code<Input name="code" required /></label>
      <label>Type<Select name="discountType"><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></Select></label>
      <label>Discount value<Input type="number" name="discountValue" min="0.01" step="0.01" required /></label>
      <label>Currency<Input name="currency" defaultValue="NGN" maxLength="3" required /></label>
      <label>Maximum redemptions<Input type="number" name="maxRedemptions" min="1" /></label>
      <label>Starts at (Lagos, UTC+1)<Input type="datetime-local" name="startsAt" /></label>
      <label>Expires at (Lagos, UTC+1)<Input type="datetime-local" name="expiresAt" /></label>
      <label className="check-label"><Input type="checkbox" name="enabled" defaultChecked />Enabled</label>
      <Button className="button">Create coupon</Button>
    </form>
    <DataTable label="Coupons" error={error ? "Coupons could not be loaded." : undefined} emptyTitle="No coupons yet" emptyDescription="Create a discount for your course checkout."><div><b>Code</b><b>Discount type</b><b>Redemptions</b><b>Status</b><b>Actions</b></div>{coupons.map(coupon => <div key={coupon.id}><strong>{coupon.code}</strong><span>{coupon.discount_type}</span><span>{coupon.redemption_count}{coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ""}</span><Badge tone={coupon.enabled ? "success" : "neutral"}>{coupon.enabled ? "Enabled" : "Disabled"}</Badge><div className="row-actions"><form action={toggleCoupon}><Input type="hidden" name="id" value={coupon.id}/><Input type="hidden" name="enabled" value={String(!coupon.enabled)}/><Button variant="secondary">{coupon.enabled ? "Disable" : "Enable"}</Button></form>{coupon.redemption_count > 0 ? <Button variant="danger" disabled title="Used coupons are retained for order history.">Delete</Button> : <ConfirmActionForm action={deleteCoupon} fields={{id:coupon.id}} label="Delete" className="danger-action" confirmText={`Delete coupon ${coupon.code}?`}/>}</div></div>)}</DataTable>
  </>;
}

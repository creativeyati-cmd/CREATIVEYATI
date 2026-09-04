import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { deleteCoupon, saveCoupon, toggleCoupon } from "@/app/admin/actions";

export default async function CouponsPage() {
  const service = createSupabaseServiceClient();
  const { data: coupons = [] } = await service.from("coupons").select("*").order("created_at", { ascending: false });
  return <>
    <div className="admin-title"><p>COMMERCE</p><h1>Coupons</h1></div>
    <form className="admin-form compact" action={saveCoupon}>
      <label>Code<input name="code" required /></label><label>Type<select name="discountType"><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>Discount value<input type="number" name="discountValue" min="0.01" step="0.01" required /></label><label>Currency<input name="currency" defaultValue="NGN" /></label><label>Maximum redemptions<input type="number" name="maxRedemptions" min="1" /></label><label>Starts at<input type="datetime-local" name="startsAt" /></label><label>Expires at<input type="datetime-local" name="expiresAt" /></label><label className="check-label"><input type="checkbox" name="enabled" defaultChecked />Enabled</label><button className="button">Create coupon</button>
    </form>
    <div className="admin-list">{coupons.map((coupon) => <div key={coupon.id}>
      <span><b>{coupon.code}</b><small>{coupon.discount_type} · {coupon.redemption_count} redemptions{coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ""}</small></span>
      <div className="row-actions"><form action={toggleCoupon}><input type="hidden" name="id" value={coupon.id} /><input type="hidden" name="enabled" value={String(!coupon.enabled)} /><button>{coupon.enabled ? "Disable" : "Enable"}</button></form><form action={deleteCoupon}><input type="hidden" name="id" value={coupon.id} /><button disabled={coupon.redemption_count > 0} title={coupon.redemption_count > 0 ? "Used coupons are retained for order history." : "Delete coupon"}>Delete</button></form></div>
    </div>)}</div>
  </>;
}

// Coupon administration uses the studio timezone, not the deployment server timezone.
export function couponDate(value) {
  const input = String(value || "").trim();
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new Error("Enter a valid coupon date.");
  const date = new Date(input + ":00+01:00");
  if (!Number.isFinite(date.getTime())) throw new Error("Enter a valid coupon date.");
  return date.toISOString();
}

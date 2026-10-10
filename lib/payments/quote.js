import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export class QuoteError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Prices are derived from the database only. The browser sends a course id and
// a coupon code and never an amount, so a quoted total can be trusted by both
// the checkout UI and order initialisation.
export async function quoteCourse(courseId) {
  const service = createSupabaseServiceClient();
  if (!service) throw new QuoteError("Course payments are not configured.", 503);
  const { data: course, error: courseError } = await service.from("courses").select("*").eq("id", courseId).in("status", ["published", "scheduled"]).is("deleted_at", null).maybeSingle();
  if (courseError) throw new QuoteError("Course pricing is temporarily unavailable. Please try again.", 503);
  if (!course || (course.status === "scheduled" && (!course.scheduled_for || new Date(course.scheduled_for).getTime() > Date.now()))) throw new QuoteError("This course is not available.", 404);
  const currentTime = Date.now();
  const saleActive = course.discounted_price_minor != null
    && (!course.sale_starts_at || new Date(course.sale_starts_at).getTime() <= currentTime)
    && (!course.sale_ends_at || new Date(course.sale_ends_at).getTime() >= currentTime);
  const original = course.is_free ? 0 : Number(course.price_minor);
  const salePrice = course.is_free ? 0 : Math.min(original, Number(saleActive ? course.discounted_price_minor : course.price_minor));
  return { service, course, original, salePrice, discount: 0, amount: salePrice, code: "", coupon: null };
}

// Kept separate from the course lookup so callers can check ownership before
// reporting a bad coupon, which is what a returning customer needs to see.
export async function applyCoupon(quote, couponCode) {
  const code = String(couponCode || "").trim().toUpperCase();
  if (!code) return { ...quote, code: "", coupon: null, discount: 0, amount: quote.salePrice };
  const exactCode = code.replace(/[\\%_]/g, character => "\\" + character);
  const { data, error } = await quote.service.from("coupons").select("*").ilike("code", exactCode).maybeSingle();
  if (error) { console.error("coupon.lookup_failed", { code: error.code }); throw new QuoteError("Coupons are temporarily unavailable. Please try again.", 503); }
  const now = Date.now();
  if (!data || !data.enabled) throw new QuoteError("This coupon is not available. Check the code and try again.", 400);
  if (data.starts_at && new Date(data.starts_at).getTime() > now) throw new QuoteError("This coupon is not active yet.", 400);
  if (data.expires_at && new Date(data.expires_at).getTime() <= now) throw new QuoteError("This coupon has expired.", 400);
  if (data.max_redemptions != null && Number(data.redemption_count) >= Number(data.max_redemptions)) throw new QuoteError("This coupon has reached its usage limit.", 400);
  if (!["fixed","percent"].includes(data.discount_type) || !Number.isFinite(Number(data.discount_value)) || Number(data.discount_value) <= 0) throw new QuoteError("This coupon is not configured correctly.", 400);
  if (data.discount_type === "fixed" && String(data.currency || "").toUpperCase() !== quote.course.currency.toUpperCase()) throw new QuoteError("This coupon is not valid for the course currency.", 400);
  const discount = Math.min(quote.salePrice, data.discount_type === "percent"
    ? Math.round(quote.salePrice * Math.min(Number(data.discount_value), 100) / 100)
    : Math.round(Number(data.discount_value) * 100));
  return { ...quote, code, coupon: data, discount, amount: Math.max(0, quote.salePrice - discount) };
}

export function pendingOrderMatchesQuote(order, quote) {
  return Number(order.amount_minor) === quote.amount
    && order.currency === quote.course.currency
    && (order.coupon_id || null) === (quote.coupon?.id || null);
}

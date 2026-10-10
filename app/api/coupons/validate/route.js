import { quoteCourse, applyCoupon, QuoteError } from "@/lib/payments/quote";

// Validates a coupon without creating an order, so the checkout can show the
// discounted total before the customer commits to paying. The same server-side
// rules run again in /api/payments/initialize.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const courseId = String(body.courseId || "");
  const couponCode = String(body.couponCode || "");
  if (!courseId) return Response.json({ error: "A course is required." }, { status: 400 });
  if (!couponCode.trim()) return Response.json({ error: "Enter a coupon code." }, { status: 400 });
  try {
    const quote = await applyCoupon(await quoteCourse(courseId), couponCode);
    return Response.json({ ok: true, code: quote.code, discountMinor: quote.discount, totalMinor: quote.amount, currency: quote.course.currency });
  } catch (error) {
    if (error instanceof QuoteError) return Response.json({ error: error.message }, { status: error.status });
    console.error("coupon.quote_failed", { course_id: courseId, message: error?.message || "unknown" });
    return Response.json({ error: "The coupon could not be checked." }, { status: 500 });
  }
}

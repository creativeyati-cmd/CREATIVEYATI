import { getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";
import { createOrderReference, initialiseCheckout } from "@/lib/payments/provider";
import { quoteCourse, applyCoupon, QuoteError, pendingOrderMatchesQuote } from "@/lib/payments/quote";
import { sendCourseConfirmation } from "@/lib/email/delivery";

export async function POST(request) {
  const user = await getStudentUser(); const service = createSupabaseServiceClient();
  if (!user) return Response.json({ error: "Sign in before checking out." }, { status: 401 });
  if (!user.email_confirmed_at) return Response.json({ error: "Verify your email before enrolling." }, { status: 403 });
  if (!service) return Response.json({ error: "Course payments are not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})); const courseId = String(body.courseId || ""); const couponCode = String(body.couponCode || "").trim().toUpperCase();
  let quote;
  try { quote = await quoteCourse(courseId); } catch (error) { return Response.json({ error: error instanceof QuoteError ? error.message : "The course could not be loaded." }, { status: error instanceof QuoteError ? error.status : 500 }); }
  const { course } = quote;
  const { data: existing } = await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", course.id).eq("active", true).maybeSingle();
  if (existing) return Response.json({ redirectUrl: `/learn/${course.slug}` });
  try { quote = await applyCoupon(quote, couponCode); } catch (error) { return Response.json({ error: error instanceof QuoteError ? error.message : "This coupon could not be applied." }, { status: error instanceof QuoteError ? error.status : 400 }); }
  const pendingSince = Date.now() - 15 * 60 * 1000;
  const { data: pendingOrder } = await service.from("orders").select("id,reference,created_at,verification_response,amount_minor,currency,coupon_id").eq("student_id", user.id).eq("course_id", course.id).eq("payment_status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (pendingOrder) {
    const sameQuote = pendingOrderMatchesQuote(pendingOrder, quote);
    const checkoutUrl = pendingOrder.verification_response?.checkout_url; const expiresAt = new Date(pendingOrder.verification_response?.expires_at || 0).getTime();
    if (sameQuote && checkoutUrl && expiresAt > Date.now()) return Response.json({ authorizationUrl: checkoutUrl });
    if (sameQuote && !checkoutUrl && new Date(pendingOrder.created_at).getTime() > pendingSince) return Response.json({ error: "A checkout is already being prepared. Try again in a moment." }, { status: 409 });
    await service.from("orders").update({ payment_status: "abandoned", updated_at: new Date().toISOString() }).eq("id", pendingOrder.id).eq("payment_status", "pending");
  }
  // revalidated here so the order amount never comes from the browser, even if
  // the checkout screen computed its own total
  const { amount, discount, coupon, original } = quote; const reference = createOrderReference();
  const { error: orderError } = await service.from("orders").insert({ reference, student_id: user.id, course_id: course.id, amount_minor: amount, original_amount_minor: original, discount_minor: original - amount, currency: course.currency, gateway: amount === 0 ? "free" : "bachs", coupon_id: coupon?.id || null });
  if (orderError) return Response.json({ error: "The order could not be created." }, { status: 500 });
  console.info("payment.initialized", { reference, course_id: course.id, amount_minor: amount, currency: course.currency });
  if (amount === 0) {
    const { error } = await service.rpc("complete_course_purchase", { order_reference: reference, provider_reference: reference, provider_channel: "free", provider_payload: { status: "success", amount: 0, currency: course.currency, reference } });
    if (error) return Response.json({ error: "Free enrolment could not be completed." }, { status: 500 });
    if (user.email) sendCourseConfirmation({ email: user.email, courseTitle: course.title, reference, amount: 0, currency: course.currency }).catch(() => {});
    return Response.json({ redirectUrl: `/payment/success?reference=${encodeURIComponent(reference)}` });
  }
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
    // the reference goes on the success URL so an expired session can still
    // resolve and verify the order when Bachs returns the customer
    const checkout = await initialiseCheckout({ email: user.email, name: user.user_metadata?.full_name || "", amountMinor: amount, currency: course.currency, reference, successUrl: `${siteUrl}/payment/success?reference=${encodeURIComponent(reference)}`, cancelUrl: `${siteUrl}/payment/failed?reference=${encodeURIComponent(reference)}`, metadata: { order_id: reference, course_id: course.id, student_id: user.id } });
    await service.from("orders").update({ checkout_id: checkout.checkout_id, verification_response: { checkout_url: checkout.checkout_url, checkout_id: checkout.checkout_id, expires_at: checkout.expires_at }, updated_at: new Date().toISOString() }).eq("reference", reference);
    return Response.json({ authorizationUrl: checkout.checkout_url });
  } catch (error) {
    console.error("payment.initialization_failed", { reference, message: error?.message || "unknown" });
    await service.from("orders").update({ payment_status: "failed", verification_response: { initialization_error: error.message }, updated_at: new Date().toISOString() }).eq("reference", reference);
    return Response.json({ error: error.message }, { status: 502 });
  }
}

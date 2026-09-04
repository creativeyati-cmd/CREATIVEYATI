import { getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";
import { createOrderReference, initialiseCheckout } from "@/lib/payments/provider";
import { sendCourseConfirmation } from "@/lib/email/delivery";

export async function POST(request) {
  const user = await getStudentUser(); const service = createSupabaseServiceClient();
  if (!user) return Response.json({ error: "Sign in before checking out." }, { status: 401 });
  if (!service) return Response.json({ error: "Course payments are not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})); const courseId = String(body.courseId || ""); const couponCode = String(body.couponCode || "").trim().toUpperCase();
  const { data: course } = await service.from("courses").select("*").eq("id", courseId).eq("status", "published").is("deleted_at", null).maybeSingle();
  if (!course) return Response.json({ error: "This course is not available." }, { status: 404 });
  const { data: existing } = await service.from("enrolments").select("id").eq("student_id", user.id).eq("course_id", course.id).eq("active", true).maybeSingle();
  if (existing) return Response.json({ redirectUrl: `/learn/${course.slug}` });
  const pendingSince = Date.now() - 15 * 60 * 1000;
  const { data: pendingOrder } = await service.from("orders").select("id,reference,created_at,verification_response").eq("student_id", user.id).eq("course_id", course.id).eq("payment_status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (pendingOrder) {
    const checkoutUrl = pendingOrder.verification_response?.checkout_url; const expiresAt = new Date(pendingOrder.verification_response?.expires_at || 0).getTime();
    if (checkoutUrl && expiresAt > Date.now()) return Response.json({ authorizationUrl: checkoutUrl });
    if (!checkoutUrl && new Date(pendingOrder.created_at).getTime() > pendingSince) return Response.json({ error: "A checkout is already being prepared. Try again in a moment." }, { status: 409 });
    await service.from("orders").update({ payment_status: "abandoned", updated_at: new Date().toISOString() }).eq("id", pendingOrder.id).eq("payment_status", "pending");
  }
  const original = course.is_free ? 0 : Number(course.price_minor);
  const salePrice = course.is_free ? 0 : Number(course.discounted_price_minor ?? course.price_minor);
  let discount = 0; let coupon = null;
  if (couponCode) {
    const { data } = await service.from("coupons").select("*").eq("code", couponCode).eq("enabled", true).maybeSingle(); const now = Date.now();
    if (!data || (data.starts_at && new Date(data.starts_at).getTime() > now) || (data.expires_at && new Date(data.expires_at).getTime() < now) || (data.max_redemptions && data.redemption_count >= data.max_redemptions)) return Response.json({ error: "This coupon is invalid or expired." }, { status: 400 });
    if (data.discount_type === "fixed" && data.currency.toUpperCase() !== course.currency.toUpperCase()) return Response.json({ error: "This coupon is not valid for the course currency." }, { status: 400 });
    coupon = data; discount = data.discount_type === "percent" ? Math.round(salePrice * Math.min(Number(data.discount_value), 100) / 100) : Math.round(Number(data.discount_value) * 100); discount = Math.min(salePrice, discount);
  }
  const amount = Math.max(0, salePrice - discount); const reference = createOrderReference();
  const { error: orderError } = await service.from("orders").insert({ reference, student_id: user.id, course_id: course.id, amount_minor: amount, original_amount_minor: original, discount_minor: original - amount, currency: course.currency, gateway: amount === 0 ? "free" : "bachs", coupon_id: coupon?.id || null });
  if (orderError) return Response.json({ error: "The order could not be created." }, { status: 500 });
  if (amount === 0) {
    const { error } = await service.rpc("complete_course_purchase", { order_reference: reference, provider_reference: reference, provider_channel: "free", provider_payload: { status: "success", amount: 0, currency: course.currency, reference } });
    if (error) return Response.json({ error: "Free enrolment could not be completed." }, { status: 500 });
    if (user.email) sendCourseConfirmation({ email: user.email, courseTitle: course.title, reference, amount: 0, currency: course.currency }).catch(() => {});
    return Response.json({ redirectUrl: `/payment/success?reference=${encodeURIComponent(reference)}` });
  }
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv";
    const checkout = await initialiseCheckout({ email: user.email, name: user.user_metadata?.full_name || "", amountMinor: amount, currency: course.currency, reference, successUrl: `${siteUrl}/payment/success`, cancelUrl: `${siteUrl}/payment/failed?reference=${encodeURIComponent(reference)}`, metadata: { order_id: reference, course_id: course.id, student_id: user.id } });
    await service.from("orders").update({ checkout_id: checkout.checkout_id, verification_response: { checkout_url: checkout.checkout_url, checkout_id: checkout.checkout_id, expires_at: checkout.expires_at }, updated_at: new Date().toISOString() }).eq("reference", reference);
    return Response.json({ authorizationUrl: checkout.checkout_url });
  } catch (error) {
    await service.from("orders").update({ payment_status: "failed", verification_response: { initialization_error: error.message }, updated_at: new Date().toISOString() }).eq("reference", reference);
    return Response.json({ error: error.message }, { status: 502 });
  }
}

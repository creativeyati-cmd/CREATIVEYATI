import Link from "next/link";
import { redirect } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import { getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyCheckout } from "@/lib/payments/provider";
import { verifyPayment } from "@/app/payment/actions";

// Verification is deliberately independent of the browser session: Bachs can
// return minutes after the cookie expired, and the money is already taken.
// The reference resolves the order, and only the course link needs an account.
export default async function PaymentSuccessPage({ searchParams }) {
  const [query, site, user] = await Promise.all([searchParams, getSiteContent(), getStudentUser()]);
  const reference = String(query.reference || "");
  const checkoutId = String(query.checkout_id || "");
  const service = createSupabaseServiceClient();
  if (!service) redirect("/payment/failed?reason=Payments+are+not+configured");
  if (!reference && !checkoutId) redirect("/payment/failed?reason=Missing+payment+reference");

  const select = "*,courses(title,slug)";
  let request = service.from("orders").select(select).eq("reference", reference);
  if (checkoutId) request = service.from("orders").select(select).eq("checkout_id", checkoutId);
  const { data: initial } = await request.maybeSingle();
  if (!initial) redirect("/payment/failed?reason=Order+not+found");
  console.info("payment.customer_returned", { reference: initial.reference, checkout_id: checkoutId || null, signed_in: Boolean(user) });

  let order = initial;
  let verifyError = "";
  if (order.payment_status !== "successful" && order.gateway === "bachs" && order.checkout_id) {
    console.info("payment.verification_request", { reference: order.reference, checkout_id: order.checkout_id });
    try {
      await verifyCheckout(order.checkout_id);
    } catch (caught) {
      verifyError = caught?.message || "";
    }
    const { data: refreshed } = await service.from("orders").select(select).eq("id", order.id).maybeSingle();
    if (refreshed) order = refreshed;
  }

  const successPath = `/payment/success?reference=${encodeURIComponent(order.reference)}${order.checkout_id ? `&checkout_id=${encodeURIComponent(order.checkout_id)}` : ""}`;
  const owns = Boolean(user && user.id === order.student_id);
  const confirmed = order.payment_status === "successful";
  const failed = !confirmed && ["failed", "abandoned"].includes(order.payment_status);
  const courseTitle = order.courses.title;

  let heading = "Payment is still being verified.";
  let body = verifyError || "We have not received confirmation from Bachs yet. Your card has not been charged twice — retry verification in a moment.";
  if (confirmed) { heading = "You’re enrolled."; body = `${courseTitle} is now available in your learning area.`; }
  else if (failed) { heading = "Payment was not completed."; body = verifyError || "Bachs did not confirm this payment, so your course access has not changed. You can safely try again."; }

  return <main className="public-page">
    <PublicHeader site={site} />
    <section className="payment-result public-note">
      <p className="eyebrow">PAYMENT STATUS</p>
      <h1 className="page-title">{heading}</h1>
      <p>{body}</p>
      <p className="secure-note">Order {order.reference}</p>

      {confirmed && owns && <Link className="button" href={`/learn/${order.courses.slug}`}>Start learning</Link>}
      {confirmed && !owns && <Link className="button" href={`/login?next=${encodeURIComponent(successPath)}`}>Sign in to open your course</Link>}
      {confirmed && !owns && <p className="secure-note">Payment is confirmed for {order.reference}. Sign in with the account that made this purchase to open it.</p>}

      {!confirmed && !failed && <form action={verifyPayment}>
        <input type="hidden" name="reference" value={order.reference} />
        {order.checkout_id && <input type="hidden" name="checkout_id" value={order.checkout_id} />}
        <button className="button" type="submit">Verify payment</button>
      </form>}
      {!confirmed && !failed && <p className="secure-note">We check Bachs directly. Do not pay again — retrying verification cannot create a second charge.</p>}

      {failed && <Link className="button" href={`/checkout/${order.course_id}`}>Try this purchase again</Link>}
      {failed && <p className="secure-note"><Link className="inline-link" href="/contact">Need help with this payment?</Link></p>}
    </section>
  </main>;
}

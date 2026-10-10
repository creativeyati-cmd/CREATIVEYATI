"use client";

import Image from "next/image";
import Link from "next/link";
import ToastFeedback from "./AdminToast";
import { useState } from "react";
import PaymentButton from "./PaymentButton";
import { formatMoney } from "@/lib/money/format";

// A coupon only affects the total once the server confirms it, and the pay
// button is held back while a code is typed but not yet applied, so the amount
// shown and the amount charged can never disagree.
export default function CheckoutForm({ courseId, email, currency, amountMinor, isFree, course, verified = true }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [applied, setApplied] = useState(null);
  const [message, setMessage] = useState("");
  const [total, setTotal] = useState(amountMinor);

  const typed = code.trim();
  const awaitingApply = Boolean(typed && (!applied || typed !== applied.code));

  async function apply() {
    if (!typed || status === "applying") return;
    setStatus("applying");
    setMessage("");
    try {
      const response = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, couponCode: typed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This coupon could not be applied.");
      setCode(result.code);
      setApplied({ code: result.code, discountMinor: result.discountMinor });
      setTotal(result.totalMinor);
      setStatus("applied");
      setMessage(result.discountMinor > 0 ? `${result.code} applied — you save ${formatMoney(result.discountMinor, currency)}.` : `${result.code} is valid but does not reduce this course.`);
    } catch (couponError) {
      setApplied(null);
      setTotal(amountMinor);
      setStatus("error");
      setMessage(couponError.message);
    }
  }

  function remove() {
    setApplied(null);
    setCode("");
    setTotal(amountMinor);
    setStatus("idle");
    setMessage("");
  }

  const money = value => value === 0 ? "Free" : formatMoney(value, currency);
  const saleDiscount = Math.max(0, course.priceMinor - amountMinor);
  function changeCode(value) {
    setCode(value);
    if (applied) { setApplied(null); setTotal(amountMinor); }
    setMessage("");
    setStatus("idle");
  }

  return <div className="checkout-flow">
    <header className="checkout-introduction">
      <Link className="checkout-back" href={"/courses/"+course.slug}>&larr; Back to course</Link>
      <p className="checkout-kicker">AI VIDEO CREATOR / ACADEMY</p>
      <h1>Checkout</h1><p>A new chapter. One simple step.</p>
    </header>
    <aside className="checkout-order" aria-label="Order summary">
      <div className="checkout-order-box">
        <div className="checkout-block-heading"><h2>Your course</h2><Link href={"/courses/"+course.slug}>View course</Link></div>
        <div className="checkout-order-item">
          {course.coverImageUrl&&<Image src={course.coverImageUrl} alt="" width={80} height={80} unoptimized style={{objectPosition:`${course.coverFocalX??50}% ${course.coverFocalY??50}%`}}/>}
          <div><h3>{course.title}</h3><p>{course.moduleCount} modules &middot; {course.lessonCount} lessons</p><span>Single course enrolment</span></div>
        </div>
      </div>
      <dl className="checkout-order-totals" aria-live="polite">
        <div><dt>Course price</dt><dd>{money(course.priceMinor)}</dd></div>
        {saleDiscount>0&&<div><dt>Course discount</dt><dd>-{formatMoney(saleDiscount,currency)}</dd></div>}
        {applied?.discountMinor>0&&<div className="checkout-discount-row"><dt>Coupon savings</dt><dd>-{formatMoney(applied.discountMinor,currency)}</dd></div>}
        <div className="checkout-final-total"><dt>Total</dt><dd>{money(total)}</dd></div>
      </dl>
      <p className="checkout-order-help">Questions before you enrol? <Link href="/contact">We can help.</Link></p>
    </aside>
    <form className="checkout-action-column" onSubmit={event=>{event.preventDefault(); if(verified&&typed)apply();}}>
      <section className="checkout-step-block">
        <div className="checkout-block-heading"><h2><span>01</span> Your account</h2><span className={verified?"checkout-verified":"checkout-pending"}>{verified?"Verified":"Verification needed"}</span></div>
        <div className="checkout-account"><span className="checkout-account-icon" aria-hidden="true">@</span><div><strong>Course access will be linked to</strong><p>{email}</p></div></div>
        {!verified&&<Link className="checkout-verification-link" href={"/verify-email?next="+encodeURIComponent("/checkout/"+courseId)}>Verify your email to continue &rarr;</Link>}
      </section>
      <section className="checkout-step-block">
        <div className="checkout-block-heading"><h2><span>02</span> Course access</h2></div>
        <div className="checkout-access-choice"><span className="checkout-choice-check" aria-hidden="true">&#10003;</span><strong>Learn in your student dashboard</strong><p>{isFree?"Your course appears after enrolment.":"Your course appears once payment is confirmed."}</p></div>
      </section>
      {!isFree&&<section className="checkout-step-block">
        <div className="checkout-block-heading"><h2><span>03</span> Payment</h2></div>
        <div className="checkout-provider"><span className="checkout-choice-check" aria-hidden="true">&#10003;</span><strong>Bachs</strong><p>Secure online checkout</p></div>
        <p className="checkout-provider-note">Continue to Bachs to choose an available payment method and complete your purchase.</p>
        <div className="checkout-discount">
          <label htmlFor="coupon-code">Discount code <span>(optional)</span></label>
          <div className="checkout-discount-input"><input id="coupon-code" value={code} onChange={event=>changeCode(event.target.value)} autoComplete="off" spellCheck="false" disabled={!verified||status==="applying"} placeholder="Enter your code"/>
          <button type="button" onClick={apply} disabled={!verified||status==="applying"||!typed}>{status==="applying"?"Checking...":"Apply"}</button></div>
          {message&&(status==="error"?<ToastFeedback kind="error" message={message}/>:<p className="checkout-discount-message" role="status">{message}</p>)}
          {applied&&<button type="button" className="checkout-remove-code" onClick={remove}>Remove {applied.code}</button>}
          {awaitingApply&&!message&&<p className="checkout-discount-message">Apply this code before continuing.</p>}
        </div>
      </section>}
      <div className="checkout-pay-review"><span>Total to {isFree?"enrol":"pay"}</span><strong>{money(total)}</strong></div>
      {verified?<PaymentButton courseId={courseId} isFree={isFree} couponCode={applied?.code||""} amountMinor={total} currency={currency} disabled={status==="applying"||awaitingApply}/>:<Link className="button checkout-pay" href={"/verify-email?next="+encodeURIComponent("/checkout/"+courseId)}>Verify email to continue</Link>}
      <div className="checkout-assurance"><span><i aria-hidden="true">&#10003;</i> Account-linked access</span><span><i aria-hidden="true">&#10003;</i> {isFree?"No payment required":"Payment handled by Bachs"}</span></div>
      <p className="checkout-footnote">{isFree?"Enrol to add this course to your dashboard.":"Your card details are entered on the payment provider&apos;s page."}</p>
    </form>
  </div>;
}

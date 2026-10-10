"use client";

import ToastFeedback from "./AdminToast";
import { useState } from "react";
import { formatMoney } from "@/lib/money/format";

// The amount is passed in from the server-computed quote, so the label always
// matches what /api/payments/initialize will charge after revalidating.
export default function PaymentButton({ courseId, isFree = false, couponCode = "", amountMinor = 0, currency = "NGN", disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function pay(event) {
    event.preventDefault();
    if (loading || disabled) return;
    const form = event.currentTarget.form;
    if (!form.reportValidity()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, couponCode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment could not be started.");
      window.location.assign(result.authorizationUrl || result.redirectUrl);
    } catch (paymentError) {
      setLoading(false);
      setError(paymentError.message);
    }
  }
  const label = loading ? "Opening secure checkout…" : isFree ? "Enrol for free" : `Continue to payment - ${formatMoney(amountMinor, currency)}`;
  return <>
    <button className="button checkout-pay" type="button" disabled={loading || disabled} aria-busy={loading || undefined} onClick={pay}>{label}</button>
    {error && <ToastFeedback kind="error" message={error}/>}
  </>;
}

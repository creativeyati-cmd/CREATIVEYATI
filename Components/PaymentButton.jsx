"use client";

import { useState } from "react";

export default function PaymentButton({ courseId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function pay(event) {
    event.preventDefault(); if (loading) return;
    const form = event.currentTarget.form;
    if (!form.reportValidity()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, couponCode: form.elements.couponCode?.value || "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment could not be started.");
      window.location.assign(result.authorizationUrl || result.redirectUrl);
    } catch (paymentError) { setLoading(false); setError(paymentError.message); }
  }
  return <><button className="button" type="button" disabled={loading} onClick={pay}>{loading ? "Opening secure checkout…" : "Continue to secure payment"}</button>{error && <p className="form-error" role="alert">{error}</p>}</>;
}

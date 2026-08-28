"use client";

import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState({ loading: false, message: "", status: "idle" });
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setState({ loading: true, message: "", status: "idle" });
    try {
      const response = await fetch("/api/enquiries", { method: "POST", body: new FormData(form) });
      const payload = await response.json();
      if (response.ok) {
        form.reset();
        setState({ loading: false, message: payload.message || "Thanks — your enquiry has been received.", status: "success" });
      } else {
        setState({ loading: false, message: payload.error || "Unable to send your enquiry.", status: "error" });
      }
    } catch {
      setState({ loading: false, message: "Unable to send your enquiry. Please try again.", status: "error" });
    }
  }
  return <form className="contact-form" onSubmit={submit} noValidate>
    <input name="website" tabIndex="-1" autoComplete="off" className="honeypot" aria-hidden="true" />
    <label>Name<input required name="name" autoComplete="name" /></label><label>Email<input required name="email" type="email" autoComplete="email" /></label>
    <label>Phone number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength="40" /></label><label>Company<input name="company" autoComplete="organization" /></label>
    <label>Project type<input name="projectType" /></label>
    <label className="form-wide">Tell us about your project<textarea required name="message" rows="4" /></label>
    <label className="consent"><input required name="consent" type="checkbox" /> I agree to be contacted about this enquiry.</label>
    <button className="button" disabled={state.loading}>{state.loading ? "Sending…" : "Send enquiry"}</button>
    {state.message && <p className={`contact-form-message is-${state.status}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>}
  </form>;
}

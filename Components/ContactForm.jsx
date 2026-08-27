"use client";

import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState({ loading: false, message: "" });
  async function submit(event) {
    event.preventDefault(); setState({ loading: true, message: "" });
    const response = await fetch("/api/enquiries", { method: "POST", body: new FormData(event.currentTarget) });
    const payload = await response.json();
    if (response.ok) { event.currentTarget.reset(); setState({ loading: false, message: payload.message }); }
    else setState({ loading: false, message: payload.error || "Unable to send your enquiry." });
  }
  return <form className="contact-form" onSubmit={submit} noValidate>
    <input name="website" tabIndex="-1" autoComplete="off" className="honeypot" aria-hidden="true" />
    <label>Name<input required name="name" autoComplete="name" /></label><label>Email<input required name="email" type="email" autoComplete="email" /></label>
    <label>Company<input name="company" autoComplete="organization" /></label><label>Project type<input name="projectType" /></label>
    <label className="form-wide">Tell us about your project<textarea required name="message" rows="4" /></label>
    <label className="consent"><input required name="consent" type="checkbox" /> I agree to be contacted about this enquiry.</label>
    <button className="button" disabled={state.loading}>{state.loading ? "Sending…" : "Send enquiry"}</button>{state.message && <p role="status">{state.message}</p>}
  </form>;
}

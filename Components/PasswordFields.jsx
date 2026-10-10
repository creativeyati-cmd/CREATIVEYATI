"use client";

import { useId, useRef, useState } from "react";

export default function PasswordFields({ label = "Password" }) {
  const id = useId();
  const password = useRef(null);
  const confirmation = useRef(null);
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState("");

  function validate() {
    const first = password.current.value;
    const second = confirmation.current.value;
    const mismatch = second && first !== second;
    confirmation.current.setCustomValidity(mismatch ? "Your passwords do not match." : "");
    setFeedback(second && !mismatch ? "Passwords match." : "");
  }

  return <div className="password-fields">
    <label htmlFor={`${id}-password`}>{label}</label>
    <div className="password-input-wrap">
      <input ref={password} id={`${id}-password`} name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} required aria-describedby={`${id}-hint`} onChange={validate}/>
      <button type="button" className="password-visibility" aria-pressed={visible} aria-label={visible ? "Hide passwords" : "Show passwords"} onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button>
    </div>
    <p className="password-hint" id={`${id}-hint`}>Use at least 12 characters. A memorable phrase works well.</p>
    <label htmlFor={`${id}-confirm`}>Confirm password</label>
    <input ref={confirmation} id={`${id}-confirm`} name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} required aria-describedby={`${id}-feedback`} onChange={validate}/>
    <p className="password-hint password-feedback" id={`${id}-feedback`} role="status">{feedback}</p>
  </div>;
}

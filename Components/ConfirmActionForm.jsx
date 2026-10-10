"use client";
import SubmitButton from "./SubmitButton";
import { useRef } from "react";
import { Button } from "./FormControls";

export default function ConfirmActionForm({ action, fields, label, confirmText, className = "" }) {
  const dialog = useRef(null);
  const trigger = useRef(null);
  const buttonClass = className.includes("danger") ? "button button-danger" : "button button-secondary";
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  return <form className={className} action={action} onSubmit={event => { if (confirmText && !dialog.current?.open) { event.preventDefault(); dialog.current?.showModal(); } }}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    {confirmText ? <><Button ref={trigger} type="button" className={buttonClass} onClick={() => dialog.current?.showModal()}>{label}</Button><dialog ref={dialog} className="admin-dialog" aria-label={label}><h2>{label}</h2><p>{confirmText}</p><div className="admin-dialog-actions"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><SubmitButton className={buttonClass}>{label}</SubmitButton></div></dialog></> : <SubmitButton className={buttonClass}>{label}</SubmitButton>}
  </form>;
}

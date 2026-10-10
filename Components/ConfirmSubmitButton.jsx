"use client";
import { usePendingToast } from "./ToastHost";
import { useFormStatus } from "react-dom";
import { useRef } from "react";
import { Button } from "./FormControls";

export default function ConfirmSubmitButton({ children, message, className = "button button-danger", formAction }) {
  const { pending } = useFormStatus();
  const dialog = useRef(null);
  const trigger = useRef(null);
  usePendingToast(pending);
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  return <><Button ref={trigger} className={className} type="button" disabled={pending} onClick={() => dialog.current?.showModal()}>{children}</Button><dialog ref={dialog} className="admin-dialog" aria-label="Confirm action"><h2>{children}</h2><p>{message}</p><div className="admin-dialog-actions"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button className={className} formAction={formAction} onClick={event => { if (!dialog.current?.open) { event.preventDefault(); dialog.current?.showModal(); } }} type="submit" disabled={pending} aria-busy={pending || undefined}>{pending ? "Working…" : children}</Button></div></dialog></>;
}

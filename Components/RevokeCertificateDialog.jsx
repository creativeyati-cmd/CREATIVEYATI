"use client";
import { Input } from "@/Components/FormControls";

import { useRef } from "react";
import SubmitButton from "@/Components/SubmitButton";
import { revokeCertificate } from "@/app/admin/actions";

// revoking is destructive and needs a reason, so it gets a real dialog instead
// of a cramped disclosure inside a table cell
export default function RevokeCertificateDialog({ id, serial }) {
  const dialog = useRef(null);
  const triggerRef = useRef(null);

  // returning focus to the row's trigger is what the platform will not do
  function close() {
    dialog.current?.close();
    triggerRef.current?.focus();
  }

  return <>
    <button ref={triggerRef} className="inline-link" type="button" onClick={() => dialog.current?.showModal()}>Revoke</button>
    <dialog
      ref={dialog}
      className="admin-dialog"
      aria-labelledby={`revoke-title-${id}`}
      onClick={(event) => { if (event.target === dialog.current) close(); }}
    >
      <form className="admin-form" action={revokeCertificate}>
        <Input type="hidden" name="id" value={id} />
        <h2 id={`revoke-title-${id}`}>Revoke {serial}?</h2>
        <p>The public verification page will report this certificate as revoked, with the reason below recorded. Anyone who checks the serial will see it.</p>
        <label>Reason<Input name="reason" placeholder="Issued in error, chargeback, misconduct…" required /></label>
        <div className="admin-dialog-actions">
          <button className="button button-secondary" type="button" onClick={close}>Cancel</button>
          <SubmitButton className="button button-danger" pendingLabel="Revoking…">Revoke certificate</SubmitButton>
        </div>
      </form>
    </dialog>
  </>;
}

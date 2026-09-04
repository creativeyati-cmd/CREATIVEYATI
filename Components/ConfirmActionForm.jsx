"use client";

export default function ConfirmActionForm({ action, fields, label, confirmText, className = "" }) {
  return <form className={className} action={action} onSubmit={(event) => { if (confirmText && !window.confirm(confirmText)) event.preventDefault(); }}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <button>{label}</button>
  </form>;
}

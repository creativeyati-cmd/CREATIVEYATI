"use client";

export default function ConfirmSubmitButton({ children, message, className }) {
  return <button className={className} type="submit" onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}

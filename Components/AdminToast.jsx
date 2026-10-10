export default function AdminToast({ message, kind = "success" }) {
  return message ? <span hidden data-toast-message={message} data-toast-kind={kind} /> : null;
}

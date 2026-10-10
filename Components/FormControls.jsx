// Keep native validation, form actions and controlled inputs intact.
export function Input({ className = "", ...props }) {
  return <input className={`dashboard-input ${className}`} {...props}/>;
}
export function Select({ className = "", ...props }) {
  return <select className={`dashboard-input ${className}`} {...props}/>;
}
export function Textarea({ className = "", ...props }) {
  return <textarea className={`dashboard-input ${className}`} {...props}/>;
}
export function Button({ variant = "primary", className = "", ...props }) {
  return <button className={`button${variant === "primary" ? "" : ` button-${variant}`} ${className}`} {...props}/>;
}

"use client";
import { Button } from "./FormControls";

import { usePendingToast } from "./ToastHost";
import { useFormStatus } from "react-dom";

// Reads the nearest form's pending state, so every server action gets a real
// pending button without each page wiring its own. Place inside the <form>.
export default function SubmitButton({ children, pendingLabel = "Working…", className = "button", disabled = false }) {
  const { pending } = useFormStatus();
  usePendingToast(pending, pendingLabel);
  return <Button className={className} type="submit" disabled={pending || disabled} aria-busy={pending || undefined}>
    {pending ? pendingLabel : children}
  </Button>;
}

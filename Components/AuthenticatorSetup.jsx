"use client";
import ToastFeedback from "@/Components/AdminToast";

import { Input } from "@/Components/FormControls";
import { useActionState } from "react";
import { enrollAuthenticator, verifyAuthenticator } from "@/app/admin/mfa/actions";
import SubmitButton from "@/Components/SubmitButton";
function Verify({factorId}) {
 const [state,action]=useActionState(verifyAuthenticator,{});
 return <form className="admin-form fm-auth-form" action={action}><Input name="factorId" type="hidden" value={factorId}/><label>Authenticator code<Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>{state.error&&<ToastFeedback kind="error" message={state.error}/>}<SubmitButton pendingLabel="Verifying...">Verify and continue</SubmitButton></form>;
}
export default function AuthenticatorSetup({factorId}) {
 const [state,action,pending]=useActionState(enrollAuthenticator,{});
 if(factorId)return <Verify factorId={factorId}/>;
 return <>{state.factorId?<><p>Scan this QR code with your authenticator app. Keep the setup key in a safe place.</p><div className="mfa-qr" dangerouslySetInnerHTML={{__html:state.qr}}/><details><summary>Enter a setup key instead</summary><code className="mfa-secret">{state.secret}</code></details><Verify factorId={state.factorId}/></>:<form action={action}><SubmitButton pendingLabel="Preparing...">Set up authenticator</SubmitButton></form>}{pending&&<p role="status">Preparing secure setup...</p>}{state.error&&<ToastFeedback kind="error" message={state.error}/>}</>;
}

import {cookies} from "next/headers";
import Link from "next/link";
import AuthLayout from "@/Components/AuthLayout";
import ToastFeedback from "@/Components/AdminToast";
import SubmitButton from "@/Components/SubmitButton";
import {requestPasswordReset,verifyPasswordRecoveryCode} from "@/app/student-actions";
import {safeNext} from "@/lib/auth/redirect";

export const metadata={title:"Enter your password reset code",robots:{index:false,follow:false}};
export default async function ResetCodePage({searchParams}){
 const query=await searchParams,next=safeNext(query.next);
 const email=(await cookies()).get("avc_recovery_email")?.value||"";
 return <AuthLayout title="Check your inbox." description="Enter the code from your latest reset email. Then choose a new password.">
  {query.error&&<ToastFeedback kind="error" message={query.error}/>}
  {query.message&&<ToastFeedback message={query.message}/>}
  <form className="admin-form fm-auth-form" action={verifyPasswordRecoveryCode}>
   <input type="hidden" name="next" value={next}/>
   <label>Email<input name="email" type="email" defaultValue={email} autoComplete="email" required/></label>
   <label>Reset code<input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required/></label>
   <SubmitButton pendingLabel="Verifying...">Continue to new password</SubmitButton>
  </form>
  <details className="fm-auth-alt"><summary>Code expired or not received?</summary><form className="admin-form" action={requestPasswordReset}><input type="hidden" name="next" value={next}/><label>Email<input name="email" type="email" defaultValue={email} required/></label><SubmitButton pendingLabel="Sending...">Send a new reset code</SubmitButton></form></details>
  <p className="fm-auth-alt">If your email contains a reset link instead, you can still open that link.</p>
  <p className="fm-auth-alt"><Link href={"/login?next="+encodeURIComponent(next)}>Back to sign in</Link></p>
 </AuthLayout>;
}

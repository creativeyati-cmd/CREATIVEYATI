import ToastFeedback from "@/Components/AdminToast";
import { cookies } from "next/headers";
import Link from "next/link";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
import { resendStudentVerification, verifyStudentEmail } from "@/app/student-actions";
import { safeNext } from "@/lib/auth/redirect";
export default async function VerifyEmailPage({searchParams}) {
 const query=await searchParams,next=safeNext(query.next);
 const email=(await cookies()).get("avc_signup_email")?.value||"";
 return <AuthLayout title="Check your inbox." description="Enter the code from your latest sign-up email. Keep this page open while you check your inbox.">
 {query.error&&<ToastFeedback kind="error" message={query.error}/>}{query.message&&<p role="status" className="success-note">{query.message}</p>}
 <form className="admin-form fm-auth-form" action={verifyStudentEmail}><input type="hidden" name="next" value={next}/><label>Email<input name="email" defaultValue={email} type="email" autoComplete="email" required/></label><label>Verification code<input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required/></label><SubmitButton pendingLabel="Verifying...">Verify email</SubmitButton></form>
 <details className="fm-auth-alt"><summary>Code expired or not received?</summary><form className="admin-form" action={resendStudentVerification}><input type="hidden" name="next" value={next}/><label>Email<input name="email" defaultValue={email} type="email" required/></label><SubmitButton pendingLabel="Sending...">Send a new code</SubmitButton></form></details>
 <p className="fm-auth-alt"><Link href={"/login?next="+encodeURIComponent(next)}>Back to sign in</Link></p></AuthLayout>;
}

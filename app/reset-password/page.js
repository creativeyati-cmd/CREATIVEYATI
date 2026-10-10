import ToastFeedback from "@/Components/AdminToast";
import Link from "next/link";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
import { requestPasswordReset } from "@/app/student-actions";
import { safeNext } from "@/lib/auth/redirect";
export default async function ResetPage({searchParams}) {
 const query=await searchParams,next=safeNext(query.next);
 return <AuthLayout title="Forgot your password?" description="Enter your account email to receive a password reset code.">{query.error&&<ToastFeedback kind="error" message={query.error}/>}{query.message&&<p role="status" className="success-note">{query.message}</p>}
 <form className="admin-form fm-auth-form" action={requestPasswordReset}><input type="hidden" name="next" value={next}/><label>Email<input name="email" type="email" autoComplete="email" required/></label><SubmitButton pendingLabel="Sending...">Send reset code</SubmitButton></form><p className="fm-auth-alt"><Link href={"/login?next="+encodeURIComponent(next)}>Back to sign in</Link></p></AuthLayout>;
}

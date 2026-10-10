import ToastFeedback from "@/Components/AdminToast";
import PasswordFields from "@/Components/PasswordFields";
import Link from "next/link";
import { cookies } from "next/headers";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
import { studentRegister } from "@/app/student-actions";
import { safeNext, CHECKOUT_COOKIE, checkoutIntentPath } from "@/lib/auth/redirect";
export const metadata={title:"Create your account"};
export default async function RegisterPage({searchParams}) {
 const query=await searchParams;
 // registration is an interruption of a purchase, not a new journey: restore
 // the chosen course when no ?next= arrived with the link
 const intent=checkoutIntentPath((await cookies()).get(CHECKOUT_COOKIE)?.value);
 const next=safeNext(query.next, intent||"/learn");
 return <AuthLayout title="Make your next move." description="Create your account, verify your email and start learning.">
 {query.error&&<ToastFeedback kind="error" message={query.error}/>}
 <form className="admin-form fm-auth-form" action={studentRegister}><input type="hidden" name="next" value={next}/><label>Full name<input name="fullName" autoComplete="name" maxLength={120} required/><small>This name appears on your certificate.</small></label><label>Email<input name="email" type="email" autoComplete="email" required/></label><PasswordFields/><label className="check-label"><input type="checkbox" name="newsletter"/>Send me academy newsletters and offers (optional).</label><SubmitButton pendingLabel="Creating account...">Create account</SubmitButton></form>
 <p className="fm-auth-alt">Already registered? <Link href={"/login?next="+encodeURIComponent(next)}>Sign in</Link></p></AuthLayout>;
}

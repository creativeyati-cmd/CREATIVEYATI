import ToastFeedback from "@/Components/AdminToast";
import Link from "next/link";
import { cookies } from "next/headers";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
import { studentSignIn } from "@/app/student-actions";
import { safeNext, CHECKOUT_COOKIE, checkoutIntentPath } from "@/lib/auth/redirect";
export const metadata={title:"Sign in"};
export default async function LoginPage({searchParams}) {
 const query=await searchParams;
 // a visitor bounced here from checkout carries no ?next=, so fall back to the
 // course they had open instead of dropping them on the dashboard
 const intent=checkoutIntentPath((await cookies()).get(CHECKOUT_COOKIE)?.value);
 const next=safeNext(query.next, intent||"/learn");
 return <AuthLayout title="Welcome back." description={next.startsWith("/checkout/")?"Sign in to continue your course purchase.":"Pick up where you left off."}>
 {query.message&&<p role="status" className="success-note">{query.message}</p>}{query.error&&<ToastFeedback kind="error" message={query.error}/>}
 <form className="admin-form fm-auth-form" action={studentSignIn}><input type="hidden" name="next" value={next}/><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><Link className="inline-link" href={"/reset-password?next="+encodeURIComponent(next)}>Forgot password?</Link><SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton></form>
 <p className="fm-auth-alt">New here? <Link href={"/register?next="+encodeURIComponent(next)}>Create an account</Link></p><p className="fm-auth-alt"><Link href="/courses">Explore courses</Link></p></AuthLayout>;
}

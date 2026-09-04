import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import { requestPasswordReset } from "@/app/student-actions";
export default async function ResetPasswordPage({ searchParams }) { const [site, query] = await Promise.all([getSiteContent(), searchParams]); return <main className="public-page"><PublicHeader site={site} /><section className="auth-page public-note"><h1 className="page-title">Reset password.</h1>{query.message && <p className="success-note">{query.message}</p>}<form className="auth-form" action={requestPasswordReset}><label>Email<input type="email" name="email" required /></label><button className="button">Send reset link</button></form></section></main>; }

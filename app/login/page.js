import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import { studentSignIn } from "@/app/student-actions";

export const metadata = { title: "Student sign in" };
export default async function LoginPage({ searchParams }) { const [site, query] = await Promise.all([getSiteContent(), searchParams]); return <main className="public-page"><PublicHeader site={site} /><section className="auth-page public-note"><p className="eyebrow">STUDENT ACCESS</p><h1 className="page-title">Continue learning.</h1>{query.message && <p className="success-note">{query.message}</p>}{query.error && <p className="form-error">{query.error}</p>}<form className="auth-form" action={studentSignIn}><input type="hidden" name="next" value={query.next || "/learn"} /><label>Email<input type="email" name="email" autoComplete="email" required /></label><label>Password<input type="password" name="password" autoComplete="current-password" required /></label><button className="button">Sign in</button></form><p><Link className="inline-link" href="/reset-password">Forgot password?</Link> · <Link className="inline-link" href={`/register?next=${encodeURIComponent(query.next || "/learn")}`}>Create account</Link></p></section></main>; }

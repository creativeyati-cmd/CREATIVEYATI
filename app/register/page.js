import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import { studentRegister } from "@/app/student-actions";

export const metadata = { title: "Create student account" };
export default async function RegisterPage({ searchParams }) { const [site, query] = await Promise.all([getSiteContent(), searchParams]); return <main className="public-page"><PublicHeader site={site} /><section className="auth-page public-note"><p className="eyebrow">STUDENT ACCESS</p><h1 className="page-title">Create your account.</h1>{query.error && <p className="form-error">{query.error}</p>}<form className="auth-form" action={studentRegister}><input type="hidden" name="next" value={query.next || "/learn"} /><label>Full name<input name="fullName" autoComplete="name" required /></label><label>Email<input type="email" name="email" autoComplete="email" required /></label><label>Password<input type="password" name="password" minLength="8" autoComplete="new-password" required /></label><button className="button">Create account</button></form><p>Already registered? <Link className="inline-link" href="/login">Sign in</Link>.</p></section></main>; }

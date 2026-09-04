import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import { updateStudentPassword } from "@/app/student-actions";
export default async function UpdatePasswordPage({ searchParams }) { const [site, query] = await Promise.all([getSiteContent(), searchParams]); return <main className="public-page"><PublicHeader site={site} /><section className="auth-page public-note"><h1 className="page-title">Choose a new password.</h1>{query.error && <p className="form-error">{query.error}</p>}<form className="auth-form" action={updateStudentPassword}><label>New password<input type="password" name="password" minLength="8" required /></label><button className="button">Update password</button></form></section></main>; }

import ToastFeedback from "@/Components/AdminToast";
import Link from "next/link";
import { login } from "../actions";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
export default async function Login({searchParams}) {
 const query=await searchParams;
 return <AuthLayout admin title="Welcome to your workspace." description="Sign in to manage the studio and academy.">{query.error&&<ToastFeedback kind="error" message={query.error}/>}<form className="admin-form fm-auth-form" action={login}><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><SubmitButton pendingLabel="Signing in...">Continue</SubmitButton><Link href="/admin/login/reset">Forgot password?</Link></form></AuthLayout>;
}

import Link from "next/link";
import AuthLayout from "@/Components/AuthLayout";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = { title: "Password updated", robots: { index: false, follow: false } };

export default async function PasswordUpdatedPage({ searchParams }) {
  const next = safeNext((await searchParams).next);
  return <AuthLayout title="Your password is updated." description="You can now use your new password to sign in.">
    <p className="success-note" role="status">Your new password has been saved.</p>
    <Link className="button fm-auth-submit" href={next}>Continue to your account</Link>
  </AuthLayout>;
}

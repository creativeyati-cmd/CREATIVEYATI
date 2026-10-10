import { redirect } from "next/navigation";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
import { confirmPasswordRecovery } from "@/app/student-actions";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = { title: "Confirm password reset", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ConfirmPasswordRecoveryPage({ searchParams }) {
  const query = await searchParams;
  const token = typeof query.token_hash === "string" ? query.token_hash : "";
  if (!token || token.length > 2048) redirect("/reset-password?error=Open+a+valid+reset+email+to+continue.");
  return <AuthLayout title="Reset your password." description="Continue to verify your email link and choose a new password.">
    <form className="admin-form fm-auth-form" action={confirmPasswordRecovery}>
      <input type="hidden" name="token_hash" value={token}/>
      <input type="hidden" name="next" value={safeNext(query.next)}/>
      <SubmitButton pendingLabel="Verifying link...">Continue to reset password</SubmitButton>
    </form>
  </AuthLayout>;
}

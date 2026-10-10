import ToastFeedback from "@/Components/AdminToast";
import PasswordFields from "@/Components/PasswordFields";
import { redirect } from "next/navigation";
import AuthLayout from "@/Components/AuthLayout";
import SubmitButton from "@/Components/SubmitButton";
import { updateStudentPassword } from "@/app/student-actions";
import { Input, Select } from "@/Components/FormControls";
import { createSupabaseAuthClient, getStudentUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";
import { canResetPassword } from "@/lib/auth/recovery";
export default async function UpdatePasswordPage({searchParams}) {
 const query=await searchParams,next=safeNext(query.next);
 const user=await getStudentUser();
 if(!user||!await canResetPassword(user.id))redirect("/reset-password?message=Open+the+reset+link+from+your+email+first.");
 const supabase=await createSupabaseAuthClient();
 const {data:assurance,error:securityError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 const needsMfa=assurance?.nextLevel==="aal2"&&assurance.currentLevel!=="aal2";
 const {data:factors,error:factorError}=needsMfa?await supabase.auth.mfa.listFactors():{data:null,error:null};
 const authenticators=factors?.totp?.filter(factor=>factor.status==="verified")||[];
 return <AuthLayout title="Choose a new password." description="Use a unique password of at least 12 characters.">{query.error&&<ToastFeedback kind="error" message={query.error}/>}<form className="admin-form fm-auth-form" action={updateStudentPassword}><input type="hidden" name="next" value={next}/><PasswordFields label="New password"/>{(securityError||factorError)&&<ToastFeedback kind="error" message="Unable to load account security. Refresh and try again."/>}{needsMfa&&<><p>Your account uses two-factor authentication. Enter the code from your authenticator app to change your password.</p><label>Authenticator<Select name="factorId" required>{authenticators.map(factor=><option key={factor.id} value={factor.id}>{factor.friendly_name||"Authenticator app"}</option>)}</Select></label><label>Authenticator code<Input name="authenticatorCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label></>}<SubmitButton pendingLabel="Updating...">Update password</SubmitButton></form></AuthLayout>;
}

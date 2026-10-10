"use server";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient, getAdminIdentity } from "@/lib/supabase/server";
async function client() { if(!await getAdminIdentity())redirect("/admin/login");return createSupabaseAuthClient(); }
export async function enrollAuthenticator() {
 const supabase=await client();
 const {data:factors,error:listError}=await supabase.auth.mfa.listFactors();
 if(listError)return {error:"Unable to load authenticators. Try again."};
 if(factors.totp.some(f=>f.status==="verified"))return {error:"An authenticator is already registered. Enter its code below."};
 for(const factor of factors.all.filter(f=>f.factor_type==="totp"&&f.status==="unverified"))await supabase.auth.mfa.unenroll({factorId:factor.id});
 const {data,error}=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"AI VIDEO CREATOR"});
 return error?{error:"Authenticator setup could not start. Please try again."}:{factorId:data.id,qr:data.totp.qr_code,secret:data.totp.secret};
}
export async function verifyAuthenticator(previous,formData) {
 const supabase=await client(),factorId=String(formData.get("factorId")||""),code=String(formData.get("code")||"").trim();
 if(!/^[0-9]{6}$/.test(code))return {...previous,error:"Enter the six-digit code from your authenticator."};
 const {error}=await supabase.auth.mfa.challengeAndVerify({factorId,code});
 if(error)return {...previous,error:"The code is invalid or expired. Try the latest code."};
 redirect("/admin");
}
export async function signOutAllAdminSessions() {
 const supabase=await client();
 const {error}=await supabase.auth.signOut({scope:"global"});
 if(error)throw new Error("Sessions could not be signed out. Try again.");
 redirect("/admin/login");
}

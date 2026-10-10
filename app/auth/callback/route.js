import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirect";
import { grantPasswordRecovery } from "@/lib/auth/recovery";
import { ensureStudentProfile } from "@/lib/auth/student-profile";

export async function GET(request) {
  const url = new URL(request.url);
  // Some email relays leave HTML entities in query parameter names.
  // Normalize names only; never alter the token or trust an unverified session.
  for (const [key, value] of [...url.searchParams]) {
    const normalized = key.replace(/^(?:amp;)+/, "");
    if (["type", "token_hash", "next"].includes(normalized) && !url.searchParams.has(normalized)) {
      url.searchParams.set(normalized, value);
    }
  }
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") || "/learn";
  const next = safeNext(requested);
  const tokenHash = url.searchParams.get("token_hash");
  const recoveryRequested = url.searchParams.get("type") === "recovery";
  const recoveryToken = Boolean(tokenHash && recoveryRequested);
  const recoveryDestination = new URL(next, url.origin).pathname === "/reset-password/update";
  // Reading an email link must not consume its one-time recovery token.
  if (recoveryToken) {
    const destination = new URL("/reset-password/confirm", url.origin);
    destination.searchParams.set("token_hash", tokenHash);
    destination.searchParams.set("next", recoveryDestination ? new URL(next, url.origin).searchParams.get("next") || "/learn" : next);
    return NextResponse.redirect(destination, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  }
  if (code) {
    const supabase = await createSupabaseAuthClient();
    if (!supabase) return NextResponse.redirect(new URL("/login?error=Sign-in+is+unavailable", url.origin));
    const { data, error } = recoveryToken
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      : await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user && (recoveryToken || data.redirectType === "recovery")) {
        await grantPasswordRecovery(data.user.id);
        const destination = recoveryDestination ? next : "/reset-password/update?next=" + encodeURIComponent(next);
        return NextResponse.redirect(new URL(destination, url.origin));
      }
      if (recoveryDestination) return NextResponse.redirect(new URL("/reset-password?error=Open+a+valid+password+reset+email+to+continue.", url.origin));
      if (!next.startsWith("/admin")) await ensureStudentProfile(data.user);
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("Auth callback verification failed", { flow: recoveryToken ? "recovery" : "pkce", code: error?.code, status: error?.status });
  }
  const failure = recoveryRequested || recoveryDestination
    ? "/reset-password?error=This+reset+link+is+invalid+or+expired.+Please+request+a+new+one."
    : "/login?error=The+sign-in+link+is+invalid+or+expired";
  return NextResponse.redirect(new URL(failure, url.origin));
}

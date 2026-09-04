import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") || "/learn";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/learn";
  if (code) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=The+sign-in+link+is+invalid+or+expired", url.origin));
}

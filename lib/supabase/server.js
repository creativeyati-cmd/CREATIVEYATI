import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getDirectAdminSession } from "@/lib/admin-session";

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export async function createSupabaseAuthClient() {
  if (!hasSupabase()) return null;
  const cookieStore = await cookies();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
  });
}

export async function createSupabaseServerClient() {
  const directAdmin = await getDirectAdminSession();
  if (directAdmin) return createSupabaseServiceClient();
  return createSupabaseAuthClient();
}

export async function getStudentUser() {
  const supabase = await createSupabaseAuthClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

export async function getAdminUser() {
  const directAdmin = await getDirectAdminSession();
  if (directAdmin) return directAdmin;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle();
  return profile?.role ? user : null;
}

export function createSupabaseServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

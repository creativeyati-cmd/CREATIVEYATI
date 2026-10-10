import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export async function createSupabaseAuthClient() {
  if (!hasSupabase()) return null;
  const cookieStore = await cookies();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; proxy refreshes them. */ }
      },
    },
  });
}

export async function createSupabaseServerClient() {
  return createSupabaseAuthClient();
}

export async function getStudentUser() {
  const supabase = await createSupabaseAuthClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

export async function getAdminIdentity() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data: profile } = await service.from("admin_users").select("role").eq("id", user.id).maybeSingle();
  return profile?.role ? user : null;
}

export async function getAdminUser() {
  return getAdminIdentity();
}

export function createSupabaseServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

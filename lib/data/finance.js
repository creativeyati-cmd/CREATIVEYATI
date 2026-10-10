import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminFinanceSummary() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Financial summaries are unavailable.");
  const { data, error } = await supabase.rpc("admin_finance_summary");
  if (error || !Array.isArray(data?.orders) || !Array.isArray(data?.invoices)) {
    throw new Error("Financial summaries could not be loaded. Please try again.");
  }
  return data;
}

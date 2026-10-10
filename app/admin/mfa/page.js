import {redirect} from "next/navigation";
import {getAdminIdentity} from "@/lib/supabase/server";
export default async function MfaPage() {
  if (!await getAdminIdentity()) redirect("/admin/login");
  redirect("/admin");
}

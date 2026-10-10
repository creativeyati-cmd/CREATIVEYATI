import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceMediaSlots, validServiceMediaKey, SERVICE_MEDIA_BUCKET } from "@/lib/service-media";

export async function getServiceMedia({ strict = false } = {}) {
  const db = await createSupabaseServerClient();
  if (!db) { if (strict) throw new Error("Service media settings are unavailable."); return {}; }
  const { data, error } = await db.from("site_content").select("key,value").in("key", serviceMediaSlots.map(slot => `service-media:${slot.id}`));
  if (error) { if (strict) throw new Error("Service media could not be loaded."); return {}; }
  return Object.fromEntries((data || []).flatMap(row => {
    const slot = row.key.split(":")[1], value = row.value;
    if (!validServiceMediaKey(value?.storageKey, slot)) return [];
    const url = db.storage.from(SERVICE_MEDIA_BUCKET).getPublicUrl(value.storageKey).data.publicUrl;
    return [[slot, { ...value, url }]];
  }));
}

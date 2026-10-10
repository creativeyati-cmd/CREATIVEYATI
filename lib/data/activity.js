import "server-only";
import { createSupabaseServiceClient, getAdminUser } from "@/lib/supabase/server";

// The audit log. select("*") rather than named columns on purpose: the actor
// columns arrive with migration 202609070001, and naming a column that does not
// exist yet fails the entire query. Reading everything means this works before
// and after that migration, which matters because the UI ships first.
//
// Rows written before the migration have no actor. They read as unknown rather
// than as a blank name, so the page never implies somebody did something.

export function mapActivity(row) {
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    href: row.href || "",
    actorEmail: row.actor_email || "",
    actorRole: row.actor_role || "admin",
    entity: row.entity || "",
    entityId: row.entity_id || "",
    createdAt: row.created_at,
  };
}

export async function getActivity({ limit = 120 } = {}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { entries: [], error: "Activity logging is unavailable." };
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { entries: [], error: "The activity log could not be read." };
  return { entries: (data || []).map(mapActivity), error: "" };
}

// The write side was sparse: the table had rows from a single kind of action and
// nothing since August. Actions call this so the log earns its place.
export async function recordActivity({ title, description = "", href = "", entity = "", entityId = "" }) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;
  let actorEmail = "";
  let actorId = null;
  try {
    const admin = await getAdminUser();
    actorEmail = admin?.email || "";
    actorId = admin?.id || null;
  } catch {
    // an unauthenticated write still deserves a row; it just has no actor
  }
  const row = { title, description, href, actor_email: actorEmail, entity, entity_id: entityId };
  // only send actor_id when we have one, and never let a logging failure break
  // the action that triggered it
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(actorId || "")) row.actor_id = actorId;
  const { error } = await supabase.from("activity_logs").insert(row);
  if (error) console.error("Audit entry could not be saved", { code: error.code });
}

// Facets for the filter bar: only what is actually present, so the bar never
// offers a filter that returns nothing.
export function activityFacets(entries) {
  const actors = [...new Set(entries.map((entry) => entry.actorEmail).filter(Boolean))].sort();
  const titles = [...new Set(entries.map((entry) => entry.title).filter(Boolean))].sort();
  const entities = [...new Set(entries.map((entry) => entry.entity).filter(Boolean))].sort();
  return { actors, titles, entities };
}

export function filterActivity(entries, { actor = "", title = "", entity = "" } = {}) {
  return entries.filter((entry) =>
    (!actor || entry.actorEmail === actor) &&
    (!title || entry.title === title) &&
    (!entity || entry.entity === entity));
}

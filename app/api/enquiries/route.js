import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { enquirySchema } from "@/lib/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendEnquiryNotification } from "@/lib/email/delivery";

const attempts = new Map();
function allowed(ip) { const now = Date.now(); const hits = (attempts.get(ip) || []).filter((time) => now - time < 60_000); if (hits.length >= 5) return false; hits.push(now); attempts.set(ip, hits); return true; }

export async function POST(request) {
  const form = await request.formData(); const raw = Object.fromEntries(form); const requestHeaders = await headers(); const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!allowed(ip)) return NextResponse.json({ error: "Please wait a minute before trying again." }, { status: 429 });
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: "Enquiries are not configured yet. Please use the contact details supplied by the creator." }, { status: 503 });
  const { website, consent, ...enquiry } = parsed.data;
  const { data: saved, error } = await supabase.from("enquiries").insert({ name: enquiry.name, email: enquiry.email, phone: enquiry.phone || null, company: enquiry.company || null, project_type: enquiry.projectType || null, budget: enquiry.budget || null, timeline: enquiry.timeline || null, message: enquiry.message, source_page: new URL(request.url).pathname, referrer: requestHeaders.get("referer"), status: "new", notification_status: "pending" }).select("id").single();
  if (error) return NextResponse.json({ error: "Your enquiry could not be saved. Please try again." }, { status: 500 });
  try {
    await sendEnquiryNotification(enquiry);
    await supabase.from("enquiries").update({ notification_status: "sent" }).eq("id", saved.id);
  } catch {
    await supabase.from("enquiries").update({ notification_status: "failed" }).eq("id", saved.id);
  }
  return NextResponse.json({ message: "Thanks — your enquiry has been received." });
}

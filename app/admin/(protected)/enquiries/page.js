import { retryEnquiryNotification, updateEnquiry } from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Enquiries({ searchParams }) {
  const [supabase, query] = await Promise.all([createSupabaseServerClient(), searchParams]);
  const { data: enquiries = [], error } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(50);

  return <>
    <div className="admin-title"><p>ENQUIRIES</p><h1>Inbox</h1><p className="admin-lede">Every submission is saved before its email notification is attempted.</p></div>
    {query.saved && <p className="success-note">Enquiry updated.</p>}
    {query.notification === "sent" && <p className="success-note">Email notification sent.</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    {error ? <p className="form-error">Enquiries could not be loaded.</p> : enquiries.length ? <div className="enquiries">{enquiries.map((item) => <article className="enquiry-record" key={item.id}>
      <header><div><strong>{item.name}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div><span className={`notification-badge is-${item.notification_status}`}>Email: {item.notification_status}</span></header>
      <div className="enquiry-contact"><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone && <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}>{item.phone}</a>}{item.project_type && <span>{item.project_type}</span>}{item.company && <span>{item.company}</span>}</div>
      <p>{item.message}</p>
      <form className="enquiry-update" action={updateEnquiry}><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status}><option>new</option><option>read</option><option>replied</option><option>archived</option><option>spam</option></select><textarea name="notes" defaultValue={item.internal_notes || ""} placeholder="Internal notes" /><button>Save</button></form>
      {item.notification_status === "failed" && <form action={retryEnquiryNotification}><input type="hidden" name="id" value={item.id} /><button className="button-secondary" type="submit">Retry email notification</button></form>}
    </article>)}</div> : <p className="empty-state">No enquiries yet.</p>}
  </>;
}

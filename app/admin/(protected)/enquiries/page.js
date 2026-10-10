import { Input, Select, Textarea } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { retryEnquiryNotification, updateEnquiry } from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Tabs from "@/Components/Tabs";
import Badge from "@/Components/Badge";
import SubmitButton from "@/Components/SubmitButton";
import { EmptyState } from "@/Components/Feedback";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

// Two-pane inbox. Which message is open lives in the query string rather than in
// client state, so a refresh keeps your place, a link to one enquiry is
// shareable, and the whole screen stays a server component.
const TABS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

function notificationTone(status) {
  if (status === "sent") return "success";
  if (status === "failed") return "error";
  return "warning";
}

export default async function Enquiries({ searchParams }) {
  const [supabase, query] = await Promise.all([createSupabaseServerClient(), searchParams]);
  const status = String(query.status || "");
  const selectedId = String(query.id || "");
  const { data: enquiries = [], error } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(50);

  const filtered = status ? enquiries.filter((item) => item.status === status) : enquiries;
  const counts = {};
  TABS.forEach((tab) => { counts[tab.value] = tab.value ? enquiries.filter((item) => item.status === tab.value).length : enquiries.length; });
  const open = filtered.find((item) => String(item.id) === selectedId) || filtered[0] || null;

  function detailHref(id) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("id", String(id));
    return "/admin/enquiries?" + params.toString();
  }

  return <>
    <PageHeader title={<>Inbox</>} eyebrow={<>STUDIO</>} description={<>Review enquiries and follow up with clients.</>}/>
    {query.saved && <p className="success-note">Enquiry updated.</p>}
    {query.notification === "sent" && <p className="success-note">Email notification sent.</p>}
    {query.error && <p className="form-error">{query.error}</p>}
    {error ? <p className="form-error">Enquiries could not be loaded.</p> : !enquiries.length ? <EmptyState title="Your inbox is clear">Enquiries from the contact form land here, with the email notification status for each one, so you can see what a client asked and whether they were told.</EmptyState> : <>
      <Tabs basePath="/admin/enquiries" param="status" current={status} items={TABS.map((tab) => ({ value: tab.value, label: tab.label, count: counts[tab.value] }))} />
      <div className="fm-inbox">
        <ul className="fm-inbox-list">
          {filtered.map((item) => <li key={item.id}>
            <Link className={"fm-inbox-item" + (open && open.id === item.id ? " is-open" : "")} href={detailHref(item.id)}>
              <span className="fm-inbox-top"><strong>{item.name}</strong><small>{new Date(item.created_at).toLocaleDateString()}</small></span>
              <span className="fm-inbox-subject">{item.project_type || "Project enquiry"}{item.status === "new" ? <span className="fm-inbox-dot" aria-label="Unread" /> : null}</span>
              <span className="fm-inbox-snippet">{item.message}</span>
            </Link>
          </li>)}
          {!filtered.length && <li className="fm-inbox-none">Nothing in this tab.</li>}
        </ul>
        {open ? <article className="fm-inbox-detail">
          <header>
            <div><h2>{open.name}</h2><p>{open.email}{open.phone ? " / " + open.phone : ""}{open.company ? " / " + open.company : ""}</p></div>
            <Badge tone={notificationTone(open.notification_status)}>Email {open.notification_status}</Badge>
          </header>
          <p className="fm-inbox-message">{open.message}</p>
          <div className="fm-inbox-actions">
            <a className="button" href={"mailto:" + open.email}>Reply</a>
            {open.notification_status === "failed" && <form action={retryEnquiryNotification}><Input type="hidden" name="id" value={open.id} /><SubmitButton className="button button-secondary" pendingLabel="Retrying...">Retry email</SubmitButton></form>}
          </div>
          <form className="admin-form fm-inbox-form" action={updateEnquiry}>
            <Input type="hidden" name="id" value={open.id} />
            <label>Status<Select name="status" defaultValue={open.status}><option value="new">new</option><option value="read">read</option><option value="replied">replied</option><option value="archived">archived</option><option value="spam">spam</option></Select></label>
            <label>Internal notes<Textarea name="notes" defaultValue={open.internal_notes || ""} placeholder="What happened next?" /></label>
            <div className="fm-inbox-form-actions"><SubmitButton className="button" pendingLabel="Saving...">Save</SubmitButton><span className="fm-inbox-hint">Marking replied or archived here does not email the client.</span></div>
          </form>
        </article> : null}
      </div>
    </>}
  </>;
}

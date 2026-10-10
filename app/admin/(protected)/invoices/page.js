import Badge, { toneForStatus } from "@/Components/Badge";
import { Input, Select, Textarea, Button } from "@/Components/FormControls";
import DataTable from "@/Components/DataTable";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import InvoiceLineItems from "@/Components/InvoiceLineItems";
import SubmitButton from "@/Components/SubmitButton";
import { EmptyState } from "@/Components/Feedback";
import { markInvoicePaid, saveInvoice, updateInvoiceStatus } from "@/app/admin/actions";
import { formatMoney } from "@/lib/data/courses";
import { formatInvoiceDate, getAdminInvoices, isOverdue } from "@/lib/data/invoices";
import { getAdminFinanceSummary } from "@/lib/data/finance";

export const metadata = { title: "Quotations and invoices" };

const STATUSES = ["draft", "sent", "accepted", "declined", "void"];

export default async function AdminInvoicesPage({ searchParams }) {
  const [invoices, query, finance] = await Promise.all([getAdminInvoices(), searchParams, getAdminFinanceSummary()]);
  const totalCount = finance.invoices.reduce((total, row) => total + Number(row.document_count), 0);

  return <>
    <PageHeader title={<>Quotations and invoices</>} eyebrow={<>COMMERCE</>} description={<>Create client documents, track payments and issue receipts.</>}/>
    {query.saved && <p className="success-note">Document saved.</p>}
    {query.paid && <p className="success-note">Payment recorded and the receipt was issued.</p>}
    {query.error && <p className="form-error">{query.error}</p>}

    <section className="admin-section-heading"><p>POSITION · ALL DOCUMENTS</p>{finance.invoices.map(summary => <h2 key={summary.currency}>{formatMoney(summary.collected_minor, summary.currency)} collected · {formatMoney(summary.outstanding_minor, summary.currency)} outstanding · {summary.overdue_count} overdue</h2>)}<p>Outstanding includes sent and accepted invoices. Drafts, quotations, declined and void documents are excluded.</p></section>

    <details className="student-profile"><summary>New quotation or invoice</summary>
      <form className="admin-form" action={saveInvoice}>
        <label>Type<Select name="documentType" defaultValue="quote"><option value="quote">Quotation</option><option value="invoice">Invoice</option></Select></label>
        <label>Client name<Input name="clientName" required /></label>
        <label>Company<Input name="clientCompany" /></label>
        <label>Client email<Input name="clientEmail" type="email" required /></label>
        <label>Currency<Select name="currency" defaultValue="NGN"><option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></Select></label>
        <label>Discount<Input name="discount" defaultValue="0" /></label>
        <label>Due date<Input name="dueAt" type="date" /></label>
        <label>Valid until<Input name="validUntil" type="date" /></label>
        <InvoiceLineItems />
        <label className="form-wide">Notes and terms<Textarea name="notes" /></label>
        <SubmitButton className="button" pendingLabel="Creating...">Create document</SubmitButton>
      </form>
    </details>

    <section className="admin-section-heading"><p>DOCUMENTS</p><h2>{totalCount} on file</h2>{totalCount > invoices.length && <p>Showing the latest {invoices.length} documents. Financial totals include all documents.</p>}</section>
    {invoices.length ? <DataTable label="Invoices">
      <div><b>Number</b><b>Client</b><b>Total</b><b>Dates</b><b>Status</b><b>Actions</b></div>
      {invoices.map((invoice) => <div key={invoice.id}>
        <span>{invoice.number}<small>{invoice.documentType === "quote" ? "Quotation" : "Invoice"}</small></span>
        <span>{invoice.clientCompany || invoice.clientName}<small>{invoice.clientEmail}</small></span>
        <span>{formatMoney(invoice.totalMinor, invoice.currency)}{invoice.receipts.length ? <small>Receipt {invoice.receipts[0].receiptNumber}</small> : null}</span>
        <span>{formatInvoiceDate(invoice.issuedAt)}{invoice.dueAt ? <small>Due {formatInvoiceDate(invoice.dueAt)}</small> : null}</span>
        <span>{invoice.status}{isOverdue(invoice) ? " · overdue" : ""}{invoice.acceptedName ? <small>Accepted by {invoice.acceptedName}</small> : null}</span>
        <span>
          <Link className="inline-link" href={`/q/${invoice.accessToken}`} target="_blank" rel="noreferrer">Client link</Link>
          <a className="inline-link" href={`/api/invoices/${invoice.accessToken}`}>{invoice.status === "paid" ? "Receipt PDF" : "Document PDF"}</a>
          {invoice.status !== "paid" && <details><summary className="inline-link">Status</summary>
            <form className="admin-form" action={updateInvoiceStatus}>
              <Input type="hidden" name="id" value={invoice.id} />
              <label>Status<Select name="status" defaultValue={invoice.status}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</Select></label>
              <label>Accepted by<Input name="acceptedName" defaultValue={invoice.acceptedName} /></label>
              <Button className="button button-secondary" type="submit">Save status</Button>
            </form>
          </details>}
          {!["paid", "void", "declined"].includes(invoice.status) && <details><summary className="inline-link">Record payment</summary>
            <form className="admin-form" action={markInvoicePaid}>
              <Input type="hidden" name="id" value={invoice.id} />
              <label>Channel<Select name="channel" defaultValue="Bank transfer"><option value="Bank transfer">Bank transfer</option><option value="Cash">Cash</option><option value="Card terminal">Card terminal</option><option value="Other">Other</option></Select></label>
              <label>Reference<Input name="reference" placeholder="Transfer narration or teller reference" /></label>
              <Button className="button button-secondary" type="submit">Record {formatMoney(invoice.totalMinor, invoice.currency)} received</Button>
            </form>
          </details>}
        </span>
      </div>)}
    </DataTable> : <EmptyState title="No documents yet">Create a quotation to send a client a priced scope of work, then share its private link.</EmptyState>}
  </>;
}


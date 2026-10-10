import { documentDate, documentMoney, documentTitle } from "@/lib/documents/brand";
import { getDocumentSettings } from "@/lib/data/settings";
export default async function InvoiceDocument({ invoice, branding }) {
  const brand=branding || await getDocumentSettings(),title=documentTitle(invoice),money=v=>documentMoney(v,invoice.currency);
  return <article className="print-document invoice-document">
    <header className="invoice-heading"><h2>{title}</h2><div>{documentDate(invoice.status==="paid"?invoice.paidAt||invoice.issuedAt:invoice.issuedAt)}<strong>{title} No. {invoice.receipts?.[0]?.receiptNumber||invoice.number}</strong></div></header>
    <section className="invoice-billed"><strong>{invoice.status==="paid"?"Received from:":"Billed to:"}</strong><p>{invoice.clientCompany&&<>{invoice.clientCompany}<br/></>}{invoice.clientName}<br/>{invoice.clientEmail}</p></section>
    <div className="invoice-lines-wrap"><table className="invoice-lines"><thead><tr><th>Description</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{invoice.items.map(item=><tr key={item.id}><td>{item.description}</td><td>{money(item.unitPriceMinor)}</td><td>{item.quantity}</td><td>{money(Math.round(item.quantity*item.unitPriceMinor))}</td></tr>)}</tbody></table></div>
    <dl className="invoice-totals"><div><dt>Subtotal</dt><dd>{money(invoice.subtotalMinor)}</dd></div>{invoice.discountMinor>0&&<div><dt>Discount</dt><dd>-{money(invoice.discountMinor)}</dd></div>}<div className="invoice-total"><dt>{invoice.status==="paid"?"Amount paid":"Total"}</dt><dd>{money(invoice.totalMinor)}</dd></div></dl>
    <p className="invoice-status">Status: {invoice.status}{invoice.dueAt?" / Due "+documentDate(invoice.dueAt):""}</p>
    {invoice.notes&&<p className="invoice-notes">{invoice.notes}</p>}
    <footer className="invoice-footer"><div><strong>Payment information</strong><p>{invoice.status==="paid"?"Payment received. Thank you.":brand.paymentInstructions||"Use the secure payment link supplied with this invoice."}</p></div><div><strong>{brand.businessName}</strong><p>{[brand.address,brand.phone,brand.email].filter(Boolean).join("\n")}</p></div></footer>
  </article>;
}

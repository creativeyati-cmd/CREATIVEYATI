"use client";
import { Input } from "@/Components/FormControls";

import { useState } from "react";

// Repeatable line items. The preview total here is only a preview: saveInvoice
// recomputes every figure from these fields on the server and never trusts a
// total that came from the browser.
export default function InvoiceLineItems({ defaultItems = [] }) {
  const [rows, setRows] = useState(defaultItems.length ? defaultItems : [{ description: "", quantity: "1", unitPrice: "" }]);

  function update(index, key, value) {
    setRows((current) => current.map((row, position) => (position === index ? { ...row, [key]: value } : row)));
  }
  function add() {
    setRows((current) => [...current, { description: "", quantity: "1", unitPrice: "" }]);
  }
  function remove(index) {
    setRows((current) => current.filter((_, position) => position !== index));
  }

  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(String(row.unitPrice).replace(/[^0-9.]/g, "")) || 0), 0);

  return <section className="invoice-items form-wide">
    <p className="invoice-items-head">Line items</p>
    {rows.map((row, index) => <div className="invoice-item-row" key={index}>
      <label>Description<Input name="itemDescription" value={row.description} onChange={(event) => update(index, "description", event.target.value)} placeholder="Beauty commercial — 30s hero film" required /></label>
      <label>Qty<Input name="itemQuantity" value={row.quantity} onChange={(event) => update(index, "quantity", event.target.value)} inputMode="decimal" /></label>
      <label>Unit price<Input name="itemUnitPrice" value={row.unitPrice} onChange={(event) => update(index, "unitPrice", event.target.value)} inputMode="decimal" placeholder="1800000" /></label>
      <button className="inline-link" type="button" onClick={() => remove(index)} disabled={rows.length === 1}>Remove</button>
    </div>)}
    <div className="invoice-items-foot">
      <button className="button button-secondary" type="button" onClick={add}>Add line</button>
      <p>Preview before discount: <strong>{total.toLocaleString()}</strong></p>
    </div>
  </section>;
}

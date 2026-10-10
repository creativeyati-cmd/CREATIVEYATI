import "server-only";
import { randomBytes } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// money is stored in minor units everywhere, matching orders and payments
export function toMinor(value) {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

export function fromMinor(amountMinor) {
  return (Number(amountMinor) || 0) / 100;
}

export function invoiceTotals(items, discountMinor = 0) {
  const subtotal = items.reduce((sum, item) => sum + Math.round(Number(item.unitPriceMinor) * Number(item.quantity)), 0);
  const discount = Math.min(Math.max(0, Number(discountMinor) || 0), subtotal);
  return { subtotalMinor: subtotal, discountMinor: discount, totalMinor: subtotal - discount };
}

export function invoiceBalance(invoice) {
  return invoice.status === "paid" ? 0 : Number(invoice.totalMinor) || 0;
}

// past its due date, still unpaid, and not voided
export function isOverdue(invoice) {
  if (!invoice.dueAt || invoice.documentType !== "invoice" || !["sent", "accepted"].includes(invoice.status)) return false;
  return new Date(invoice.dueAt).getTime() < Date.now();
}

export function formatInvoiceDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-NG", { dateStyle: "medium" });
}

function mapItem(row) {
  return { id: row.id, description: row.description, quantity: Number(row.quantity) || 1, unitPriceMinor: Number(row.unit_price_minor) || 0, displayOrder: row.display_order || 0 };
}

function mapInvoice(row, items = [], receipts = []) {
  return {
    id: row.id, number: row.number, documentType: row.document_type || "quote",
    clientName: row.client_name, clientCompany: row.client_company || "", clientEmail: row.client_email,
    currency: row.currency || "NGN", subtotalMinor: Number(row.subtotal_minor) || 0,
    discountMinor: Number(row.discount_minor) || 0, totalMinor: Number(row.total_minor) || 0,
    status: row.status || "draft", issuedAt: row.issued_at, dueAt: row.due_at || "", validUntil: row.valid_until || "",
    acceptedAt: row.accepted_at || "", acceptedName: row.accepted_name || "", paidAt: row.paid_at || "",
    paymentChannel: row.payment_channel || "", paymentReference: row.payment_reference || "",
    checkoutId: row.checkout_id || "", checkoutReference: row.checkout_reference || "",
    accessToken: row.access_token, notes: row.notes || "", videoId: row.video_id || "",
    createdAt: row.created_at, updatedAt: row.updated_at,
    items: (items || []).map(mapItem), receipts: (receipts || []).map(mapReceipt),
  };
}

function mapReceipt(row) {
  return { id: row.id, invoiceId: row.invoice_id, receiptNumber: row.receipt_number, amountMinor: Number(row.amount_minor) || 0, currency: row.currency, issuedTo: row.issued_to, channel: row.channel || "", reference: row.reference || "", issuedAt: row.issued_at };
}

const withChildren = "*, invoice_items(*), receipts(*)";

export async function getAdminInvoices() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Invoices are unavailable.");
  const { data = [], error } = await supabase.from("invoices").select(withChildren).order("issued_at", { ascending: false }).limit(300);
  if (error) throw new Error("Invoices could not be loaded. Please try again.");
  return data.map((row) => mapInvoice(row, row.invoice_items, row.receipts));
}

export async function getAdminInvoice(id) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("invoices").select(withChildren).eq("id", id).maybeSingle();
  return data ? mapInvoice(data, data.invoice_items, data.receipts) : null;
}

// the token is the authorisation for a client, so this is the only public reader
export async function getInvoiceByToken(token) {
  const value = String(token || "").trim();
  const supabase = createSupabaseServiceClient();
  if (!supabase || !value) return null;
  const { data } = await supabase.from("invoices").select(withChildren).eq("access_token", value).maybeSingle();
  return data ? mapInvoice(data, data.invoice_items, data.receipts) : null;
}

export function newAccessToken() {
  return randomBytes(12).toString("hex");
}

// numbers come from a sequence so they stay unique and gap-free per series
export async function nextInvoiceNumber(supabase, documentType) {
  const { data } = await supabase.rpc("next_invoice_number", { document_type: documentType === "invoice" ? "invoice" : "quote" });
  if (typeof data === "string" && data) return data;
  const prefix = documentType === "invoice" ? "INV" : "QT";
  return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
}

export async function nextReceiptNumber(supabase) {
  const { data } = await supabase.rpc("next_receipt_number");
  if (typeof data === "string" && data) return data;
  return `RCT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
}

export function parseLineItems(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [description = "", quantity = "1", unitPrice = "0"] = line.split("|").map((part) => part.trim());
      return { description, quantity: Math.max(0.01, Number(quantity) || 1), unitPriceMinor: toMinor(unitPrice), displayOrder: index };
    })
    .filter((item) => item.description);
}

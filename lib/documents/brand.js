export const documentDefaults = { businessName: "AI VIDEO CREATOR", academyName: "AI VIDEO CREATOR", email: "", phone: "", address: "", paymentInstructions: "", signerName: "Idayat Ibrahim", signerTitle: "Course instructor" };
export function documentDate(value) { return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : ""; }
export function documentMoney(value, currency = "NGN") { return new Intl.NumberFormat("en-NG", { style: "currency", currency, currencyDisplay: currency === "NGN" ? "symbol" : "code" }).format((Number(value) || 0) / 100); }
export function documentTitle(invoice) { return invoice.status === "paid" ? "Receipt" : invoice.documentType === "quote" && !invoice.acceptedAt ? "Quotation" : "Invoice"; }

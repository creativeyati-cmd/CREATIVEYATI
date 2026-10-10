// Kept out of lib/data/courses so client components can format amounts without
// pulling that module's "server-only" import into the browser bundle.
export function formatMoney(amountMinor, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format((Number(amountMinor) || 0) / 100);
}

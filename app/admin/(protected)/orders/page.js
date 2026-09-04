import ConfirmActionForm from "@/Components/ConfirmActionForm";
import { refundOrder, resendCourseConfirmation } from "@/app/admin/actions";
import { formatMoney } from "@/lib/data/courses";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export default async function OrdersPage({ searchParams }) {
  const query = await searchParams;
  const service = createSupabaseServiceClient();
  let request = service.from("orders").select("*,courses(title)").order("created_at", { ascending: false }).limit(1000);
  if (["pending", "successful", "failed", "abandoned", "refunded"].includes(query.status)) request = request.eq("payment_status", query.status);
  const [{ data: rawOrders = [] }, usersResult] = await Promise.all([request, service.auth.admin.listUsers({ page: 1, perPage: 1000 })]);
  const users = new Map((usersResult.data?.users || []).map((user) => [user.id, user]));
  const term = String(query.search || "").trim().toLowerCase();
  const orders = term ? rawOrders.filter((order) => order.reference.toLowerCase().includes(term) || order.student_id.toLowerCase().includes(term) || users.get(order.student_id)?.email?.toLowerCase().includes(term)) : rawOrders;

  return <>
    <div className="admin-title"><p>COMMERCE</p><h1>Orders</h1><a href="/api/admin/orders/export">Export CSV</a></div>
    <form className="admin-filters"><input name="search" defaultValue={query.search} placeholder="Student, email, or reference" /><select name="status" defaultValue={query.status || ""}><option value="">All statuses</option><option>pending</option><option>successful</option><option>failed</option><option>abandoned</option><option>refunded</option></select><button>Filter</button></form>
    <div className="order-list">{orders.map((order) => {
      const email = users.get(order.student_id)?.email || order.student_id;
      return <details key={order.id} className="order-record"><summary><span>{order.reference}<small>{email}</small></span><span>{order.courses?.title}</span><span>{formatMoney(order.amount_minor, order.currency)}<small>{order.refund_status ? `refund ${order.refund_status}` : order.payment_status}</small></span></summary><div className="order-detail-grid"><span><b>Created</b>{new Date(order.created_at).toLocaleString()}</span><span><b>Paid</b>{order.paid_at ? new Date(order.paid_at).toLocaleString() : "Not paid"}</span><span><b>Gateway</b>{order.gateway}</span><span><b>Gateway reference</b>{order.gateway_reference || "—"}</span><span><b>Channel</b>{order.payment_channel || "—"}</span><span><b>Discount</b>{formatMoney(order.discount_minor, order.currency)}</span></div><div className="row-actions">{order.payment_status === "successful" && <ConfirmActionForm action={resendCourseConfirmation} fields={{ orderId: order.id }} label="Resend confirmation" />}{order.payment_status === "successful" && !order.refund_status && order.gateway === "bachs" && order.gateway_reference?.startsWith("ch_") && <ConfirmActionForm className="danger-action" action={refundOrder} fields={{ orderId: order.id }} label="Refund in Bachs" confirmText={`Initiate a full ${formatMoney(order.amount_minor, order.currency)} refund? Course access will be revoked only after Bachs confirms it is paid.`} />}{order.payment_status === "successful" && order.gateway === "bachs" && !order.gateway_reference?.startsWith("ch_") && <small>Refund becomes available after the signed collection webhook is received.</small>}{order.refund_status && <small>Refund: {order.refund_status}</small>}</div></details>;
    })}{orders.length === 0 && <p>No matching orders.</p>}</div>
  </>;
}

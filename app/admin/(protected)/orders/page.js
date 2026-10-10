import DataTable from "@/Components/DataTable";
import Drawer from "@/Components/Drawer";
import Badge, { toneForStatus } from "@/Components/Badge";
import { Input, Select, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import ConfirmActionForm from "@/Components/ConfirmActionForm";
import { refundOrder, resendCourseConfirmation, verifyOrderPayment, reconcileStalePayments } from "@/app/admin/actions";
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
    <PageHeader title={<>Orders</>} eyebrow={<>COMMERCE</>} description={<>Review course purchases and payment status.</>} actions={<><ConfirmActionForm action={reconcileStalePayments} fields={{}} label="Reconcile pending payments" /><a className="button button-secondary" href="/api/admin/orders/export">Export CSV</a></>}/>
    {query.checked && <p className={query.checked === "successful" ? "success-note" : ""}>{query.checked === "successful" ? `Payment confirmed for ${query.reference}. Bachs reports success, so this order is now settled.` : query.checked === "batch" ? query.notice : query.notice || `Bachs has not confirmed ${query.reference} yet. The order stays pending and can be checked again.`}</p>}
    <form className="admin-filters"><Input aria-label="Search orders" type="search" name="search" defaultValue={query.search} placeholder="Student, email, or reference" /><Select aria-label="Payment status" name="status" defaultValue={query.status || ""}><option value="">All statuses</option><option>pending</option><option>successful</option><option>failed</option><option>abandoned</option><option>refunded</option></Select><Button>Filter</Button></form>
    <DataTable label="Course orders" searchable={false} emptyTitle="No matching orders" emptyDescription="Try changing the search or payment status."><div><b>Reference / Student</b><b>Course</b><b>Amount / Status</b><b>Actions</b></div>{orders.map((order) => {
      const email = users.get(order.student_id)?.email || order.student_id;
      return <div key={order.id}><span>{order.reference}<small>{email}</small></span><span>{order.courses?.title}</span><span>{formatMoney(order.amount_minor, order.currency)}<small><Badge tone={toneForStatus(order.refund_status || order.payment_status)}>{order.refund_status ? `refund ${order.refund_status}` : order.payment_status}</Badge></small></span><span><Drawer label={order.reference} trigger="View order"><div className="order-detail-grid"><span><b>Created</b>{new Date(order.created_at).toLocaleString()}</span><span><b>Paid</b>{order.paid_at ? new Date(order.paid_at).toLocaleString() : "Not paid"}</span><span><b>Gateway</b>{order.gateway}</span><span><b>Gateway reference</b>{order.gateway_reference || "—"}</span><span><b>Channel</b>{order.payment_channel || "—"}</span><span><b>Discount</b>{formatMoney(order.discount_minor, order.currency)}</span></div><div className="row-actions">{order.payment_status === "pending" && order.gateway === "bachs" && <ConfirmActionForm action={verifyOrderPayment} fields={{ orderId: order.id }} label="Check payment status" />}{order.payment_status === "successful" && <ConfirmActionForm action={resendCourseConfirmation} fields={{ orderId: order.id }} label="Resend confirmation" />}{order.payment_status === "successful" && !order.refund_status && order.gateway === "bachs" && order.gateway_reference?.startsWith("ch_") && <ConfirmActionForm className="danger-action" action={refundOrder} fields={{ orderId: order.id }} label="Refund in Bachs" confirmText={`Initiate a full ${formatMoney(order.amount_minor, order.currency)} refund? Course access will be revoked only after Bachs confirms it is paid.`} />}{order.payment_status === "successful" && order.gateway === "bachs" && !order.gateway_reference?.startsWith("ch_") && <small>Refund becomes available after the signed collection webhook is received.</small>}{order.refund_status && <small>Refund: {order.refund_status}</small>}</div></Drawer></span></div>;
    })}</DataTable>
  </>;
}

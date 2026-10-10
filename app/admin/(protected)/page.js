import AdminWorkspace from "@/Components/AdminWorkspace";
import { getAdminWorkspace } from "@/lib/data/dashboard";
import { getBachsConfiguration } from "@/lib/payments/provider";

export default async function AdminHome() {
  const [data, payments] = await Promise.all([getAdminWorkspace(), getBachsConfiguration()]);
  return <AdminWorkspace data={data} paymentsReady={payments.ready}/>;
}

import { requireAdmin } from "@/lib/admin/requireAdmin";
import { fetchAdminPlaybooks } from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import AdminPlaybooksClient from "./AdminPlaybooksClient";

export const dynamic = "force-dynamic";

export default async function AdminSalesPlaybooksPage() {
  await requireAdmin();
  const playbooks = await fetchAdminPlaybooks();
  return <AdminPlaybooksClient initialPlaybooks={playbooks} />;
}

import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminTeamDashboardClient from "./AdminTeamDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminTeamDashboardPage() {
  await requireAdmin();
  return <AdminTeamDashboardClient />;
}

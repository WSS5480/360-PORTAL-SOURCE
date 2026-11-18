import { requireAdmin } from "@/lib/admin/requireAdmin";
import { fetchAdminLeaderboardConfigPayload } from "@/lib/surgical-sales/leaderboardConfigDb";
import AdminLeaderboardConfigClient from "./AdminLeaderboardConfigClient";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardConfigPage() {
  await requireAdmin();
  const payload = await fetchAdminLeaderboardConfigPayload();
  return <AdminLeaderboardConfigClient initialPayload={payload} />;
}

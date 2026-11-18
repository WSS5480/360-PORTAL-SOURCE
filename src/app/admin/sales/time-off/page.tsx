import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminTimeOffClient from "./AdminTimeOffClient";

export const dynamic = "force-dynamic";

export default async function AdminTimeOffPage() {
  await requireAdmin();
  return <AdminTimeOffClient />;
}

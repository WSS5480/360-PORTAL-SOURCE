import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminPlaybookNewClient from "./AdminPlaybookNewClient";

export const dynamic = "force-dynamic";

export default async function AdminPlaybookNewPage() {
  await requireAdmin();
  return <AdminPlaybookNewClient />;
}

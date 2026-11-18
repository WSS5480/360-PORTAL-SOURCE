import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminSalesCommandDocumentsClient from "./AdminSalesCommandDocumentsClient";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  await requireAdmin();

  return (
    <main style={{ padding: "20px 22px 28px", maxWidth: 1480, margin: "0 auto", minWidth: 0, boxSizing: "border-box" }}>
      <AdminSalesCommandDocumentsClient />
    </main>
  );
}

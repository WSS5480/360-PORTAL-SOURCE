// src/app/admin/layout.tsx
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx: any = await requireAdminOrStaff();
  const isAdmin = ctx?.kind === "ADMIN";

  return (
    <div style={{ minHeight: "100vh", background: "rgba(0,0,0,0.02)" }}>
      <AdminNav isAdmin={isAdmin} />

      <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: 16 }}>{children}</div>
    </div>
  );
}

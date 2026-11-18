// src/app/admin/customers/page.tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireAdmin();

  return (
    <main style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Customer Users</h1>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            Command center for customer portal users created from IVR intake. View creation date, IVR history,
            and send portal invites.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/admin" style={{ fontSize: 13 }}>
            ← Back to Dashboard
          </Link>
          <Link href="/admin/invite" style={{ fontSize: 13, fontWeight: 900 }}>
            Invite Customer →
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <CustomersClient />
      </div>
    </main>
  );
}

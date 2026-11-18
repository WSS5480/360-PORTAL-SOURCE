import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { fetchAdminSetupSnapshot } from "@/lib/admin/fetchAdminSetupSnapshot";
import AdminSetupClient from "./AdminSetupClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portal setup",
};

export default async function AdminSetupPage() {
  await requireAdmin();

  let snapshot;
  try {
    snapshot = await fetchAdminSetupSnapshot();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load setup snapshot";
    console.error("[AdminSetupPage]", e);
    return (
      <main style={{ padding: 24, maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, margin: "0 0 8px", color: "#0f172a" }}>Portal setup unavailable</h1>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.55 }}>
          We couldn&apos;t load your setup data. This is usually a database connectivity issue or a missing migration.
        </p>
        {message ? (
          <p style={{ marginTop: 16, color: "#b91c1c", fontSize: 13, lineHeight: 1.55 }}>{message}</p>
        ) : null}
        <p style={{ marginTop: 16, color: "#64748b", fontSize: 13, lineHeight: 1.55 }}>
          If you recently pulled changes, apply the latest database migrations, then refresh this page.
        </p>
      </main>
    );
  }

  return (
    <Suspense fallback={<main style={{ padding: 18 }}>Loading portal setup…</main>}>
      <AdminSetupClient initialSnapshot={snapshot} />
    </Suspense>
  );
}

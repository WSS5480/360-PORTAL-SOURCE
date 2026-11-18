import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminProviderCommandClient from "./AdminProviderCommandClient";

export const dynamic = "force-dynamic";

function ProviderCommandFallback() {
  return <div style={{ padding: 24, color: "var(--muted)" }}>Loading provider…</div>;
}

export default async function AdminProviderCommandPage(props: { params: Promise<{ providerId: string }> }) {
  await requireAdmin();
  const { providerId } = await props.params;
  const apiBase = `/api/admin/sales/providers/${encodeURIComponent(providerId)}/command`;

  return (
    <Suspense fallback={<ProviderCommandFallback />}>
      <AdminProviderCommandClient providerId={providerId} apiBase={apiBase} />
    </Suspense>
  );
}

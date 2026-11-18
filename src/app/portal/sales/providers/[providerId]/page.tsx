import { Suspense } from "react";
import type { Metadata } from "next";
import PortalSalesProviderProfileClient from "./PortalSalesProviderProfileClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Provider" };

export default async function PortalSalesProviderProfilePage(props: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await props.params;
  return (
    <Suspense fallback={<ProviderProfileFallback />}>
      <PortalSalesProviderProfileClient providerId={providerId} />
    </Suspense>
  );
}

function ProviderProfileFallback() {
  return (
    <div role="status" style={{ color: "var(--muted)", padding: "68px 16px 16px", fontSize: 13 }}>
      Loading provider…
    </div>
  );
}

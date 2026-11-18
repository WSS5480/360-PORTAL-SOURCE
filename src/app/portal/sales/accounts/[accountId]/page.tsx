import { Suspense } from "react";
import type { Metadata } from "next";
import SurgicalCrmAccountDetailPortalClient from "./SurgicalCrmAccountDetailPortalClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Organization",
};

export default async function PortalSurgicalCrmAccountDetailPage(props: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await props.params;
  return (
    <Suspense fallback={<div style={{ color: "var(--muted)" }}>Loading organization…</div>}>
      <SurgicalCrmAccountDetailPortalClient accountId={accountId} />
    </Suspense>
  );
}

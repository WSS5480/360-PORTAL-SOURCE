import { Suspense } from "react";
import NewEngagementPortalClient from "./NewEngagementPortalClient";

export const dynamic = "force-dynamic";

export default function PortalNewEngagementPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--muted)" }}>Loading…</div>}>
      <NewEngagementPortalClient />
    </Suspense>
  );
}

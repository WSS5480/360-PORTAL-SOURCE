import { Suspense } from "react";
import EngagementsPortalClient from "./EngagementsPortalClient";

export const dynamic = "force-dynamic";

export default function PortalSalesEngagementsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--muted)" }}>Loading engagements…</div>}>
      <EngagementsPortalClient />
    </Suspense>
  );
}

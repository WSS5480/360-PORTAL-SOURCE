import { Suspense } from "react";
import SurgicalCasesCrmClient from "./SurgicalCasesCrmClient";

export const dynamic = "force-dynamic";

export default function PortalSurgicalCasesPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 24, color: "var(--muted)" }}>Loading cases…</div>}
    >
      <SurgicalCasesCrmClient />
    </Suspense>
  );
}

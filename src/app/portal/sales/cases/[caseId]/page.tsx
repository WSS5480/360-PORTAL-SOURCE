import { Suspense } from "react";
import { requireInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import SurgicalCaseDetailPortalClient from "./SurgicalCaseDetailPortalClient";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PortalSurgicalCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  await requireInternalSalesRep();
  const { caseId } = await params;
  if (!UUID_RE.test(caseId)) {
    return (
      <div style={{ padding: 24 }}>
        <p>Invalid case.</p>
      </div>
    );
  }
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--muted)" }}>Loading case…</div>}>
      <SurgicalCaseDetailPortalClient caseId={caseId} />
    </Suspense>
  );
}

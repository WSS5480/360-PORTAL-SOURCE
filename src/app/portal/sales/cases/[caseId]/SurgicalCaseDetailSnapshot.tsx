"use client";

import Link from "next/link";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import { buildSurgicalCaseDetailSnapshotRows } from "@/lib/surgical-sales/buildSurgicalCaseDetailSnapshot";
import type { SurgicalCaseDetailVariant } from "@/lib/surgical-sales/surgicalCaseDetailRouting";

export function SurgicalCaseDetailSnapshot({
  variant,
  identity,
  facilityId,
  procedureType,
  productsLabel,
  ownerName,
  requiresBillingDocuments,
  bill,
}: {
  variant: SurgicalCaseDetailVariant;
  identity: CaseIdentity;
  facilityId?: string | null;
  procedureType?: string | null;
  productsLabel?: string | null;
  ownerName?: string | null;
  requiresBillingDocuments?: boolean;
  bill?: { po_uploaded: boolean; invoice_uploaded: boolean } | null;
}) {
  const rows = buildSurgicalCaseDetailSnapshotRows({
    variant,
    providerName: identity.providerName,
    facilityName: identity.facilityName,
    procedureType,
    caseTypeLabel: identity.caseTypeLabel,
    statusLabel: identity.statusLabel,
    dateTimeLabel: identity.dateLineWithTime || identity.dateLine,
    ownerName,
    productsLabel,
    requiresBillingDocuments,
    bill,
  });

  return (
    <aside
      className="case-obs-detail-snapshot"
      aria-label="Case snapshot"
      data-surgical-case-detail-panel="snapshot"
      data-surgical-case-type={variant}
    >
      <h2 className="case-obs-detail-snapshot-title">Case Snapshot</h2>
      {rows.map((row) => (
        <div key={row.id} className="case-obs-detail-snapshot-row">
          <span className="case-obs-detail-snapshot-label">{row.label}</span>
          <span className="case-obs-detail-snapshot-value">
            {row.id === "facility" && facilityId ? (
              <Link href={`/portal/sales/accounts/${encodeURIComponent(facilityId)}`}>{row.value}</Link>
            ) : (
              row.value
            )}
          </span>
        </div>
      ))}
    </aside>
  );
}

/** @deprecated Use SurgicalCaseDetailSnapshot */
export const CaseObservationDetailSnapshot = SurgicalCaseDetailSnapshot;

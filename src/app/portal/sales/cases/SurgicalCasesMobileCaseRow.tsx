"use client";

import { CaseIdentityDisplay } from "@/components/sales/CaseIdentityDisplay";
import { OperationsQueueClickableMobileRow } from "@/components/sales/operations/OperationsQueueClickableRow";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { buildCaseIdentityFromListItem } from "@/lib/surgical-sales/buildCaseIdentity";
import { caseDictationStatusLabel, caseListRowNeedsAttention } from "./surgicalCasesListMobileHelpers";

export function SurgicalCasesMobileCaseRow({
  c,
}: {
  c: EnrichedSurgicalCaseListItem;
}) {
  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;
  const identity = buildCaseIdentityFromListItem(c);
  const needsAttention = caseListRowNeedsAttention(c);
  const dictationLabel = caseDictationStatusLabel(c);

  const rowClass = [
    "cases-list-mobile-row",
    needsAttention ? "cases-list-mobile-row--attention" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <OperationsQueueClickableMobileRow
      href={detailHref}
      ariaLabel={`Open ${identity.caseTypeLabel} for ${identity.providerName}`}
      className={rowClass}
      actions={<span className="ops-queue-open-hint" aria-hidden="true">Open</span>}
    >
      <CaseIdentityDisplay identity={identity} variant="list" showOptionalSignals={false} />
      <span className="cases-list-dictation" data-captured={dictationLabel.includes("captured") ? "true" : "false"}>
        {dictationLabel}
      </span>
    </OperationsQueueClickableMobileRow>
  );
}

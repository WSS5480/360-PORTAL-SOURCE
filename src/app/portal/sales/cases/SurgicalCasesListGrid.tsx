"use client";



import { CaseIdentityDisplay } from "@/components/sales/CaseIdentityDisplay";
import { OperationsQueueClickableRow } from "@/components/sales/operations/OperationsQueueClickableRow";

import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";

import { buildCaseIdentityFromListItem } from "@/lib/surgical-sales/buildCaseIdentity";

import { caseDictationStatusLabel, caseListRowNeedsAttention } from "./surgicalCasesListMobileHelpers";



function CaseListRow({ c }: { c: EnrichedSurgicalCaseListItem }) {

  const detailHref = `/portal/sales/cases/${encodeURIComponent(c.id)}`;

  const identity = buildCaseIdentityFromListItem(c);

  const needsAttention = caseListRowNeedsAttention(c);

  const dictationLabel = caseDictationStatusLabel(c);



  return (

    <OperationsQueueClickableRow

      href={detailHref}

      ariaLabel={`Open ${identity.caseTypeLabel} for ${identity.providerName}`}

      className={`cases-list-row${needsAttention ? " cases-list-row--attention" : ""}`}

      actions={<span className="ops-queue-open-hint" aria-hidden="true">Open</span>}

    >

      <div className="cases-list-col cases-list-col--identity" role="cell">

        <CaseIdentityDisplay identity={identity} variant="list" showOptionalSignals={false} />

        <span className="cases-list-dictation" data-captured={dictationLabel.includes("captured") ? "true" : "false"}>
          {dictationLabel}
        </span>

      </div>

    </OperationsQueueClickableRow>

  );

}



export function SurgicalCasesListGrid({ cases }: { cases: EnrichedSurgicalCaseListItem[] }) {

  return (

    <div

      className="cases-list-panel"

      id="case-view-panel-list"

      role="tabpanel"

      aria-labelledby="case-view-tab-list"

    >

      <div className="cases-list-table-wrap">

        <div className="cases-list-table cases-list-table--identity" role="table" aria-label="Surgical cases list">

          <div className="cases-list-head" role="row">

            <div className="cases-list-col cases-list-col--identity" role="columnheader">

              Case

            </div>

          </div>

          <div className="cases-list-body">

            {cases.map((c) => (

              <CaseListRow key={c.id} c={c} />

            ))}

          </div>

        </div>

      </div>

    </div>

  );

}


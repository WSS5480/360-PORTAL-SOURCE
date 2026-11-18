"use client";



import React from "react";

import { operationalIntelligenceChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";

import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

import { ProviderIntelligenceGapLineList } from "./ProviderIntelligenceGapLineList";

import {

  buildIntelligenceSectionCardSummary,

  type IntelligenceSectionCardSummary,

} from "@/lib/surgical-sales/providerIntelligenceSectionSummary";

import {

  COLLAPSED_KEY_GAPS_MAX,

  COLLAPSED_TOP_FINDINGS_MAX,

  truncateScanFinding,

} from "@/lib/surgical-sales/providerIntelligenceSectionDisclosure";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type {

  ProviderPlanningCompletion,

  ProviderPlanningSectionCompletion,

} from "@/lib/surgical-sales/providerPlanningCompletion";

import {
  INTELLIGENCE_CARD_SECTION_LABELS,
  intelligenceSectionEmptyConfirmed,
  intelligenceSectionEmptyOpenQuestions,
} from "@/lib/surgical-sales/providerIntelligenceCardStatus";

import { buildSectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";



export function ProviderIntelligenceSectionCollapsedSummary({

  sectionId,

  section,

  contact,

  planning,

  onMissingClick,

  onGapClick,

  summary: summaryProp,

  executiveMinimal = false,

  accountUnderstandingMode = false,

}: {

  sectionId: ProviderIntelligenceSectionId;

  section: ProviderPlanningSectionCompletion;

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  onMissingClick?: (dbKey: string) => void;

  onGapClick?: (gap: IntelligenceLearningGap) => void;

  summary?: IntelligenceSectionCardSummary;

  executiveMinimal?: boolean;

  accountUnderstandingMode?: boolean;

}) {

  const summary = React.useMemo(

    () =>

      summaryProp ??

      buildIntelligenceSectionCardSummary(sectionId, contact, planning, {

        maxSignalChips: 0,

        maxFindings: COLLAPSED_TOP_FINDINGS_MAX,

        maxMissing: COLLAPSED_KEY_GAPS_MAX,

      }),

    [summaryProp, sectionId, contact, planning],

  );



  const mappingProgress = React.useMemo(

    () =>

      buildSectionOperationalMappingProgress(sectionId, contact, {

        planning,

        confidence: section.confidence,

      }),

    [sectionId, contact, planning, section.confidence],

  );



  const topFindings = summary.findings.slice(0, executiveMinimal ? 1 : COLLAPSED_TOP_FINDINGS_MAX);

  const keyGaps = summary.missing.slice(0, executiveMinimal ? 1 : COLLAPSED_KEY_GAPS_MAX);



  if (accountUnderstandingMode) {

    return (

      <div className="provider-intel-section-collapsed-understanding">

        <p className="provider-intel-section-collapsed-progress">{mappingProgress.metricsLine}</p>

        {topFindings[0] ? (

          <p className="provider-intel-section-collapsed-executive">

            {truncateScanFinding(topFindings[0].display)}

          </p>

        ) : null}

      </div>

    );

  }



  if (executiveMinimal) {

    const preview =

      topFindings[0]?.display?.trim() ||

      (keyGaps.length > 0

        ? `${keyGaps.length} open question${keyGaps.length === 1 ? "" : "s"}`

        : "Capture on your next touch");

    return (

      <p className="provider-intel-section-collapsed-executive">{truncateScanFinding(preview)}</p>

    );

  }



  return (

    <div className="provider-intel-section-collapsed provider-intel-card-layer--summary">

      <p className="provider-intel-section-collapsed-progress">{mappingProgress.metricsLine}</p>



      <div className="provider-intel-section-scan-block">

        <span className="provider-intel-section-block-label">

          {INTELLIGENCE_CARD_SECTION_LABELS.confirmed}

        </span>

        {topFindings.length > 0 ? (

          <ul className="provider-intel-section-findings-list provider-intel-section-findings-list--scan">

            {topFindings.map((row) => (

              <li key={row.dbKey} className="provider-intel-section-finding provider-intel-section-finding--scan">

                <span className="provider-intel-section-finding-label">

                  {operationalIntelligenceChipLabel(row.dbKey, row.label)}

                </span>

                <span className="provider-intel-section-finding-value">

                  {truncateScanFinding(row.display)}

                </span>

              </li>

            ))}

          </ul>

        ) : (

          <p className="provider-intel-section-empty">
            {intelligenceSectionEmptyConfirmed(sectionId)}
          </p>

        )}

      </div>



      <div className="provider-intel-section-scan-block">

        <span className="provider-intel-section-block-label">

          {INTELLIGENCE_CARD_SECTION_LABELS.openQuestions}

        </span>

        <ProviderIntelligenceGapLineList

          gaps={keyGaps}

          max={COLLAPSED_KEY_GAPS_MAX}

          emptyLabel={intelligenceSectionEmptyOpenQuestions(sectionId)}

          onGapClick={

            onGapClick ??

            (onMissingClick ? (gap) => onMissingClick(gap.dbKey) : undefined)

          }

        />

      </div>

    </div>

  );

}


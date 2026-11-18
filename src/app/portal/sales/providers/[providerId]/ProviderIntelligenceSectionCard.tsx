"use client";

import React from "react";
import { formatPlanningSectionConfidenceHint } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_LABELS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningSectionCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { intelligenceSectionWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { buildSectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import { intelligenceMappingCtaLabel } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  buildIntelligenceSectionProgressPills,
  buildIntelligenceSectionScanSummary,
} from "@/lib/surgical-sales/intelligenceSectionScanView";
import { deploymentReadinessBadgeLabel } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import { ProviderIntelligenceSectionExpandedEditor } from "./ProviderIntelligenceSectionExpandedEditor";
import { ProviderIntelligenceSectionExpandedDetails } from "./ProviderIntelligenceSectionExpandedDetails";
import { ProviderIntelligenceWhyItMatters } from "./ProviderIntelligenceWhyItMatters";
import { buildOperationalReadinessCardFromSection } from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { ProviderOperationalReadinessCard } from "./ProviderOperationalReadinessCard";
import { useIntelDashCompactLayout } from "./useIntelDashCompactLayout";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";

export function ProviderIntelligenceSectionCard({
  sectionId,
  section,
  title,
  contact,
  planning,
  planDraft,
  setPlanDraft,
  saving,
  fieldMetadata,
  expanded,
  emphasizeKeys,
  deepenExpanded,
  onToggleExpand,
  onCaptureGap,
  onToggleDeepen,
  cardId,
  primaryFieldFilter,
  deepenFieldBuilder,
  cardWorkspace,
  cardActions,
  actionsBusy,
  executiveMinimal = false,
  accountUnderstandingMode = false,
  scanDashboard = false,
  onViewDetails,
  highlightPulseKey,
}: {
  sectionId: ProviderIntelligenceSectionId;
  section: ProviderPlanningSectionCompletion;
  title?: string;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  expanded: boolean;
  emphasizeKeys?: readonly string[];
  deepenExpanded: boolean;
  onToggleExpand: () => void;
  onCaptureGap: (dbKey: string) => void;
  onToggleDeepen: () => void;
  cardId?: string;
  primaryFieldFilter?: Parameters<typeof ProviderIntelligenceSectionExpandedEditor>[0]["primaryFieldFilter"];
  deepenFieldBuilder?: Parameters<typeof ProviderIntelligenceSectionExpandedEditor>[0]["deepenFieldBuilder"];
  cardWorkspace: IntelligenceCardWorkspace;
  cardActions: IntelligenceCardActionHandlers;
  actionsBusy?: boolean;
  executiveMinimal?: boolean;
  accountUnderstandingMode?: boolean;
  /** Scan-first mobile dashboard — details in drawer, not inline accordion. */
  scanDashboard?: boolean;
  onViewDetails?: (sectionId: ProviderIntelligenceSectionId) => void;
  /** Bumps when this section was just updated — drives refresh animation. */
  highlightPulseKey?: number;
}) {
  const mergedContact = React.useMemo(
    () => ({ ...contact, ...planDraft }),
    [contact, planDraft],
  );

  const mappingProgress = React.useMemo(
    () =>
      buildSectionOperationalMappingProgress(sectionId, mergedContact, {
        planning,
        confidence: section.confidence,
        fieldMetadata,
      }),
    [sectionId, mergedContact, planning, section.confidence, fieldMetadata],
  );

  const topGap = React.useMemo(() => {
    return (
      buildIntelligenceLearningGaps(mergedContact, planning, 8, {
        maturityStage: undefined,
      }).find((g) => g.sectionId === sectionId) ?? null
    );
  }, [mergedContact, planning, sectionId]);

  const scanSummary = React.useMemo(
    () =>
      buildIntelligenceSectionScanSummary({
        sectionId,
        progress: mappingProgress,
        topGap,
        contact: mergedContact,
      }),
    [sectionId, mappingProgress, topGap, mergedContact],
  );

  const deploymentBadge = React.useMemo(
    () => deploymentReadinessBadgeLabel(mappingProgress),
    [mappingProgress],
  );

  const progressPills = React.useMemo(
    () => buildIntelligenceSectionProgressPills(mappingProgress),
    [mappingProgress],
  );

  const sectionTitle = title ?? PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId];
  const intelCompact = useIntelDashCompactLayout();
  const useScanLayout = scanDashboard || executiveMinimal || accountUnderstandingMode;

  const readinessCard = React.useMemo(
    () =>
      buildOperationalReadinessCardFromSection({
        sectionId,
        title: sectionTitle,
        contact: mergedContact,
        planning,
        progress: mappingProgress,
        topGap,
        fieldKeys: PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId],
        fieldMetadata,
      }),
    [sectionId, sectionTitle, mergedContact, planning, mappingProgress, topGap, fieldMetadata],
  );

  if (useScanLayout) {
    return (
      <div id={cardId} className="provider-intel-scan-card-wrap">
        <ProviderOperationalReadinessCard
          card={readinessCard}
          compact={intelCompact}
          defaultExpanded={false}
          onPrimaryAction={(_sectionId, _dbKey) => cardActions.onCaptureSignal()}
          onViewDetails={() =>
            onViewDetails ? onViewDetails(sectionId) : onToggleExpand()
          }
          disabled={actionsBusy}
          pulseKey={highlightPulseKey}
        />
      </div>
    );
  }

  const mature = section.confidence === "validated" || section.confidence === "confirmed";

  if (!expanded) {
    return (
      <div id={cardId}>
        <ProviderOperationalReadinessCard
          card={readinessCard}
          compact={intelCompact}
          defaultExpanded={false}
          onPrimaryAction={(_sectionId, _dbKey) => cardActions.onCaptureSignal()}
          onViewDetails={() =>
            onViewDetails ? onViewDetails(sectionId) : onToggleExpand()
          }
          disabled={actionsBusy}
          pulseKey={highlightPulseKey}
        />
      </div>
    );
  }

  return (
    <article
      id={cardId}
      className={`provider-intel-compact-card provider-intel-section-card provider-intel-section-card--workspace provider-intel-section-card--summary-first provider-intel-section-card--${section.confidence} provider-intel-compact-card--open${mature ? " provider-intel-section-card--mature" : ""}`}
    >
      <div className="provider-intel-section-card-head">
        <button
          type="button"
          className="provider-intel-compact-card-trigger provider-intel-section-card-trigger"
          aria-expanded={expanded}
          onClick={onToggleExpand}
        >
          <span className="provider-intel-compact-card-main">
            <span className="provider-intel-compact-card-title-row">
              <span className="provider-intel-compact-card-title">{sectionTitle}</span>
              <span
                className={`provider-intel-confidence-badge provider-intel-confidence-badge--${mappingProgress.readinessTone}`}
                title={formatPlanningSectionConfidenceHint(section)}
              >
                {mappingProgress.statusBadge}
              </span>
            </span>
            <span className="provider-intel-section-collapsed-metrics">
              {mappingProgress.metricsLine}
            </span>
          </span>
          <span className="provider-intel-compact-card-chevron" aria-hidden>
            −
          </span>
        </button>
      </div>

      <div className="provider-intel-compact-card-body provider-intel-card-layer--capture">
        <ProviderIntelligenceWhyItMatters
          variant="section"
          text={intelligenceSectionWhyItMatters(sectionId)}
        />
        <ProviderIntelligenceSectionExpandedEditor
          sectionId={sectionId}
          contact={contact}
          planDraft={planDraft}
          setPlanDraft={setPlanDraft}
          saving={saving}
          fieldMetadata={fieldMetadata}
          sectionConfidence={section.confidence}
          emphasizeKeys={emphasizeKeys}
          deepenExpanded={deepenExpanded}
          onToggleDeepen={onToggleDeepen}
          onCaptureGap={onCaptureGap}
          primaryFieldFilter={primaryFieldFilter}
          deepenFieldBuilder={deepenFieldBuilder}
          providerId={undefined}
        />
        <ProviderIntelligenceSectionExpandedDetails
          sectionId={sectionId}
          contact={{ ...contact, ...planDraft }}
          fieldMetadata={fieldMetadata}
          onEditField={onCaptureGap}
        />
      </div>
    </article>
  );
}

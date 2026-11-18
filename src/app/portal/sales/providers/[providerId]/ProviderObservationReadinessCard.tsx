"use client";

import React from "react";
import {
  findPlanningSection,
  type ProviderPlanningCompletion,
  type ProviderPlanningSectionCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import { PROVIDER_INTELLIGENCE_SECTION_LABELS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import { ProviderIntelligenceSectionCard } from "./ProviderIntelligenceSectionCard";

const SECTION_ID = "observation_readiness" as const;

function defaultObservationSection(): ProviderPlanningSectionCompletion {
  return {
    id: SECTION_ID,
    label: PROVIDER_INTELLIGENCE_SECTION_LABELS[SECTION_ID],
    status: "not_started",
    filled: 0,
    total: 8,
    percent: 0,
    confidence: "unknown",
    confidence_score: 0,
    confidence_progress: 0,
    anchors_confirmed: false,
    recency_factor: 0.5,
    attribution_factor: 0,
    last_updated_at: null,
  };
}

export function ProviderObservationReadinessCard({
  contact,
  planning,
  planDraft,
  setPlanDraft,
  saving,
  emphasizeKeys,
  expanded: expandedProp,
  onExpandedChange,
  onCaptureGap,
  cardWorkspace,
  cardActions,
  actionsBusy,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  emphasizeKeys?: readonly string[];
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onCaptureGap: (dbKey?: string) => void;
  cardWorkspace: IntelligenceCardWorkspace;
  cardActions: IntelligenceCardActionHandlers;
  actionsBusy?: boolean;
}) {
  const fieldMetadata = React.useMemo(
    (): ProviderIntelligenceFieldMetadataMap => intelligenceMetadataFromContact(contact),
    [contact],
  );
  const section = planning
    ? (findPlanningSection(planning, SECTION_ID) ?? defaultObservationSection())
    : defaultObservationSection();

  const [expandedInternal, setExpandedInternal] = React.useState(false);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;
  const [deepExpanded, setDeepExpanded] = React.useState(false);

  React.useEffect(() => {
    if (emphasizeKeys?.length) setExpanded(true);
  }, [emphasizeKeys, setExpanded]);

  React.useEffect(() => {
    if (emphasizeKeys?.length) setDeepExpanded(true);
  }, [emphasizeKeys]);

  return (
    <ProviderIntelligenceSectionCard
      sectionId={SECTION_ID}
      section={section}
      contact={contact}
      planning={planning}
      planDraft={planDraft}
      setPlanDraft={setPlanDraft}
      saving={saving}
      fieldMetadata={fieldMetadata}
      expanded={expanded}
      emphasizeKeys={emphasizeKeys}
      deepenExpanded={deepExpanded}
      onToggleExpand={() => setExpanded(!expanded)}
      onCaptureGap={(dbKey) => onCaptureGap(dbKey)}
      onToggleDeepen={() => setDeepExpanded((v) => !v)}
      cardId="provider-intel-observation-readiness"
      cardWorkspace={cardWorkspace}
      cardActions={cardActions}
      actionsBusy={actionsBusy}
    />
  );
}

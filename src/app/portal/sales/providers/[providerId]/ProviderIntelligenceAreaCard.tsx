"use client";

import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningSectionCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningTabSectionId } from "@/lib/surgical-sales/providerPlanningTabSections";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import { ProviderIntelligenceSectionCard } from "./ProviderIntelligenceSectionCard";

export function ProviderIntelligenceAreaCard({
  section,
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
  cardWorkspace,
  cardActions,
  actionsBusy,
  executiveMinimal = false,
  accountUnderstandingMode = false,
  scanDashboard = false,
  onViewDetails,
  highlightPulseKey,
}: {
  section: ProviderPlanningSectionCompletion;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  expanded: boolean;
  emphasizeKeys: readonly string[];
  deepenExpanded: boolean;
  onToggleExpand: () => void;
  onCaptureGap: (dbKey: string) => void;
  onToggleDeepen: () => void;
  cardWorkspace: IntelligenceCardWorkspace;
  cardActions: IntelligenceCardActionHandlers;
  actionsBusy?: boolean;
  executiveMinimal?: boolean;
  accountUnderstandingMode?: boolean;
  scanDashboard?: boolean;
  onViewDetails?: (sectionId: ProviderIntelligenceSectionId) => void;
  highlightPulseKey?: number;
}) {
  const sectionId = section.id as ProviderPlanningTabSectionId;

  return (
    <ProviderIntelligenceSectionCard
      sectionId={sectionId}
      section={section}
      contact={contact}
      planning={planning}
      planDraft={planDraft}
      setPlanDraft={setPlanDraft}
      saving={saving}
      fieldMetadata={fieldMetadata}
      expanded={expanded}
      emphasizeKeys={emphasizeKeys}
      deepenExpanded={deepenExpanded}
      onToggleExpand={onToggleExpand}
      onCaptureGap={onCaptureGap}
      onToggleDeepen={onToggleDeepen}
      cardWorkspace={cardWorkspace}
      cardActions={cardActions}
      actionsBusy={actionsBusy}
      executiveMinimal={executiveMinimal}
      accountUnderstandingMode={accountUnderstandingMode}
      scanDashboard={scanDashboard}
      onViewDetails={onViewDetails}
      highlightPulseKey={highlightPulseKey}
    />
  );
}

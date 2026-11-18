"use client";

import React from "react";
import { PROVIDER_CANONICAL_SURFACES } from "@/lib/surgical-sales/providerProfileCanonicalSurfaces";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { ProviderIntelligenceWorkspaceSummary } from "./ProviderIntelligenceWorkspaceSummary";
import {
  statusCardTargetSection,
  type IntelligenceStatusCard,
} from "./ProviderIntelligenceStatusCards";
import { buildIntelligenceStatusCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import type { IntelligenceCardWorkspace } from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";

/**
 * Supporting layer — validated intelligence only (trust by area).
 * Readiness, blockers, and discovery priorities have canonical homes elsewhere.
 */
export function ProviderIntelligenceSupportingPanel({
  contact,
  planning,
  specialty,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  fieldMetadata,
  onCapture,
  workspaceForSection,
  handlersForSection,
  actionsBusy,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  workspaceForSection: (sectionId: ProviderIntelligenceSectionId) => IntelligenceCardWorkspace;
  handlersForSection: (
    sectionId: ProviderIntelligenceSectionId,
    workspace?: IntelligenceCardWorkspace,
  ) => IntelligenceCardActionHandlers;
  actionsBusy?: boolean;
}) {
  return (
    <section
      className="provider-intel-supporting provider-intel-supporting--validated-only provider-intel-supporting--flat"
      aria-label={PROVIDER_CANONICAL_SURFACES.validated_intelligence.label}
    >
      <ProviderIntelligenceWorkspaceSummary
        contact={contact}
        planning={planning}
        specialty={specialty}
        relationshipStage={relationshipStage}
        engagements={engagements}
        opportunities={opportunities}
        cases={cases}
        actionsBusy={actionsBusy}
        workspaceForStatusCard={(card: IntelligenceStatusCard) =>
          buildIntelligenceStatusCardWorkspace(
            card.id,
            contact,
            planning,
            fieldMetadata,
            card.targetDbKey,
          )
        }
        handlersForStatusCard={(card: IntelligenceStatusCard) => {
          const ws = buildIntelligenceStatusCardWorkspace(
            card.id,
            contact,
            planning,
            fieldMetadata,
            card.targetDbKey,
          );
          return handlersForSection(statusCardTargetSection(card), ws);
        }}
        onOpenSection={onCapture}
      />
    </section>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  buildIntelligenceSectionCardWorkspace,
  buildProviderFollowUpEngagementHref,
  type IntelligenceCardWorkspace,
} from "@/lib/surgical-sales/providerIntelligenceCardWorkspace";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderPlanningTabSectionId } from "@/lib/surgical-sales/providerPlanningTabSections";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import type { IntelligenceCardActionHandlers } from "./ProviderIntelligenceCardActions";

const OBSERVATION_SECTION_ID = "observation_readiness" as const;

export function useIntelligenceCardActions(params: {
  providerId: string;
  accountId?: string | null;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  openQuickCapture: (sectionId: ProviderPlanningTabSectionId | typeof OBSERVATION_SECTION_ID, dbKey?: string) => void;
  openFullArea: (sectionId: ProviderPlanningTabSectionId | typeof OBSERVATION_SECTION_ID) => void;
  onProviderUpdated: (payload: ProviderProfilePayload) => void;
}) {
  const router = useRouter();
  const [validating, setValidating] = React.useState(false);

  const workspaceForSection = React.useCallback(
    (sectionId: ProviderIntelligenceSectionId): IntelligenceCardWorkspace =>
      buildIntelligenceSectionCardWorkspace(
        sectionId,
        params.contact,
        params.planning,
        params.fieldMetadata,
      ),
    [params.contact, params.planning, params.fieldMetadata],
  );

  const markSectionValidated = React.useCallback(
    async (sectionId: ProviderIntelligenceSectionId) => {
      const ws = workspaceForSection(sectionId);
      if (!ws.canMarkValidated) return;
      setValidating(true);
      try {
        const res = await fetch(
          `/api/portal/sales/providers/${encodeURIComponent(params.providerId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intelligence_validate_fields: ws.validateDbKeys }),
          },
        );
        const j = (await res.json()) as ProviderProfilePayload;
        if (!res.ok || !j.ok) throw new Error(j.error || "Validation failed");
        params.onProviderUpdated(j);
      } finally {
        setValidating(false);
      }
    },
    [params, workspaceForSection],
  );

  const handlersForSection = React.useCallback(
    (
      sectionId: ProviderIntelligenceSectionId,
      workspace?: IntelligenceCardWorkspace,
    ): IntelligenceCardActionHandlers => {
      const ws = workspace ?? workspaceForSection(sectionId);
      const sid = sectionId as ProviderPlanningTabSectionId | typeof OBSERVATION_SECTION_ID;

      return {
        onCaptureSignal: () => {
          params.openQuickCapture(sid, ws.captureDbKey ?? undefined);
        },
        onMarkValidated: () => {
          void markSectionValidated(sectionId);
        },
        onAddNote: () => {
          const noteKey = ws.noteDbKey ?? ws.captureDbKey;
          if (noteKey) params.openQuickCapture(sid, noteKey);
          else params.openFullArea(sid);
        },
        onOpenFullArea: () => {
          params.openFullArea(sid);
        },
        onAssignFollowUp: () => {
          router.push(
            buildProviderFollowUpEngagementHref(
              params.providerId,
              params.accountId,
              ws.followUpEngagementType,
            ),
          );
        },
      };
    },
    [markSectionValidated, params, router, workspaceForSection],
  );

  return {
    validating,
    workspaceForSection,
    handlersForSection,
    markSectionValidated,
  };
}

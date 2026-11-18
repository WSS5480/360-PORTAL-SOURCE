"use client";

import React from "react";
import {
  RapidDiscoverySupportContactPanel,
  supportContactDraftReady,
} from "@/app/portal/sales/providers/[providerId]/RapidDiscoverySupportContactPanel";
import {
  defaultContactTypeForSchedulingPath,
  defaultWorkflowResponsibilitiesForSignal,
} from "@/lib/surgical-sales/operationalSupportContact";
import { emptySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  SCHEDULING_OWNERSHIP_UI,
  schedulingPathRequiresFacilityContact,
  schedulingPathRequiresProviderContact,
  type SchedulingControlPathId,
} from "@/lib/surgical-sales/schedulingOwnershipIntelligence";

function initDraft(input: {
  dbKey: string;
  organizationId: string | null;
  path: SchedulingControlPathId;
  slot: "provider" | "facility";
  mode: "select" | "create";
}): RapidDiscoverySupportContactDraft {
  const draft = emptySupportContactDraft({
    dbKey: input.dbKey,
    organizationId: input.organizationId,
    initialMode: input.mode,
    discoverySignalId: "scheduling_owner",
    ownershipType: input.slot === "provider" ? "provider" : "organization",
  });
  return {
    ...draft,
    contactTypeId: defaultContactTypeForSchedulingPath(input.path, input.slot),
  };
}

export function SchedulingOwnershipMappingFields({
  schedulingControl,
  providerContactDraft,
  facilityContactDraft,
  contactMode,
  providerId,
  organizationId,
  organizationName,
  contactPool,
  disabled,
  onProviderContactChange,
  onFacilityContactChange,
  contactSearchPrefill,
}: {
  schedulingControl: SchedulingControlPathId | "";
  providerContactDraft: RapidDiscoverySupportContactDraft | null;
  facilityContactDraft: RapidDiscoverySupportContactDraft | null;
  contactMode: "select" | "create" | null;
  providerId: string;
  organizationId: string | null;
  organizationName?: string | null;
  contactPool: Record<string, unknown>[];
  disabled?: boolean;
  onProviderContactChange: (draft: RapidDiscoverySupportContactDraft) => void;
  onFacilityContactChange: (draft: RapidDiscoverySupportContactDraft) => void;
  contactSearchPrefill?: string | null;
}) {
  const dbKey = "provider_observation_coordinator_contact";

  React.useEffect(() => {
    if (!contactMode) return;
    if (!schedulingControl || schedulingControl === "unknown") return;
    if (schedulingPathRequiresProviderContact(schedulingControl) && !providerContactDraft) {
      onProviderContactChange(
        initDraft({
          dbKey,
          organizationId,
          path: schedulingControl,
          slot: "provider",
          mode: contactMode,
        }),
      );
    }
    if (schedulingPathRequiresFacilityContact(schedulingControl) && !facilityContactDraft) {
      onFacilityContactChange(
        initDraft({
          dbKey,
          organizationId,
          path: schedulingControl,
          slot: "facility",
          mode: contactMode,
        }),
      );
    }
  }, [
    schedulingControl,
    contactMode,
    providerContactDraft,
    facilityContactDraft,
    organizationId,
    onProviderContactChange,
    onFacilityContactChange,
  ]);

  if (!schedulingControl || schedulingControl === "unknown") {
    return null;
  }

  const showProvider = schedulingPathRequiresProviderContact(schedulingControl);
  const showFacility = schedulingPathRequiresFacilityContact(schedulingControl);

  return (
    <section className="scheduling-ownership-panel" aria-label="Scheduling workflow contacts">
      {schedulingControl === "shared_workflow" ? (
        <p className="scheduling-ownership-shared-helper">{SCHEDULING_OWNERSHIP_UI.sharedHelper}</p>
      ) : null}

      {showProvider && providerContactDraft ? (
        <div className="scheduling-ownership-slot">
          <header className="scheduling-ownership-slot-head">
            <h4 className="scheduling-ownership-slot-title">{SCHEDULING_OWNERSHIP_UI.providerSectionLabel}</h4>
            <p className="scheduling-ownership-slot-helper">{SCHEDULING_OWNERSHIP_UI.providerSectionHelper}</p>
          </header>
          <RapidDiscoverySupportContactPanel
            dbKey={dbKey}
            providerId={providerId}
            organizationId={organizationId}
            organizationName={organizationName}
            existingContacts={contactPool}
            draft={providerContactDraft}
            onDraftChange={onProviderContactChange}
            disabled={disabled}
            defaultExpanded
            title="Who helps coordinate?"
            hint="Provider office staff — saved to this provider's workflow"
            discoverySignalId="scheduling_owner"
            suggestedWorkflowIds={defaultWorkflowResponsibilitiesForSignal("scheduling_owner")}
            schedulingPath={schedulingControl}
            schedulingSlot="provider"
            ownershipType="provider"
            initialSearch={contactSearchPrefill ?? undefined}
          />
        </div>
      ) : null}

      {showFacility && facilityContactDraft ? (
        <div className="scheduling-ownership-slot">
          <header className="scheduling-ownership-slot-head">
            <h4 className="scheduling-ownership-slot-title">{SCHEDULING_OWNERSHIP_UI.facilitySectionLabel}</h4>
            <p className="scheduling-ownership-slot-helper">{SCHEDULING_OWNERSHIP_UI.facilitySectionHelper}</p>
          </header>
          <RapidDiscoverySupportContactPanel
            dbKey={dbKey}
            providerId={providerId}
            organizationId={organizationId}
            organizationName={organizationName}
            existingContacts={contactPool}
            draft={facilityContactDraft}
            onDraftChange={onFacilityContactChange}
            disabled={disabled}
            defaultExpanded
            title="Who helps coordinate?"
            hint="Facility staff — linked to the hospital or ASC"
            discoverySignalId="scheduling_owner"
            suggestedWorkflowIds={defaultWorkflowResponsibilitiesForSignal("scheduling_owner")}
            schedulingPath={schedulingControl}
            schedulingSlot="facility"
            ownershipType="organization"
            initialSearch={contactSearchPrefill ?? undefined}
          />
        </div>
      ) : null}
    </section>
  );
}

export function schedulingOwnershipContactsReady(input: {
  schedulingControl: SchedulingControlPathId | "";
  providerContactDraft: RapidDiscoverySupportContactDraft | null;
  facilityContactDraft: RapidDiscoverySupportContactDraft | null;
}): boolean {
  if (!input.schedulingControl) return false;
  if (input.schedulingControl === "unknown") return true;
  const providerReady =
    !schedulingPathRequiresProviderContact(input.schedulingControl) ||
    (input.providerContactDraft != null && supportContactDraftReady(input.providerContactDraft));
  const facilityReady =
    !schedulingPathRequiresFacilityContact(input.schedulingControl) ||
    (input.facilityContactDraft != null && supportContactDraftReady(input.facilityContactDraft));
  return providerReady && facilityReady;
}

export {
  defaultContactTypeForSchedulingPath,
  initDraft as initSchedulingContactDraft,
};

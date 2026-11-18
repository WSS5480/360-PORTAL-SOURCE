import { describe, expect, it } from "vitest";

import {
  listActiveSuggestedContacts,
  resolveSuggestedSchedulerCandidate,
} from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  buildMissionBoardCaptureSaveToast,
  isMissionBoardQuickCaptureSurface,
} from "@/lib/surgical-sales/missionBoardCaptureSaveToast";
import { buildProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import {
  emptyProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
  type CandidateContactIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { resolveObservationStatusFromContact, missionBoardObservationStatusLabel } from "@/lib/surgical-sales/observationStatus";
import { OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL } from "@/lib/surgical-sales/observationApprovalSave";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

function karenCandidate(): CandidateContactIntelligence {
  return {
    id: "candidate-karen",
    contact_name: "Karen",
    contact_role: "Scheduler",
    lifecycle: "suggested",
    status: "active",
    source_quote: "Karen handles scheduling",
    source_reference: "provider:p1",
    source_engagement_id: null,
    captured_at: "2026-06-01T12:00:00.000Z",
    linked_contact_id: null,
    mention_level: "potential_support_contact",
    workflow_role: "scheduler",
  };
}

function contactWithKarenCandidate(): Record<string, unknown> {
  return {
    id: "p1",
    [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
      ...emptyProviderCommercialIntelligence(),
      candidate_contacts: [karenCandidate()],
    },
  };
}

describe("mission board capture flow", () => {
  it("uses mission_board launch surface for quick capture", () => {
    expect(isMissionBoardQuickCaptureSurface("mission_board")).toBe(true);
    expect(isMissionBoardQuickCaptureSurface("provider")).toBe(false);
  });

  it("builds user-facing toast without storage destinations", () => {
    const review = {
      usesProviderIntelligence: true,
      fieldUpdates: [
        {
          id: "f1",
          accepted: true,
          dbKey: "provider_observation_feasibility",
          proposedValue: "interested",
          label: "Observation interest",
        },
        {
          id: "f2",
          accepted: true,
          dbKey: "provider_observation_credentialing_needed",
          proposedValue: "required before observation",
          label: "Credentialing",
        },
      ],
    } as LogUpdateParseResult;

    const toast = buildMissionBoardCaptureSaveToast(review, [
      {
        id: "c1",
        displayName: "Karen",
        roleLabel: "Scheduler",
        workflowLabel: "Scheduling",
        disposition: "skipped",
        mentionLevel: "potential_support_contact",
      },
    ]);

    expect(toast.title).toBe("Provider updated");
    expect(toast.detail).toMatch(/observation interest/i);
    expect(toast.detail).toMatch(/scheduler candidate saved/i);
    expect(toast.detail).not.toMatch(/saved to provider/i);
    expect(toast.detail).not.toMatch(/organization intelligence/i);
  });

  it("hydrates observation status as Interested from commercial intelligence when profile metadata is empty", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.interest = "yes";

    const status = resolveObservationStatusFromContact({
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: commercial,
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL,
          updated_at: "2026-06-01T00:00:00.000Z",
        },
      },
    });

    expect(status).toBe("interested");
  });

  it("shows scheduler candidate in shared suggested-contact source", () => {
    const contact = contactWithKarenCandidate();
    expect(listActiveSuggestedContacts(contact)).toHaveLength(1);
    expect(resolveSuggestedSchedulerCandidate(contact)?.contact_name).toBe("Karen");
  });

  it("keeps scheduler pathway step incomplete until candidate is linked", () => {
    const model = buildProviderFieldIntelligenceModel({ contact: contactWithKarenCandidate() });
    expect(model.scheduler.captureState).toBe("referenced");
    expect(model.scheduler.isConfirmed).toBe(false);
    expect(model.scheduler.primaryLine).toMatch(/Karen identified — not linked yet/i);
  });

  it("uses short mission board observation status labels", () => {
    expect(missionBoardObservationStatusLabel("permission_confirmed")).toBe("Permission Confirmed");
    expect(missionBoardObservationStatusLabel("permission_not_yet_confirmed")).toBe("Permission Requested");
    expect(missionBoardObservationStatusLabel("interested")).toBe("Interested");
  });
});

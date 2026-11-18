import { describe, expect, it } from "vitest";
import {
  countPendingIntelligenceSuggestions,
  parseResultForPendingStorage,
  proposedContactsForPendingStorage,
  readPendingIntelligenceCaptures,
} from "@/lib/surgical-sales/pendingIntelligenceCapture";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

function sampleParse(accepted = true): LogUpdateParseResult {
  return {
    sourceText: "Karen handles scheduling.",
    suggestedUpdates: [],
    fieldUpdates: [
      {
        id: "f1",
        dbKey: "provider_observation_coordinator_contact",
        label: "Scheduler contact",
        proposedValue: "Karen",
        accepted,
        destination: "provider",
        destinationReason: "",
        scopeReason: "",
      },
    ],
    intelligenceReview: {
      confirmedUpdates: [],
      partiallyConfirmed: [],
      stillWorthConfirming: [],
      relatedOperationalAreas: [],
    },
    stillMissing: [],
    saveAsNoteAccepted: false,
    usesProviderIntelligence: true,
    aiMapping: null,
  };
}

describe("pendingIntelligenceCapture", () => {
  it("normalizes detected contacts to pending disposition for deferred review", () => {
    const stored = proposedContactsForPendingStorage([
      {
        id: "c1",
        displayName: "Amy",
        roleLabel: "Scheduling Coordinator",
        disposition: "accepted",
        linkedContactId: "crm-1",
      } as never,
    ]);
    expect(stored[0]?.disposition).toBe("pending");
    expect(stored[0]?.linkedContactId).toBe("");
  });

  it("stores parse results with review items unselected for later approval", () => {
    const stored = parseResultForPendingStorage(sampleParse(true));
    expect(stored.saveAsNoteAccepted).toBe(true);
    expect(stored.fieldUpdates.every((field) => field.accepted === false)).toBe(true);
  });

  it("reads pending captures and counts suggestions from commercial intelligence JSONB", () => {
    const contact = {
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
        version: 1,
        observation: {
          interest: "unknown",
          approval_status: "unknown",
          credentialing_required: "unknown",
          readiness: "unknown",
          access_status: "unknown",
        },
        scheduling: {
          scheduler_identified: "unknown",
          scheduler_contact_linked: "unknown",
          scheduling_workflow_known: "unknown",
        },
        credentialing: {
          credentialing_required: "unknown",
          credentialing_platform_known: "unknown",
          credentialing_notes: [],
        },
        clinical: {
          entries: [],
          procedure_focus: [],
          clinical_frustrations: [],
          clinical_preferences: [],
          workflow_observations: [],
          trends: [],
        },
        support_contacts: [],
        candidate_contacts: [],
        pending_intelligence_captures: [
          {
            id: "pic-1",
            source_text: "Credentialing required.",
            parse_result: sampleParse(false),
            proposed_contacts: [],
            discovery_context: null,
            suggestion_count: 2,
            suggestion_labels: ["Credentialing required", "Scheduler identified"],
            created_at: "2026-06-11T12:00:00.000Z",
            created_by_user_id: "rep-1",
            status: "pending",
            capture_surface: "mission_board",
            source_engagement_id: null,
          },
        ],
      },
    };

    expect(readPendingIntelligenceCaptures(contact)).toHaveLength(1);
    expect(countPendingIntelligenceSuggestions(contact)).toBe(2);
  });
});

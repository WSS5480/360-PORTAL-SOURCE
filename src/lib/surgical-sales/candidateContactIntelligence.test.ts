import { describe, expect, it } from "vitest";

import {
  candidateContactFromProposed,
  candidateContactsFromProposedList,
  listActiveSuggestedContacts,
  mergeCandidateContacts,
  resolveSuggestedSchedulerCandidate,
} from "./candidateContactIntelligence";
import type { DebriefProposedContactItem } from "./debriefDetectedContact";
import { PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY, emptyProviderCommercialIntelligence } from "./providerCommercialIntelligenceModel";

function proposed(overrides: Partial<DebriefProposedContactItem>): DebriefProposedContactItem {
  return {
    id: "c1",
    firstName: "Karen",
    lastName: "",
    displayName: "Karen",
    email: "",
    phone: "",
    notes: "",
    contactTypeId: "scheduler",
    contactTypeLabel: "Scheduler",
    ownershipType: "provider_office",
    ownershipLabel: "Provider office",
    workflowResponsibilityId: "scheduling",
    workflowLabel: "Scheduling",
    roleLabel: "Scheduling Coordinator",
    sourceQuote: "Karen handles scheduling.",
    sourceReference: "Engagement debrief",
    linkedContactId: null,
    linkedContactName: null,
    intelligenceDbKey: "provider_observation_coordinator_contact",
    discoverySignalId: null,
    disposition: "skipped",
    contactDetailsMissing: true,
    mentionLevel: "workflow_participant",
    ...overrides,
  };
}

describe("candidateContactIntelligence", () => {
  it("persists skipped workflow participant as suggested candidate", () => {
    const row = candidateContactFromProposed(proposed({ disposition: "skipped" }));
    expect(row?.lifecycle).toBe("suggested");
    expect(row?.status).toBe("active");
    expect(row?.workflow_role).toBe("scheduler");
    expect(row?.source_quote).toContain("Karen handles scheduling");
  });

  it("merges by name and keeps stronger lifecycle", () => {
    const merged = mergeCandidateContacts(
      [candidateContactFromProposed(proposed({ disposition: "pending" }))!],
      [candidateContactFromProposed(proposed({ disposition: "skipped" }))!],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.lifecycle).toBe("suggested");
  });

  it("surfaces active suggested scheduler from commercial intelligence", () => {
    const contact = {
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: candidateContactsFromProposedList([proposed({ disposition: "skipped" })]),
      },
    };
    expect(listActiveSuggestedContacts(contact)).toHaveLength(1);
    expect(resolveSuggestedSchedulerCandidate(contact)?.contact_name).toBe("Karen");
  });

  it("does not surface a candidate after it is confirmed and linked", () => {
    const contact = {
      [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
        ...emptyProviderCommercialIntelligence(),
        candidate_contacts: [
          {
            ...candidateContactFromProposed(proposed({ disposition: "skipped" }))!,
            lifecycle: "confirmed" as const,
            status: "confirmed" as const,
            linked_contact_id: "contact-1",
          },
        ],
      },
    };

    expect(listActiveSuggestedContacts(contact)).toHaveLength(0);
  });

  it("merges duplicate candidate names into the confirmed linked row", () => {
    const current = candidateContactFromProposed(
      proposed({
        id: "candidate-jennifer",
        displayName: "Jennifer",
        firstName: "Jennifer",
      }),
    )!;
    const confirmed = {
      ...candidateContactFromProposed(
        proposed({
          id: "candidate-jennifer-confirmed",
          displayName: " Jennifer ",
          firstName: "Jennifer",
          linkedContactId: "contact-1",
        }),
      )!,
      lifecycle: "confirmed" as const,
      status: "confirmed" as const,
    };

    const merged = mergeCandidateContacts([current], [confirmed]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("confirmed");
    expect(merged[0]?.linked_contact_id).toBe("contact-1");
  });

  it("keeps dismissed duplicate mentions hidden unless a newer mention arrives", () => {
    const dismissed = {
      ...candidateContactFromProposed(
        proposed({
          id: "candidate-karen-dismissed",
          displayName: "Karen",
          sourceQuote: "Karen was mentioned in an old note.",
        }),
        { capturedAt: "2026-06-18T12:00:00.000Z" },
      )!,
      status: "dismissed" as const,
    };
    const staleIncoming = candidateContactFromProposed(
      proposed({
        id: "candidate-karen-stale",
        displayName: " Karen ",
        sourceQuote: "Karen handles scheduling.",
      }),
      { capturedAt: "2026-06-18T11:00:00.000Z" },
    )!;
    const newerIncoming = candidateContactFromProposed(
      proposed({
        id: "candidate-karen-newer",
        displayName: "Karen",
        sourceQuote: "Karen handles the next observation scheduling.",
      }),
      { capturedAt: "2026-06-19T12:00:00.000Z" },
    )!;

    const staleMerge = mergeCandidateContacts([dismissed], [staleIncoming]);
    expect(staleMerge).toHaveLength(1);
    expect(staleMerge[0]?.status).toBe("dismissed");

    const newerMerge = mergeCandidateContacts([dismissed], [newerIncoming]);
    expect(newerMerge).toHaveLength(1);
    expect(newerMerge[0]?.status).toBe("active");
    expect(newerMerge[0]?.source_quote).toContain("next observation scheduling");
  });
});

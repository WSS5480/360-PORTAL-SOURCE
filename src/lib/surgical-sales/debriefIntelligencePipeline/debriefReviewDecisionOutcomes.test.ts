import { describe, expect, it } from "vitest";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  filterDecisionRequiredOutcomes,
  hasOpenReviewDecisions,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisionOutcomes";

function contactOutcome(contactId: string, primaryLine = "Jennifer Miller"): IntelligenceBriefOutcome {
  return {
    id: `contact-${contactId}`,
    kind: "contact",
    cardIds: [`card-${contactId}`],
    summaryLine: "Jennifer — Scheduling Coordinator",
    primaryLine,
    contactId,
    bullets: [],
    evidenceQuotes: [],
    linkedFieldUpdateIds: [],
  };
}

function contactRow(id: string, disposition: DebriefProposedContactItem["disposition"]): DebriefProposedContactItem {
  return {
    id,
    firstName: "Jennifer",
    lastName: "Miller",
    displayName: "Jennifer Miller",
    email: "",
    phone: "",
    notes: "",
    contactTypeId: "scheduler",
    contactTypeLabel: "Scheduler",
    ownershipType: "provider",
    ownershipLabel: "Provider office team",
    workflowResponsibilityId: "observation_scheduling_owner",
    workflowLabel: "Observation scheduling",
    roleLabel: "Scheduling Coordinator",
    sourceQuote: "Jennifer handles scheduling",
    sourceReference: "test",
    linkedContactId: null,
    linkedContactName: null,
    intelligenceDbKey: "provider_scheduling_contact",
    discoverySignalId: "scheduling_owner",
    disposition,
    contactDetailsMissing: true,
    mentionLevel: "workflow_participant",
  };
}

describe("debriefReviewDecisionOutcomes", () => {
  it("includes pending contacts and excludes skipped contacts", () => {
    const outcomes = filterDecisionRequiredOutcomes({
      outcomes: [contactOutcome("c1"), contactOutcome("c2")],
      proposedContacts: [contactRow("c1", "pending"), contactRow("c2", "skipped")],
    });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.contactId).toBe("c1");
  });

  it("resolves UF contact ids via proposed contact name when ids differ", () => {
    const outcomes = filterDecisionRequiredOutcomes({
      outcomes: [contactOutcome("uf:capture-1", "Jennifer")],
      proposedContacts: [contactRow("contact-0", "pending")],
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.contactId).toBe("uf:capture-1");
  });

  it("detects open decisions from contacts or conflicts", () => {
    expect(
      hasOpenReviewDecisions({
        outcomes: [contactOutcome("c1")],
        proposedContacts: [contactRow("c1", "pending")],
        unresolvedConflictCount: 0,
      }),
    ).toBe(true);
    expect(
      hasOpenReviewDecisions({
        outcomes: [],
        proposedContacts: [],
        unresolvedConflictCount: 1,
      }),
    ).toBe(true);
    expect(
      hasOpenReviewDecisions({
        outcomes: [contactOutcome("c1")],
        proposedContacts: [contactRow("c1", "skipped")],
        unresolvedConflictCount: 0,
      }),
    ).toBe(false);
  });

  it("does not hide a contact outcome when saved proposed-contact metadata is missing", () => {
    const outcomes = filterDecisionRequiredOutcomes({
      outcomes: [contactOutcome("missing-contact", "Jennifer Reynolds")],
      proposedContacts: [],
    });

    expect(outcomes).toHaveLength(0);
  });
});

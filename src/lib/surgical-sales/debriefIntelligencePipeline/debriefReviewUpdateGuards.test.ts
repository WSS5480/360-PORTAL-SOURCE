import { describe, expect, it } from "vitest";

import {
  followUpSemanticDedupeKey,
  hasValidClinicalEvidence,
  isObservationReadinessFollowUp,
  personNamesReferToSameIndividual,
  shouldExcludeContactCandidate,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

describe("debriefReviewUpdateGuards", () => {
  it("matches Tom to Tom Sandy for provider exclusion", () => {
    expect(personNamesReferToSameIndividual("Tom", "Tom Sandy")).toBe(true);
    expect(
      shouldExcludeContactCandidate("Tom", {
        providerDisplayName: "Tom Sandy",
      }).exclude,
    ).toBe(true);
  });

  it("does not exclude Jennifer when provider is Tom Sandy", () => {
    expect(
      shouldExcludeContactCandidate("Jennifer", {
        providerDisplayName: "Tom Sandy",
        engagementParticipantNames: ["Tom Sandy"],
      }).exclude,
    ).toBe(false);
  });

  it("dedupes Jennifer contact follow-up intents", () => {
    expect(followUpSemanticDedupeKey("Get Jennifer's phone or email.")).toBe(
      "task:contact_info:jennifer",
    );
    expect(
      followUpSemanticDedupeKey("Identify Jennifer's contact information"),
    ).toBe("task:contact_info:jennifer");
    expect(
      followUpSemanticDedupeKey(`Identify Jennifer\u2019s contact information`),
    ).toBe("task:contact_info:jennifer");
  });

  it("treats credentialing pathway and identify-upcoming-cases intents as distinct from observation scheduling follow-ups", () => {
    expect(isObservationReadinessFollowUp("Confirm the credentialing pathway")).toBe(false);
    expect(
      isObservationReadinessFollowUp(
        "Better understand what upcoming robotic hernia cases might be available for observation",
      ),
    ).toBe(false);
    expect(isObservationReadinessFollowUp("Confirm observation approval timing")).toBe(true);
  });

  it("rejects clinical facts without anchored evidence", () => {
    const fact: DebriefAtomicFact = {
      fact_type: "clinical_focus",
      entity: "",
      attribute: "procedure",
      value: "Robotic ventral hernia discussed",
      confidence: "medium",
      evidence: "invented sentence not in dictation at all",
    };
    expect(
      hasValidClinicalEvidence(
        fact,
        "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately.",
      ),
    ).toBe(false);
  });
});

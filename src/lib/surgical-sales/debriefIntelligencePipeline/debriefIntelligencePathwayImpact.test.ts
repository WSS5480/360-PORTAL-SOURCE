import { describe, expect, it } from "vitest";

import {
  attachPathwayImpactToOutcomes,
  pathwayImpactForBriefOutcome,
  pathwayImpactForClinicalInsight,
  pathwayImpactForFollowUpAction,
  pathwayImpactForObservationCard,
  PATHWAY_IMPACT_LABEL,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";

describe("debriefIntelligencePathwayImpact", () => {
  it("maps observation approval to scheduling progression", () => {
    expect(
      pathwayImpactForObservationCard({
        observationStatus: "Interested",
        approval: "Approved",
        credentialing: "Complete",
      }),
    ).toBe("Provider can advance toward observation scheduling.");
  });

  it("maps credentialing requirement to vendor clearance dependency", () => {
    expect(
      pathwayImpactForObservationCard({
        observationStatus: "Interested",
        approval: "Not yet approved",
        credentialing: "Required",
      }),
    ).toBe("Access remains dependent on vendor clearance.");
  });

  it("maps scheduling coordinator contact to logistics coordination", () => {
    const outcome: IntelligenceBriefOutcome = {
      id: "contact-1",
      kind: "contact",
      cardIds: ["card-1"],
      summaryLine: "Jennifer — Scheduling Coordinator",
      subtitle: "Scheduling Coordinator",
      bullets: [],
      evidenceQuotes: [],
      linkedFieldUpdateIds: [],
    };
    expect(pathwayImpactForBriefOutcome(outcome)).toBe(
      "Observation logistics can now be coordinated.",
    );
  });

  it("maps clinical frustration to product opportunity", () => {
    expect(pathwayImpactForClinicalInsight("Clinical Frustration")).toBe(
      "Potential future product opportunity.",
    );
  });

  it("maps contact-info follow-up to logistics unlock", () => {
    expect(
      pathwayImpactForFollowUpAction("Identify Jennifer's phone or email"),
    ).toBe("Completing this step unlocks observation logistics.");
  });

  it("attaches pathway impact lines to brief outcomes", () => {
    const outcomes: IntelligenceBriefOutcome[] = [
      {
        id: "clinical-1",
        kind: "clinical_insight",
        cardIds: ["card-2"],
        summaryLine: "Clinical Frustration Identified — OR turnover delays",
        primaryLine: "OR turnover delays",
        subtitle: "Clinical Frustration",
        bullets: [],
        evidenceQuotes: [],
        linkedFieldUpdateIds: [],
      },
    ];

    const enriched = attachPathwayImpactToOutcomes(outcomes);
    expect(enriched[0]?.pathwayImpactLine).toBe("Potential future product opportunity.");
  });

  it("exports Impact label for UI", () => {
    expect(PATHWAY_IMPACT_LABEL).toBe("Impact");
  });
});

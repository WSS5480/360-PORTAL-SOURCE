import { describe, expect, it } from "vitest";

import {
  DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS,
  type DebriefExtractionScenario,
} from "@/lib/surgical-sales/debriefExtractionRegressionFixtures";
import {
  allRepFriendlyEvidenceAnchoredInDictation,
  contactMentionLevels,
  runDebriefExtractionPipeline,
} from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { debriefSignalMustNotAdvancePathway } from "@/lib/surgical-sales/pathway/pathwayStageAdvancement";

function runScenario(scenario: DebriefExtractionScenario) {
  return runDebriefExtractionPipeline({
    dictation: scenario.dictation,
    mapping: scenario.mapping,
    recommendedNextMoves: scenario.recommendedNextMoves,
  });
}

describe("debrief extraction regression — dictation styles", () => {
  it.each(DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.map((s) => [s.id, s] as const))(
    "%s (%s)",
    (_id, scenario) => {
      const result = runScenario(scenario);
      const exp = scenario.expect;

      expect(result.classifiedOutcomeId, "outcome classification").toBe(exp.outcomeId);
      if (exp.rationaleIncludes) {
        expect(result.classifiedRationale).toMatch(exp.rationaleIncludes);
      }

      expect(result.observationApprovalExplicit, "observation approval explicit flag").toBe(
        exp.observationApprovalExplicit,
      );
      expect(result.providerObservationStatus, "provider observation sync status").toBe(
        exp.providerObservationStatus,
      );

      if (exp.pathwayUnchangedByDebriefAlone) {
        expect(result.pathwayStageBefore, "pathway before").toBe("discovery");
        expect(result.pathwayStageAfterDebriefAlone, "pathway unchanged by debrief alone").toBe(
          result.pathwayStageBefore,
        );
        expect(result.engagementOutcomeAdvancesPathway, "outcome never auto-advances pathway").toBe(
          false,
        );
      }

      if (exp.pathwayAfterApprovalOnFile) {
        expect(result.pathwayStageAfterExplicitApprovalOnFile).toBe(exp.pathwayAfterApprovalOnFile);
      }

      expect(result.proposedContacts.length).toBeGreaterThanOrEqual(exp.minProposedContacts ?? 0);
      if (exp.maxProposedContacts != null) {
        expect(result.proposedContacts.length).toBeLessThanOrEqual(exp.maxProposedContacts);
      }

      if (exp.contactMentionLevels?.length) {
        const levels = contactMentionLevels(result.proposedContacts);
        for (const level of exp.contactMentionLevels) {
          expect(levels, `contact mention level ${level}`).toContain(level);
        }
      }

      if (exp.anyContactDetailsMissing) {
        expect(
          result.proposedContacts.some((c) => c.contactDetailsMissing),
          "at least one contact missing details",
        ).toBe(true);
      }

      if (exp.allContactsHaveEmailOrPhone) {
        for (const c of result.proposedContacts) {
          expect(Boolean(c.email.trim()) || Boolean(c.phone.trim()), c.displayName).toBe(true);
        }
      }

      for (const cat of exp.categoriesMustInclude) {
        expect(result.primaryCategories, `category includes ${cat}`).toContain(cat);
      }
      for (const cat of exp.categoriesMustExclude ?? []) {
        expect(result.primaryCategories, `category excludes ${cat}`).not.toContain(cat);
      }

      for (const kind of exp.signalKindsMustInclude ?? []) {
        expect(result.signalKinds, `signal kind includes ${kind}`).toContain(kind);
      }
      for (const kind of exp.signalKindsMustExclude ?? []) {
        expect(result.signalKinds, `signal kind excludes ${kind}`).not.toContain(kind);
      }

      const updateCount = result.extraction.intelligenceUpdates.length;
      if (exp.minIntelligenceUpdates != null) {
        expect(updateCount).toBeGreaterThanOrEqual(exp.minIntelligenceUpdates);
      }

      if (exp.minRepFriendlyUpdates != null) {
        expect(result.repFriendlyUpdateCount).toBeGreaterThanOrEqual(exp.minRepFriendlyUpdates);
      }

      if (exp.anyConfidence?.length) {
        expect(
          result.confidenceLabels.some((c) => exp.anyConfidence!.includes(c)),
          "expected confidence tier present",
        ).toBe(true);
      }

      if (exp.allEvidenceAnchored && (exp.minRepFriendlyUpdates ?? 0) > 0) {
        expect(allRepFriendlyEvidenceAnchoredInDictation(result)).toBe(true);
      }

      if (exp.recommendedNextStepIncludes) {
        const combined = [
          ...result.recommendedNextSteps,
          ...(result.extraction.unresolvedItems ?? []),
          result.classifiedRationale,
        ].join(" ");
        if (typeof exp.recommendedNextStepIncludes === "string") {
          expect(combined.toLowerCase()).toContain(exp.recommendedNextStepIncludes.toLowerCase());
        } else {
          expect(combined).toMatch(exp.recommendedNextStepIncludes);
        }
      }

      for (const kind of ["interest_signal", "approval_signal", "inferred_signal"] as const) {
        if (result.signalKinds.includes(kind) && kind !== "approval_signal") {
          expect(debriefSignalMustNotAdvancePathway(kind)).toBe(true);
        }
      }
    },
  );
});

describe("debrief extraction regression — cross-cutting guardrails", () => {
  it("never auto-creates save-ready contacts without email or phone", () => {
    const result = runScenario(
      DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.find((s) => s.id === "mentioned_contact_no_info")!,
    );
    for (const c of result.proposedContacts) {
      if (c.mentionLevel !== "confirmed_support_contact") {
        expect(c.contactDetailsMissing || !c.email || !c.phone).toBeTruthy();
      }
    }
  });

  it("positive sentiment debrief does not set explicit observation approval", () => {
    const result = runScenario(
      DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.find((s) => s.id === "positive_no_approval")!,
    );
    expect(result.classifiedOutcomeId).toBe("follow_up_needed");
    expect(result.observationApprovalExplicit).toBe(false);
    expect(result.observationAccess.observationApprovalExplicit).toBe(false);
  });

  it("clear approval does not advance pathway until approval is validated on file", () => {
    const result = runScenario(
      DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.find((s) => s.id === "clear_approval")!,
    );
    expect(result.classifiedOutcomeId).toBe("observation_approved");
    expect(result.pathwayStageAfterDebriefAlone).toBe("discovery");
    expect(result.pathwayStageAfterExplicitApprovalOnFile).toBe("observe");
  });

  it("workflow-only debrief does not populate product fit category from friction alone", () => {
    const result = runScenario(
      DEBRIEF_EXTRACTION_REGRESSION_SCENARIOS.find((s) => s.id === "workflow_pain_no_product_fit")!,
    );
    expect(result.primaryCategories).not.toContain("product_fit_signals");
    const productRows = result.extraction.intelligenceUpdates.filter(
      (u) => u.primaryCategory === "product_fit_signals",
    );
    expect(productRows).toHaveLength(0);
  });
});

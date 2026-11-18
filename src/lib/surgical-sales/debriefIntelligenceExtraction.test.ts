import { describe, expect, it } from "vitest";

import {
  assertDebriefIntelligenceExtractionScenario,
  type DebriefIntelligenceExtractionScenario,
} from "@/lib/surgical-sales/debriefIntelligenceExtractionAssertions";
import { DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS } from "@/lib/surgical-sales/debriefIntelligenceExtractionScenarios";
import {
  contactMentionLevels,
  runDebriefExtractionPipeline,
} from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { contactsReadyToPersist } from "@/lib/surgical-sales/debriefDetectedContact";
import { buildDebriefReviewSections } from "@/lib/surgical-sales/buildDebriefReviewSections";
import { DEBRIEF_REVIEW_UPDATE_DESTINATION_LABELS } from "@/lib/surgical-sales/debriefReviewPropagation";
import { debriefSignalMustNotAdvancePathway } from "@/lib/surgical-sales/pathway/pathwayStageAdvancement";

function runScenario(scenario: DebriefIntelligenceExtractionScenario) {
  return runDebriefExtractionPipeline({ dictation: scenario.dictation });
}

describe("debrief intelligence extraction — dictation style scenarios", () => {
  it.each(DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS.map((s) => [s.id, s] as const))(
    "%s (%s)",
    (_id, scenario) => {
      const result = runScenario(scenario);
      assertDebriefIntelligenceExtractionScenario(result, scenario.expect);
    },
  );
});

describe("debrief intelligence extraction — global pass criteria", () => {
  it.each(DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS.map((s) => [s.id, s] as const))(
    "%s preserves names and separates interest from approval",
    (_id, scenario) => {
      const result = runScenario(scenario);

      expect(result.observationApprovalExplicit, "never marks observation approved implicitly").toBe(
        scenario.expect.observationApprovalExplicit,
      );
      expect(result.pathwayStageAfterDebriefAlone, "stage remains discovery").toBe("discovery");

      for (const signal of result.signalKinds) {
        if (signal !== "approval_signal") {
          expect(debriefSignalMustNotAdvancePathway(signal)).toBe(true);
        }
      }

      const sections = buildDebriefReviewSections(result.extraction);

      for (const update of sections.intelligenceCaptured) {
        expect(update.learned.trim()).not.toHaveLength(0);
        const evidence = update.evidenceQuotes?.[0]?.trim() || update.evidenceQuote.trim();
        expect(evidence).not.toHaveLength(0);
        expect(update.confidence).toMatch(/^(High|Medium|Low)$/);
        expect(Object.values(DEBRIEF_REVIEW_UPDATE_DESTINATION_LABELS)).toContain(update.updateLine);
        expect(update.updateLine).not.toMatch(/→|Intelligence\b|operational understanding|deployment gates|readiness signals/i);
      }

      for (const action of sections.recommendedActions) {
        expect(action.body.trim()).not.toHaveLength(0);
        if (action.kind === "create_workflow_contact") {
          expect(action.participantName?.trim()).not.toHaveLength(0);
        }
      }
    },
  );

  it.each(DEBRIEF_INTELLIGENCE_EXTRACTION_SCENARIOS.map((s) => [s.id, s] as const))(
    "%s separates workflow participants from auto-confirmed support contacts",
    (_id, scenario) => {
      const result = runScenario(scenario);
      const levels = contactMentionLevels(result.proposedContacts);

      for (const contact of result.proposedContacts) {
        const hasContactInfo = Boolean(contact.email.trim() || contact.phone.trim());
        if (!hasContactInfo) {
          expect(contact.mentionLevel).not.toBe("confirmed_support_contact");
        }
        if (contact.mentionLevel === "workflow_participant") {
          expect(contact.contactDetailsMissing).toBe(true);
        }
      }

      expect(contactsReadyToPersist(result.proposedContacts)).toHaveLength(0);

      if (scenario.expect.namedParticipants?.some((p) => p.mentionLevels.includes("potential_support_contact"))) {
        expect(levels).toContain("potential_support_contact");
      } else if ((scenario.expect.minProposedContacts ?? 0) > 0) {
        expect(
          levels.every(
            (l) =>
              l === "workflow_participant" ||
              l === "mentioned_person" ||
              l === "potential_support_contact",
          ),
        ).toBe(true);
      }
    },
  );
});

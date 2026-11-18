import { describe, expect, it } from "vitest";

import {
  buildInitialProposedContacts,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildParseResultFromDebriefFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { buildRegressionAtomicFactsFromDictation } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefRegressionAtomicFactStandIn";
import { ENGAGEMENT_OUTCOME_LABELS } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import { buildEngagementCompletedSummary } from "@/lib/surgical-sales/engagements/buildEngagementDetailHub";
import { buildDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { buildEngagementDebriefVisitPersistFields } from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import { readDebriefNextStepFromSnapshot } from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";
import { buildStoredTacticalDebriefNotes } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { simulateDebriefReviewOutcomeAcceptance } from "@/lib/surgical-sales/simulateDebriefReviewOutcomeAcceptance";
import { PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS } from "@/lib/surgical-sales/intelligenceScopeInference";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

const PROVIDER_ID = "00000000-0000-4000-8000-000000000099";

function parseTomSandyDictation() {
  const facts = buildRegressionAtomicFactsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
  return buildParseResultFromDebriefFacts({
    sourceText: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
    facts,
    context: {
      providerId: PROVIDER_ID,
      writableFieldKeys: [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
    },
    existingFields: {},
    mappingSource: "regression_stand_in",
  });
}

describe("buildEngagementDebriefVisitPersistFields", () => {
  it("supersedes No Meaningful Update with follow-ups after full Tom Sandy debrief save", () => {
    const parse = parseTomSandyDictation();
    const proposedContacts = buildInitialProposedContacts({
      review: parse,
      sourceReference: "test",
    });
    const extraction = buildDebriefIntelligenceExtractionReview({
      review: parse,
      proposedContacts,
      sourceReference: "test",
    });
    const guardContext = buildDebriefReviewDecisionContext({
      providerLabel: "Tom Sandy",
      providerContact: { first_name: "Tom", last_name: "Sandy" },
    });
    const logUpdate = simulateDebriefReviewOutcomeAcceptance({
      review: parse,
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      extraction,
      proposedContacts,
      guardContext,
    });

    const snapshot = buildDebriefIntelligenceSnapshot({
      narrative: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      analysis: null,
      logUpdate,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: { first_name: "Tom", last_name: "Sandy" },
      proposedContacts,
      savedAt: "2026-06-04T12:00:00.000Z",
    });

    const existingDebriefSnapshot = {
      start_mission: {
        opened_at: "2026-06-04T11:00:00.000Z",
        live_notes: "Quick tap — no update",
        outcome_id: "no_meaningful_update",
        outcome_label: ENGAGEMENT_OUTCOME_LABELS.no_meaningful_update,
        outcome_recorded_at: "2026-06-04T11:05:00.000Z",
      },
    };

    const visit = buildEngagementDebriefVisitPersistFields({
      snapshot,
      narrative: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      engagementType: "follow_up",
      existingNextAction: ENGAGEMENT_OUTCOME_LABELS.no_meaningful_update,
      existingDebriefSnapshot,
      logUpdate,
      proposedContacts,
      providerContact: { first_name: "Tom", last_name: "Sandy" },
      providerLabel: "Tom Sandy",
    });

    expect(visit.next_action).toBe(ENGAGEMENT_OUTCOME_LABELS.follow_up_needed);
    expect(visit.follow_up_tasks).toBeTruthy();
    expect(visit.follow_up_tasks!.split("\n").length).toBeGreaterThanOrEqual(2);

    const notes = buildStoredTacticalDebriefNotes({
      narrative: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      insights: undefined,
    });

    const summary = buildEngagementCompletedSummary({
      status: "completed",
      debrief_completed: true,
      debrief_completed_at: "2026-06-04T12:00:00.000Z",
      next_action: visit.next_action,
      follow_up_tasks: visit.follow_up_tasks,
      notes,
      debrief_intelligence_snapshot: visit.debrief_intelligence_snapshot,
    });

    expect(summary.outcome).toBe(ENGAGEMENT_OUTCOME_LABELS.follow_up_needed);
    expect(summary.nextStep).toBeTruthy();
    expect(summary.nextStep).not.toBe(ENGAGEMENT_OUTCOME_LABELS.no_meaningful_update);
  });

  it("persists debrief completion extras from existingDebriefSnapshot onto visit record", () => {
    const snapshot = buildDebriefIntelligenceSnapshot({
      narrative: "Provider agreed to schedule an evaluation case next month.",
      analysis: null,
      logUpdate: null,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: null,
      proposedContacts: [],
      savedAt: "2026-06-16T12:00:00.000Z",
    });

    const existingDebriefSnapshot = {
      debrief_next_step: {
        recommendation: "evaluation",
        label: "Evaluation Case",
        opportunity_strength: "high",
        provider_interest: "interested",
        reason: "Provider agreed to evaluation.",
        recorded_at: "2026-06-16T12:00:00.000Z",
      },
      debrief_completion_context: {
        loadedAt: "2026-06-16T12:00:00.000Z",
        completedObservationCount: 5,
        isPostObservationProviderDebrief: true,
        hypothesisText: "",
        desiredOutcome: null,
        desiredOutcomeOther: "",
        primaryHypothesisPattern: null,
        observationPatterns: [],
      },
    };

    const visit = buildEngagementDebriefVisitPersistFields({
      snapshot,
      narrative: "Provider agreed to schedule an evaluation case next month.",
      engagementType: "provider_debrief",
      existingDebriefSnapshot,
    });

    expect(readDebriefNextStepFromSnapshot(visit.debrief_intelligence_snapshot)?.recommendation).toBe(
      "evaluation",
    );
  });
});

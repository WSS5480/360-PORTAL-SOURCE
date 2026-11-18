import { describe, expect, it } from "vitest";
import {
  buildDebriefIntelligenceSnapshot,
  buildDebriefReviewHref,
  buildFieldEvidenceFromLogUpdate,
  parseDebriefIntelligenceSnapshot,
  sanitizeDebriefSnapshotRecordForPersist,
} from "./debriefIntelligenceSnapshot";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import type { TacticalDebriefAnalysis } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

describe("debriefIntelligenceSnapshot", () => {
  it("builds review href with mode=review when debrief is complete", () => {
    expect(buildDebriefReviewHref("/portal/sales/engagements/e1/prepare", true)).toBe(
      "/portal/sales/engagements/e1/debrief?mode=review",
    );
    expect(buildDebriefReviewHref("/portal/sales/engagements/e1/prepare", false)).toBe(
      "/portal/sales/engagements/e1/debrief",
    );
  });

  it("round-trips snapshot v1", () => {
    const snapshot = buildDebriefIntelligenceSnapshot({
      narrative: "Karen coordinates scheduling.",
      analysis: null,
      logUpdate: null,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: null,
      proposedContacts: [],
      savedAt: "2026-05-27T12:00:00.000Z",
    });
    expect(parseDebriefIntelligenceSnapshot(snapshot)?.narrative).toBe(
      "Karen coordinates scheduling.",
    );
  });

  it("strips inline universal fact runs from persisted snapshot payloads", () => {
    const logUpdate = {
      sourceText: "Volume is increasing.",
      suggestedUpdates: [],
      fieldUpdates: [],
      intelligenceReview: {
        confirmedUpdates: [],
        partiallyConfirmed: [],
        stillWorthConfirming: [],
        relatedOperationalAreas: [],
      },
      stillMissing: [],
      saveAsNoteAccepted: true,
      usesProviderIntelligence: true,
      debriefUniversalFactsRuns: [
        {
          capture_id: "capture-1",
          declared_source_type: "debrief_note",
          extraction_model: "universal-surgical-rules-v1",
          created_at: "2026-06-15T12:00:00.000Z",
          operational_note_id: null,
          facts: [
            {
              id: "fact-1",
              capture_id: "capture-1",
              provider_id: "provider-1",
              organization_id: null,
              case_id: null,
              encounter_id: "engagement-1",
              suppressed: false,
              created_at: "2026-06-15T12:00:00.000Z",
              concept: "procedure_volume_trend",
              normalized_label: "Procedure volume is increasing",
              assertion_level: "provider_reported",
              source_type: "debrief_note",
              evidence_text: "volume keeps going up",
              confidence: "high",
              negated: false,
              uncertain: false,
            },
          ],
        },
      ],
    } as LogUpdateParseResult;

    const analysis: TacticalDebriefAnalysis = {
      insights: [],
      summary: "",
      signal_count: 0,
      sections: [],
      log_update: logUpdate,
    };

    const snapshot = buildDebriefIntelligenceSnapshot({
      narrative: "Volume is increasing.",
      analysis,
      logUpdate,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: null,
      proposedContacts: [],
    });

    const payload = {
      debrief_intelligence_snapshot: sanitizeDebriefSnapshotRecordForPersist({
        ...snapshot,
        visitOutcome: {
          outcomeId: "follow_up_needed",
          label: "Follow-up needed",
          rationale: "test",
          recordedAt: snapshot.savedAt,
        },
      }),
    };

    expect(snapshot.logUpdate?.debriefUniversalFactsRuns).toBeUndefined();
    expect(snapshot.analysis?.log_update?.debriefUniversalFactsRuns).toBeUndefined();
    expect(assertNoForbiddenPatientPayloadKeys(payload)).toBeNull();
  });

  it("extracts field evidence from accepted log update fields", () => {
    const evidence = buildFieldEvidenceFromLogUpdate({
      usesProviderIntelligence: true,
      sourceText: "raw",
      fieldUpdates: [
        {
          id: "ai-partial-0",
          accepted: true,
          dbKey: "provider_scheduling_owner",
          label: "Scheduling owner",
          proposedValue: "Karen",
          currentValue: null,
        },
      ],
      saveAsNoteAccepted: false,
      aiMapping: {
        confirmed_updates: [],
        partial_updates: [
          {
            domain: "scheduling_workflow",
            field: "provider_scheduling_owner",
            value: "Karen",
          },
        ],
        operational_signals: [
          {
            domain: "scheduling_workflow",
            signal: "Scheduling coordination",
            evidence: "Karen appears involved in scheduling.",
          },
        ],
      },
    } as never);
    expect(evidence.provider_scheduling_owner).toBe("Karen appears involved in scheduling.");
  });

  it("falls back to Source line in proposed partial value", () => {
    const evidence = buildFieldEvidenceFromLogUpdate({
      usesProviderIntelligence: true,
      sourceText: "raw",
      fieldUpdates: [
        {
          id: "ai-partial-0",
          accepted: true,
          dbKey: "provider_scheduling_contact",
          label: "Scheduling",
          proposedValue:
            '[Partial lead] Karen\n\nKaren coordinates scheduling.\n\nSource: "Karen helps coordinate scheduling."',
          currentValue: null,
        },
      ],
      saveAsNoteAccepted: false,
      aiMapping: null,
    } as never);
    expect(evidence.provider_scheduling_contact).toBe("Karen helps coordinate scheduling.");
  });
});

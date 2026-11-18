import { describe, expect, it } from "vitest";

import {
  buildDebriefIntelligenceSnapshot,
  parseDebriefIntelligenceSnapshot,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

describe("debriefIntelligenceSnapshot universalFactCaptureId", () => {
  it("round-trips capture_id while stripping inline UF runs from persisted snapshot", () => {
    const logUpdate = {
      sourceText: "Volume is increasing on robotic ventral hernia repairs.",
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
          capture_id: "capture-persist-1",
          declared_source_type: "debrief_note",
          extraction_model: "universal-surgical-rules-v1",
          created_at: "2026-06-15T12:00:00.000Z",
          operational_note_id: null,
          facts: [
            {
              id: "fact-1",
              capture_id: "capture-persist-1",
              provider_id: null,
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

    const snapshot = buildDebriefIntelligenceSnapshot({
      narrative: logUpdate.sourceText,
      analysis: null,
      logUpdate,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: null,
      proposedContacts: [],
      universalFactCaptureId: "capture-persist-1",
    });

    expect(snapshot.universalFactCaptureId).toBe("capture-persist-1");
    expect(snapshot.logUpdate?.debriefUniversalFactsRuns).toBeUndefined();

    const parsed = parseDebriefIntelligenceSnapshot(snapshot);
    expect(parsed?.universalFactCaptureId).toBe("capture-persist-1");
    expect(parsed?.logUpdate?.debriefUniversalFactsRuns).toBeUndefined();
  });
});

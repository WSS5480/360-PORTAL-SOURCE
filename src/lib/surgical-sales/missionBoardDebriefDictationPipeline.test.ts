import { describe, expect, it } from "vitest";
import { finalizeMissionBoardDebriefLogUpdate } from "./missionBoardDebriefDictationPipeline";
import { buildPostDebriefDictationPathwayGate } from "./missionBoardDebriefDictationRegression";
import type { LogUpdateParseResult } from "./logUpdateParseFreeform";

function reviewWithFieldUpdates(): LogUpdateParseResult {
  return {
    sourceText: "Provider confirmed workflow issue and wants a trial.",
    usesProviderIntelligence: true,
    fieldUpdates: [
      {
        id: "clinical_focus",
        dbKey: "provider_clinical_focus",
        label: "Clinical focus",
        proposedValue: "Workflow friction",
        accepted: false,
      },
    ],
    insights: [],
    conflicts: [],
    intelligenceReview: {
      stillWorthConfirming: [],
      relatedSignals: [],
    },
    stillMissing: [],
    suggestedUpdates: [],
    saveAsNote: { accepted: false },
  } as LogUpdateParseResult;
}

describe("finalizeMissionBoardDebriefLogUpdate", () => {
  it("auto-accepts field patches by default", () => {
    const { logUpdate } = finalizeMissionBoardDebriefLogUpdate({
      parse: reviewWithFieldUpdates(),
      dictation: "Provider confirmed workflow issue and wants a trial.",
      pathwayGate: buildPostDebriefDictationPathwayGate({}),
    });

    expect(logUpdate.fieldUpdates.some((row) => row.accepted)).toBe(true);
  });

  it("does not auto-accept when skipAutoAccept is true", () => {
    const { logUpdate } = finalizeMissionBoardDebriefLogUpdate({
      parse: reviewWithFieldUpdates(),
      dictation: "Provider confirmed workflow issue and wants a trial.",
      pathwayGate: buildPostDebriefDictationPathwayGate({}),
      skipAutoAccept: true,
    });

    expect(logUpdate.fieldUpdates.every((row) => !row.accepted)).toBe(true);
  });
});

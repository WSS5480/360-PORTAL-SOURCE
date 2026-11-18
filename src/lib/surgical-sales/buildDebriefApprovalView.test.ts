import { describe, expect, it } from "vitest";
import { buildDebriefApprovalView } from "@/lib/surgical-sales/buildDebriefApprovalView";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";

function baseReview(overrides: Partial<LogUpdateParseResult> = {}): LogUpdateParseResult {
  return {
    sourceText: "They do robotic cases. Still need scheduler name.",
    usesProviderIntelligence: true,
    saveAsNoteAccepted: true,
    fieldUpdates: [],
    suggestedUpdates: [],
    intelligenceReview: {
      confirmedUpdates: [],
      partiallyConfirmed: [],
      stillWorthConfirming: [],
      relatedOperationalAreas: [],
    },
    aiMapping: null,
    ...overrides,
  };
}

const aiMapping: LogUpdateOpenAiMapping = {
  summary: "Robotic mix mentioned; scheduler unknown.",
  confidence: "medium",
  reasoning: "Note states robotic cases",
  source_scope: "provider visit",
  operational_signals: [
    {
      domain: "case_mix",
      signal: "Robotic procedures mentioned",
      confidence: "medium",
      evidence: "They do robotic cases",
      operational_meaning: "Procedure mix includes robotic",
      save_target: "provider",
      reasoning: "Stated in note",
      source_scope: "provider",
    },
    {
      domain: "scheduling",
      signal: "Scheduler not identified",
      confidence: "low",
      evidence: "Still need scheduler name",
      operational_meaning: "Scheduling contact unknown",
      save_target: "organization",
      reasoning: "Gap stated",
      source_scope: "organization",
    },
  ],
  confirmed_updates: [],
  partial_updates: [
    {
      label: "Procedure mix",
      value: "Open, lap, and robotic mentioned",
      still_needs: ["Detailed breakdown"],
      confidence: "medium",
      domain: "case_mix",
      save_target: "provider",
      reasoning: "Partial mapping",
    },
  ],
  still_to_validate: [
    {
      question: "Scheduler name",
      domain: "scheduling",
      priority: "high",
      save_target: "organization",
    },
  ],
  recommended_next_moves: [
    {
      action: "Schedule follow-up to close the deal",
      owner_type: "rep",
      priority: "high",
      save_target: "engagement",
    },
  ],
  do_not_update: [],
};

describe("buildDebriefApprovalView", () => {
  it("maps signals, status updates, gaps — not next-move strategy", () => {
    const view = buildDebriefApprovalView(
      baseReview({
        aiMapping,
        fieldUpdates: [
          {
            id: "ai-partial-0",
            label: "Procedure mix",
            dbKey: "provider_procedure_mix",
            proposedValue: "Open, lap, robotic",
            accepted: true,
            conflict: null,
            proposedDestination: "provider",
            destinationReason: "",
            scopeReason: "",
            proposedScope: "provider",
          },
        ],
      }),
    );

    const signalTexts = view.signalsDetected.map((s) => s.text);
    expect(signalTexts.some((t) => /robotic/i.test(t))).toBe(true);
    expect(signalTexts.some((t) => /scheduler/i.test(t))).toBe(true);
    // Rep-facing status display uses business language — never "partial".
    expect(
      view.suggestedUpdates.some(
        (u) => u.label === "Procedure mix" && u.statusDisplay === "Needs confirmation",
      ),
    ).toBe(true);
    expect(view.stillMissing.some((m) => /scheduler/i.test(m.text))).toBe(true);
    expect(view.stillMissing.some((m) => /follow-up to close/i.test(m.text))).toBe(false);
    expect(view.saveItems).toHaveLength(1);
  });
});

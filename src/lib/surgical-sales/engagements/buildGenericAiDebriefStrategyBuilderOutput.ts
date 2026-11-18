/**
 * Generic Observation Debrief coaching plan when AI is unavailable or intelligence is thin.
 */

import type { AiDebriefStrategyBuilderOutput } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";

export function buildGenericAiDebriefStrategyBuilderOutput(input: {
  providerName: string | null;
  completedObservationCount: number;
}): AiDebriefStrategyBuilderOutput {
  const providerLabel = input.providerName?.trim() || "the surgeon";
  const count = Math.max(0, input.completedObservationCount);

  const observationLine =
    count === 0
      ? "You do not have completed observation notes on file yet — use the debrief to align on what to watch for next."
      : count === 1
        ? "You have one completed observation — treat takeaways as early signals until the surgeon confirms them."
        : `${count} completed observations on file — validate whether the patterns you saw are real priorities for ${providerLabel}.`;

  return {
    debriefMission: `Use this debrief with ${providerLabel} to validate what you observed in the OR and decide whether a commercial next step is warranted.`,
    whatWeThinkWeLearned: [
      observationLine,
      "Focus on workflow moments the surgeon would recognize — not every field note needs to be discussed.",
      "You still need the surgeon's read on whether what you saw matters enough to act on.",
    ],
    primaryHypothesis:
      "There may be workflow value to explore, but evidence is not strong enough yet to recommend a product or program change without surgeon confirmation.",
    recommendedProductAngle: {
      productName: null,
      fitLevel: "none",
      why: "Observation detail is too limited to recommend a specific product angle in the room.",
      risk: "Positioning product before workflow value is confirmed will feel premature.",
    },
    conversationStrategy: {
      opening: `I'd like to start with what stood out to you from the cases we observed — does that match how you experience these procedures?`,
      validateObservationQuestions: [
        "When you think about the workflow we observed, does that match how you experience these cases?",
        "Which moments, if any, felt different from your usual routine?",
      ],
      impactQuestions: [
        "When those moments come up, how do they affect the flow of the procedure or the team's work?",
        "Is anything you observed painful enough that you would prioritize fixing it if you could?",
      ],
      opennessToChangeQuestions: [
        "If we confirmed a real workflow issue, would you be open to exploring a change — or is the current approach good enough?",
        "What would you need to see before considering a different approach?",
      ],
      closingQuestion:
        "Before we wrap, which next step feels right — a 360 Experience, Case Commitment, or staying put for now?",
    },
    recommendedAdvancementPath: {
      path: count >= 3 ? "360 Experience" : "No Action",
      why:
        count >= 3
          ? "You have enough observation touchpoints to explore workflow value in a lower-commitment 360 Experience before asking for cases."
          : "Hold commercial next steps until you validate observed workflow and the surgeon sees enough value to move.",
    },
    desiredOutcome: `Leave with clarity on whether the workflow issue is worth acting on. If yes, agree on 360 Experience, Case Commitment, or No Action — and schedule the follow-up.`,
  };
}

export function shouldUseGenericDebriefStrategy(input: {
  planMode: "generic" | "intelligence";
  completedObservationCount: number;
  observationNotes: string[];
  commercialSynthesis?: { hasSubstantiveEvidence: boolean };
}): boolean {
  if (input.planMode === "generic") return true;

  const hasNotes = input.observationNotes.length > 0;
  const hasEvidence = input.commercialSynthesis?.hasSubstantiveEvidence ?? hasNotes;

  if (input.completedObservationCount === 0 && !hasNotes && !hasEvidence) return true;

  return false;
}

/**
 * Separates incumbent product presence from true competitive displacement opportunity.
 * Used by the deterministic Commercial Readiness Framework.
 */

import type { DebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

const INCUMBENT_NEGATIVE_PATTERN =
  /\b(?:frustrat\w*|dissatisf\w*|unhappy|complain\w*|concern\w*|problem\w*|issue\w*|inadequate|poor|worse|worsen\w*|struggl\w*|difficult\w*|slow(?:ed|s)?|delay\w*|worr\w*)\b/i;

const SWITCHING_SIGNAL_PATTERN =
  /\b(?:switch(?:ing)?|alternative|evaluate|evaluat\w*|compare|comparison|replace(?:ment)?|change\s+(?:tray|product|mesh|vendor)|open\s+to\s+(?:change|try))\b/i;

export type CompetitiveDisplacementSignals = {
  incumbentPresenceScore: number;
  displacementOpportunityScore: number;
  totalScore: number;
  incumbentSummaries: string[];
  displacementEvidence: string[];
  hasIncumbentPresence: boolean;
  hasIncumbentDissatisfaction: boolean;
  hasSwitchingSignal: boolean;
};

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function competitorTokens(synthesis: DebriefCommercialSynthesis): string[] {
  const tokens = new Set<string>();

  for (const competitor of synthesis.competitorUsage) {
    const summary = competitor.summary.toLowerCase();
    for (const match of summary.match(/\b[a-z][a-z0-9]+(?:\s+[a-z][a-z0-9]+)?\b/g) ?? []) {
      if (match.length >= 4 && !["competitive", "product", "noted", "appeared", "observations"].includes(match)) {
        tokens.add(match);
      }
    }
  }

  return [...tokens];
}

function frustrationTargetsIncumbent(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  if (!/\bfrustrat\w*\b/.test(lower)) return false;

  const targetsIncumbent = /\bfrustrat\w*[^.]{0,80}\b(?:bard|mesh|tack|tray|competitor|rival)\b/i.test(
    lower,
  );
  const targetsWorkflowOnly =
    /\bfrustrat\w*[^.]{0,80}\b(?:visualization|fixation|view|closure)\b/i.test(lower) &&
    !targetsIncumbent;

  return targetsIncumbent && !targetsWorkflowOnly;
}

function mentionsIncumbentWithNegativeSentiment(text: string, incumbentTokens: string[]): boolean {
  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);

  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase();
    if (!INCUMBENT_NEGATIVE_PATTERN.test(normalized)) continue;

    const hasIncumbentReference =
      incumbentTokens.some((token) => normalized.includes(token)) ||
      /\b(?:bard(?:\s+mesh)?|competitor\s+mesh|mesh\s+tray|rival\s+product)\b/i.test(normalized);

    if (!hasIncumbentReference) continue;
    if (frustrationTargetsIncumbent(sentence) || !/\bfrustrat\w*\b/.test(normalized)) {
      return true;
    }
  }

  return false;
}

function collectDisplacementTexts(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
}): string[] {
  const texts = [
    ...input.observationNotes,
    ...input.synthesis.competitorUsage.map((item) => item.summary),
    ...input.plan.whatWeLearned
      .filter((item) =>
        ["competitive_usage", "clinical_pain_point", "workflow_friction"].includes(item.category),
      )
      .flatMap((item) => [item.signal, item.evidence].filter(Boolean) as string[]),
    ...input.synthesis.validationNeeds.map((item) => item.question),
  ];

  return texts.map(normalizeText).filter((text) => text.length >= 12);
}

export function scoreCompetitiveDisplacementSignals(input: {
  synthesis: DebriefCommercialSynthesis;
  plan: ProviderDebriefPlan;
  observationNotes: string[];
}): CompetitiveDisplacementSignals {
  const competitors = input.synthesis.competitorUsage;
  const competitiveLearnings = input.plan.whatWeLearned.filter(
    (item) => item.category === "competitive_usage",
  );
  const displacementTexts = collectDisplacementTexts(input);
  const incumbentTokens = competitorTokens(input.synthesis);

  let incumbentPresenceScore = 0;
  if (competitors.length > 0) incumbentPresenceScore += 8;
  if (competitors.some((item) => item.observationCount >= 2)) incumbentPresenceScore += 4;
  if (competitiveLearnings.length > 0) incumbentPresenceScore += 4;
  incumbentPresenceScore = Math.min(incumbentPresenceScore, 16);

  const hasIncumbentDissatisfaction = displacementTexts.some((text) =>
    mentionsIncumbentWithNegativeSentiment(text, incumbentTokens),
  );
  const hasSwitchingSignal = displacementTexts.some((text) => SWITCHING_SIGNAL_PATTERN.test(text));

  const hasWorkflowPainWithCompetitiveContext =
    input.plan.whatWeLearned.some(
      (item) =>
        ["clinical_pain_point", "workflow_friction"].includes(item.category) &&
        (item.evidence ?? item.signal),
    ) && competitors.length > 0;

  let displacementOpportunityScore = 10;
  if (hasIncumbentDissatisfaction) displacementOpportunityScore += 28;
  if (hasSwitchingSignal) displacementOpportunityScore += 12;
  if (hasWorkflowPainWithCompetitiveContext && !hasIncumbentDissatisfaction) {
    displacementOpportunityScore += 6;
  }

  const displacementEvidence = displacementTexts
    .filter(
      (text) =>
        mentionsIncumbentWithNegativeSentiment(text, incumbentTokens) ||
        SWITCHING_SIGNAL_PATTERN.test(text),
    )
    .slice(0, 4);

  const incumbentSummaries = [
    ...competitors.map((item) => item.summary),
    ...competitiveLearnings.map((item) => item.evidence ?? item.signal),
  ]
    .map(normalizeText)
    .filter((text) => text.length >= 12)
    .slice(0, 4);

  const totalScore = Math.min(100, incumbentPresenceScore + displacementOpportunityScore);

  return {
    incumbentPresenceScore,
    displacementOpportunityScore,
    totalScore,
    incumbentSummaries,
    displacementEvidence,
    hasIncumbentPresence: competitors.length > 0 || competitiveLearnings.length > 0,
    hasIncumbentDissatisfaction,
    hasSwitchingSignal,
  };
}

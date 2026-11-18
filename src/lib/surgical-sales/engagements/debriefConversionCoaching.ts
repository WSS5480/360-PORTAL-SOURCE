/**
 * Conversion-stage coaching copy for first debrief after completed observation program.
 */

import type { AiDebriefStrategyBuilderPath } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import { translateDebriefClinicalTopic } from "@/lib/surgical-sales/engagements/debriefClinicalTopicTranslation";
import {
  validateRepFacingProductName,
  validateRepFacingWedgeTopic,
} from "@/lib/surgical-sales/engagements/debriefPrepareIntelligenceValidation";
import { cleanProductDisplayName } from "@/lib/surgical-sales/findingDisplayLabels";
import { isOntologyProductLabel } from "@/lib/surgical-sales/observationIntelligenceDisplayLabels";

const DISCOVERY_LEAKAGE_PATTERNS: RegExp[] = [
  /\bwho schedules\b/i,
  /\bschedules cases\b/i,
  /\bwhat procedures\b/i,
  /\bdo you use\b/i,
  /\bis visualization\b/i,
  /\bvisualization a challenge\b/i,
  /\bmatch how you experience these cases day to day\b/i,
  /\bmatch your experience running these cases\b/i,
  /\bconfirm access path\b/i,
  /\bvalidate whether this still holds\b/i,
  /\bcan we observe\b/i,
  /\bpermission to observe\b/i,
  /\bwho else would need to be involved\b/i,
];

const PRIOR_DEBRIEF_PATTERNS = [/\bfollow up on your prior debrief\b/i, /\bprior debrief commitment\b/i];

export function isDebriefDiscoveryLeakageQuestion(
  question: string,
  options?: { isFirstDebrief?: boolean },
): boolean {
  const normalized = question.trim();
  if (!normalized) return true;

  if (DISCOVERY_LEAKAGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (options?.isFirstDebrief && PRIOR_DEBRIEF_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return false;
}

export function formatProviderHonorific(providerName: string | null): string {
  const name = providerName?.trim();
  if (!name) return "the surgeon";
  if (/^dr\.?\s/i.test(name)) return name;
  return `Dr. ${name}`;
}

export function buildConversionOpening(input: {
  providerName: string | null;
  procedureLabel: string | null;
  completedObservationCount: number;
  wedgeTopic: string;
}): string {
  const provider = formatProviderHonorific(input.providerName);
  const count = Math.max(1, input.completedObservationCount);
  const procedure = input.procedureLabel?.trim() || "observed";
  const topic = input.wedgeTopic.trim() || "recurring workflow friction";

  const procedurePhrase =
    count === 1 ? `${procedure} case` : `${count} ${procedure} cases`;

  return `${provider}, over the ${procedurePhrase} we observed, we kept seeing ${topic}. I'd like to start there: does that pattern match how you experience these cases, and does it rise to the level of something you'd consider addressing?`;
}

export function buildConversionPriorityProbes(input: {
  wedgeTopic: string;
  impactQuestions: string[];
  validateQuestions: string[];
  introPostProofQuestion: string | null;
  isFirstDebrief: boolean;
}): string[] {
  const probes: string[] = [];
  const topic = input.wedgeTopic.trim() || "the workflow pattern we observed";

  const importanceProbe = /visualization|fixation/.test(topic)
    ? `Across the cases we watched, visualization before fixation kept showing up. How much does that actually affect your flow or satisfaction — minor nuisance or something you'd want to improve?`
    : `Across the cases we watched, ${topic} kept showing up. How much does that actually affect your flow or satisfaction — minor nuisance or something you'd want to improve?`;

  probes.push(importanceProbe);

  if (/frustration|visualization|fixation/.test(topic)) {
    probes.push(
      "In the more recent cases we noted frustration during that phase. Does that resonate, or was that situational?",
    );
  }

  for (const question of [...input.impactQuestions, ...input.validateQuestions]) {
    if (isDebriefDiscoveryLeakageQuestion(question, { isFirstDebrief: input.isFirstDebrief })) {
      continue;
    }
    if (probes.some((probe) => probe.toLowerCase() === question.toLowerCase())) continue;
    probes.push(question);
  }

  if (input.introPostProofQuestion) {
    probes.push(input.introPostProofQuestion);
  } else if (input.isFirstDebrief) {
    probes.push(
      "On our intro call you said you wanted to see workflow in the OR before product talk. Now that we've completed the observation program, is there a workflow issue here you'd actually consider acting on?",
    );
  }

  return probes.slice(0, 4);
}

export function buildConversionOpennessProbes(input: {
  opennessQuestions: string[];
  incumbentProduct: string | null;
  isFirstDebrief: boolean;
}): string[] {
  const probes: string[] = [
    "If you did think it was worth addressing, would you want to explore something in a lower-commitment way first, or are you thinking about the next cases in the OR?",
  ];

  if (input.incumbentProduct) {
    probes.push(
      `${input.incumbentProduct} has been used consistently on these cases. If we addressed the visualization piece, would you be open to evaluating a change, or is ${input.incumbentProduct} working well enough that this isn't a priority?`,
    );
  }

  for (const question of input.opennessQuestions) {
    if (isDebriefDiscoveryLeakageQuestion(question, { isFirstDebrief: input.isFirstDebrief })) {
      continue;
    }
    if (probes.some((probe) => probe.toLowerCase() === question.toLowerCase())) continue;
    probes.push(question);
  }

  return probes.slice(0, 3);
}

export const CONVERSION_CLOSING_QUESTION =
  "Based on your read — is this something worth a next step, or is it acceptable as-is? If it's worth addressing, what kind of next step feels right to you?";

export const CONVERSION_NOT_DECIDING_TODAY = [
  "Re-confirm observation access",
  "Ask who schedules cases",
  "Ask what procedures they perform",
  "Ask if incumbent product is used",
  "Ask if visualization is ever challenging",
  "Lead with product",
];

export const CONVERSION_DECISION_OUTCOMES = [
  {
    outcome: "Yes — worth addressing",
    meaning: "Surgeon agrees the pattern matters",
    repAction: "Test 360 Experience vs Case Commitment",
  },
  {
    outcome: "No / not a priority",
    meaning: "Surgeon accepts the pattern but won't act",
    repAction: "No Action — document and maintain relationship",
  },
  {
    outcome: "Not yet / needs time",
    meaning: "Interested but not ready to commit",
    repAction: "Agree follow-up — do not force Case Commitment",
  },
] as const;

export const CONVERSION_MOTION_PATH_SCRIPTS: Record<
  AiDebriefStrategyBuilderPath,
  { whenToUse: string; directorScript: string }
> = {
  "No Action": {
    whenToUse: "Pattern acknowledged but not important enough to pursue, or surgeon satisfied with status quo.",
    directorScript:
      "That's helpful — I appreciate the clarity. We'll stay close to your program and won't push product where there isn't a problem worth solving. I'll check in after your next cases if anything shifts.",
  },
  "360 Experience": {
    whenToUse:
      "Surgeon agrees the issue matters but wants lower commitment before OR cases, or wants structured evaluation.",
    directorScript:
      "If you're open to exploring whether visualization workflow can improve, a 360 Experience could let us look at that together without committing your OR to a change yet. We'd still coordinate through the scheduler and complete credentialing before anything in the hospital.",
  },
  "Case Commitment": {
    whenToUse:
      "Surgeon agrees the issue matters and wants to explore in upcoming OR cases with a defined profile.",
    directorScript:
      "If you're willing to explore this in real cases, let's define what a good first evaluation case looks like — procedure, anatomy, typical product use — and work with the scheduler to find a date after credentialing is cleared. I won't put a date on the calendar in this conversation without those steps.",
  },
};

function normalizeWedgeTopic(candidate: string, providerName?: string | null): string {
  const validated = validateRepFacingWedgeTopic(candidate, { providerName });
  if (validated) return validated;

  const stripped = candidate.replace(/\s*\([^)]*\/100[^)]*\)/g, "").trim();
  if (/visualization|fixation|view before/i.test(stripped)) {
    return "extra time spent establishing visualization before fixation";
  }

  const translated = translateDebriefClinicalTopic(stripped, "workflow_friction");
  const remapped = validateRepFacingWedgeTopic(translated, { providerName });
  if (remapped) return remapped;

  return "recurring workflow friction across observed cases";
}

export function extractWedgeTopic(input: {
  workflowPainEvidence: string | null;
  workflowPainReasoning: string | null;
  learnedBullets: string[];
  providerName?: string | null;
}): string {
  const candidates = [
    input.workflowPainEvidence,
    input.learnedBullets.find((bullet) =>
      /visualization|fixation|frustration|workflow|bard mesh/i.test(bullet),
    ) ?? null,
    input.workflowPainReasoning,
    input.learnedBullets[0]?.trim() ?? null,
  ].filter((value): value is string => !!value?.trim());

  for (const candidate of candidates) {
    const normalized = normalizeWedgeTopic(candidate, input.providerName);
    if (normalized !== "recurring workflow friction across observed cases") {
      return normalized;
    }
  }

  return normalizeWedgeTopic(candidates[0] ?? "", input.providerName);
}

export function extractIncumbentProduct(input: {
  competitorSummaries: string[];
  learnedBullets: string[];
  providerName?: string | null;
}): string | null {
  const ctx = { providerName: input.providerName };
  const blob = [...input.competitorSummaries, ...input.learnedBullets].join(" ");

  if (/\bBard(?:\s+Mesh)?\b/i.test(blob)) {
    return validateRepFacingProductName("Bard Mesh", ctx);
  }

  for (const known of ["ACSIS", "Endolumik", "Ventralight", "Phasix", "Strattice", "OviTex"]) {
    if (new RegExp(`\\b${known}\\b`, "i").test(blob)) {
      return validateRepFacingProductName(known, ctx);
    }
  }

  const productMatches = blob.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b(?:\s+(?:observed|used|noted|again))/gi,
  );
  if (productMatches) {
    for (const match of productMatches) {
      const nameMatch = match.match(
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b(?:\s+(?:observed|used|noted|again))/i,
      );
      const raw = nameMatch?.[1]?.trim();
      if (!raw) continue;
      const cleaned = cleanProductDisplayName(raw);
      if (isOntologyProductLabel(cleaned)) continue;
      const validated = validateRepFacingProductName(cleaned, ctx);
      if (validated) return validated;
    }
  }

  return null;
}

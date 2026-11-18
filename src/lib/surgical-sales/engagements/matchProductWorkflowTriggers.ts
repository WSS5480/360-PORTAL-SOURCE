/**
 * Matches observation evidence against product knowledge workflow/clinical triggers.
 * Requires procedure alignment for full alignment score — soft signal only.
 */

import { getDebriefProductKnowledge } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import type { DebriefProductKnowledgeId } from "@/lib/surgical-sales/engagements/debriefProductKnowledge/debriefProductKnowledgeTypes";
import { procedureAlignsWithDebriefProduct } from "@/lib/surgical-sales/engagements/procedureProductAlignment";
import type { ProviderDebriefPlanLearningItem } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "with",
  "where",
  "when",
  "that",
  "this",
  "from",
  "into",
  "about",
  "mention",
  "mentions",
  "mentioned",
  "surgeon",
  "staff",
  "team",
  "cases",
  "case",
  "may",
  "not",
  "are",
  "was",
  "were",
  "has",
  "have",
  "add",
  "adds",
  "other",
  "standard",
  "practice",
  "habits",
  "placeholder",
  "refine",
  "approved",
  "language",
  "clinical",
  "trigger",
]);

const SHORT_MEDICAL_TERMS = new Set([
  "mesh",
  "tack",
  "tacks",
  "lap",
  "or",
  "dock",
  "leak",
  "view",
  "sac",
]);

type TriggerPairDefinition = {
  terms: [string, string];
  weight: number;
  kind: "workflow" | "clinical";
  attribution: string;
};

const PRODUCT_TRIGGER_PAIRS: Record<DebriefProductKnowledgeId, TriggerPairDefinition[]> = {
  ACSIS: [
    {
      terms: ["visualization", "fixation"],
      weight: 18,
      kind: "clinical",
      attribution: "Visualization before fixation affects decision confidence",
    },
    {
      terms: ["extra", "fixation"],
      weight: 12,
      kind: "workflow",
      attribution: "Surgeon or staff mention extra time during closure or fixation",
    },
    {
      terms: ["extra", "visualization"],
      weight: 12,
      kind: "workflow",
      attribution: "Surgeon or staff mention extra time during closure or fixation",
    },
    {
      terms: ["better", "view"],
      weight: 12,
      kind: "workflow",
      attribution: "Surgeon or staff mention extra time during closure or fixation",
    },
    {
      terms: ["placing", "fixation"],
      weight: 12,
      kind: "workflow",
      attribution: "Surgeon or staff mention extra time during closure or fixation",
    },
    {
      terms: ["closure", "fixation"],
      weight: 12,
      kind: "workflow",
      attribution: "Surgeon or staff mention extra time during closure or fixation",
    },
  ],
  Endolumik: [
    {
      terms: ["sizing", "confirmation"],
      weight: 18,
      kind: "clinical",
      attribution: "Uncertainty or extra steps around sizing confirmation",
    },
    {
      terms: ["leak", "prevention"],
      weight: 18,
      kind: "clinical",
      attribution: "Surgeon discusses leak prevention or staple-line integrity habits",
    },
    {
      terms: ["bougie", "confirmation"],
      weight: 12,
      kind: "workflow",
      attribution: "Staff coordination around bougie or sizing confirmation",
    },
    {
      terms: ["visualization", "confirmation"],
      weight: 12,
      kind: "workflow",
      attribution: "Surgeon or team mentions visualization or confirmation friction",
    },
  ],
  BioTissue: [],
  Merakris: [],
  TelaBio: [],
  "Skeletal Dynamics": [],
};

export type ProductWorkflowAlignmentResult = {
  productId: DebriefProductKnowledgeId;
  alignmentScore: number;
  procedureAligned: boolean;
  matchedWorkflowTriggers: string[];
  matchedClinicalTriggers: string[];
  evidenceExcerpts: string[];
};

export const WORKFLOW_ALIGNMENT_BOOST_THRESHOLD = 35;

function termPairMatchesCorpus(corpus: string, pair: [string, string]): boolean {
  const normalized = corpus.toLowerCase();
  return normalized.includes(pair[0]) && normalized.includes(pair[1]);
}

function collectCorpusTexts(input: {
  observationTexts: string[];
  learnings?: ProviderDebriefPlanLearningItem[];
}): string[] {
  const texts = [...input.observationTexts];

  for (const learning of input.learnings ?? []) {
    if (learning.signal.trim()) texts.push(learning.signal);
    if (learning.evidence?.trim()) texts.push(learning.evidence);
  }

  return texts.filter((text) => text.trim().length >= 8);
}

function significantTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => {
      if (!term) return false;
      if (STOP_WORDS.has(term)) return false;
      return term.length >= 4 || SHORT_MEDICAL_TERMS.has(term);
    });
}

function catalogTriggerMatchesCorpus(
  trigger: string,
  corpus: string,
): boolean {
  const terms = [...new Set(significantTerms(trigger))];
  if (terms.length === 0) return false;

  const normalizedCorpus = corpus.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (normalizedCorpus.includes(term)) hits += 1;
  }

  const requiredHits =
    terms.length <= 2 ? terms.length : Math.max(2, Math.ceil(terms.length * 0.34));
  return hits >= requiredHits;
}

function excerptForPair(corpusTexts: string[], pair: [string, string]): string | null {
  for (const text of corpusTexts) {
    if (termPairMatchesCorpus(text, pair)) {
      return text.trim().slice(0, 220);
    }
  }
  return null;
}

export function assessProductWorkflowAlignment(input: {
  productId: DebriefProductKnowledgeId;
  observationTexts: string[];
  procedureLabel: string | null | undefined;
  learnings?: ProviderDebriefPlanLearningItem[];
}): ProductWorkflowAlignmentResult {
  const knowledge = getDebriefProductKnowledge(input.productId);
  const corpusTexts = collectCorpusTexts(input);
  const corpus = corpusTexts.join("\n");
  const procedureAligned = procedureAlignsWithDebriefProduct(input.procedureLabel, input.productId);

  const matchedWorkflowTriggers: string[] = [];
  const matchedClinicalTriggers: string[] = [];
  const evidenceExcerpts: string[] = [];
  let rawScore = 0;

  for (const pairDef of PRODUCT_TRIGGER_PAIRS[input.productId] ?? []) {
    if (!termPairMatchesCorpus(corpus, pairDef.terms)) continue;

    rawScore += pairDef.weight;
    if (pairDef.kind === "clinical") {
      if (!matchedClinicalTriggers.includes(pairDef.attribution)) {
        matchedClinicalTriggers.push(pairDef.attribution);
      }
    } else if (!matchedWorkflowTriggers.includes(pairDef.attribution)) {
      matchedWorkflowTriggers.push(pairDef.attribution);
    }

    const excerpt = excerptForPair(corpusTexts, pairDef.terms);
    if (excerpt && !evidenceExcerpts.includes(excerpt)) {
      evidenceExcerpts.push(excerpt);
    }
  }

  for (const trigger of knowledge.workflowTriggers) {
    if (trigger.includes("[Placeholder")) continue;
    if (catalogTriggerMatchesCorpus(trigger, corpus) && !matchedWorkflowTriggers.includes(trigger)) {
      matchedWorkflowTriggers.push(trigger);
      rawScore += 8;
    }
  }

  for (const trigger of knowledge.clinicalTriggers) {
    if (trigger.includes("[Placeholder")) continue;
    if (catalogTriggerMatchesCorpus(trigger, corpus) && !matchedClinicalTriggers.includes(trigger)) {
      matchedClinicalTriggers.push(trigger);
      rawScore += 10;
    }
  }

  if (!procedureAligned) {
    rawScore = Math.min(rawScore, 22);
  }

  const alignmentScore = Math.max(0, Math.min(100, rawScore));

  return {
    productId: input.productId,
    alignmentScore,
    procedureAligned,
    matchedWorkflowTriggers,
    matchedClinicalTriggers,
    evidenceExcerpts: evidenceExcerpts.slice(0, 3),
  };
}

export function workflowAlignmentSupportsProductConversation(
  result: ProductWorkflowAlignmentResult,
): boolean {
  return (
    result.procedureAligned &&
    result.alignmentScore >= WORKFLOW_ALIGNMENT_BOOST_THRESHOLD &&
    (result.matchedWorkflowTriggers.length > 0 || result.matchedClinicalTriggers.length > 0)
  );
}

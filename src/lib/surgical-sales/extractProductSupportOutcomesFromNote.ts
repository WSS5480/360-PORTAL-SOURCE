import type {
  ProductSupportCaseResultId,
  ProductSupportNextStepId,
  ProductSupportProviderReactionId,
} from "@/lib/surgical-sales/productSupportCaseMoments";
import {
  productSupportIssueSignalMatches,
  productSupportNoteHasOverallSuccess,
} from "@/lib/surgical-sales/productSupportNoteTone";

export type ProductSupportOutcomesExtraction = {
  providerReaction: ProductSupportProviderReactionId | null;
  caseResult: ProductSupportCaseResultId | null;
  nextStep: ProductSupportNextStepId | null;
  extractedAt: string;
  model: "rules";
};

type OutcomeRule<T extends string> = {
  value: T;
  patterns: RegExp[];
};

const PROVIDER_REACTION_RULES: OutcomeRule<ProductSupportProviderReactionId>[] = [
  {
    value: "negative",
    patterns: [
      /\b(unhappy|upset|frustrated|disliked|hated|complain(?:ed|ing)?|negative|angry|dissatisfied|not\s+pleased)\b/i,
      /\b(didn['']t\s+(?:like|work|go\s+well))\b/i,
    ],
  },
  {
    value: "positive",
    patterns: [
      /\b(pleased|happy|loved|great|positive|liked|satisfied|impressed|enthusiastic|worked\s+well)\b/i,
      /\b(went\s+well|smooth(?:ly)?|successful|no\s+issues)\b/i,
    ],
  },
  {
    value: "neutral",
    patterns: [/\b(neutral|fine|okay|ok|no\s+strong\s+opinion|indifferent)\b/i],
  },
];

const CASE_RESULT_RULES: OutcomeRule<ProductSupportCaseResultId>[] = [
  {
    value: "successful",
    patterns: [
      /\b(went\s+smoothly|went\s+well|overall\s+things\s+went|successful|great\s+case|no\s+major\s+issues|worked\s+well|good\s+outcome)\b/i,
      /\b(team\s+seemed\s+comfortable|case\s+(?:was\s+)?(?:fine|good|complete))\b/i,
    ],
  },
  {
    value: "issue_encountered",
    patterns: [
      /\b(issue|problem|broken|failed|failure|complication|defect|recall|wrong|missing|delay|backorder)\b/i,
      /\bdidn['']t\s+work\b/i,
    ],
  },
  {
    value: "follow_up_needed",
    patterns: [
      /\bfollow[- ]?up\b/i,
      /\bworth\s+following\s+up\b/i,
      /\bneed(?:s)?\s+(?:to\s+)?(?:call|check|schedule)\b/i,
      /\bcontinuing\s+to\s+watch\b/i,
    ],
  },
];

const NEXT_STEP_RULES: OutcomeRule<ProductSupportNextStepId>[] = [
  {
    value: "evaluation",
    patterns: [/\b(trial|demo|evaluation|eval(?:uation)?)\b/i],
  },
  {
    value: "training",
    patterns: [/\b(training|train(?:ing)?|in[- ]?service|education)\b/i],
  },
  {
    value: "additional_case",
    patterns: [/\b(additional\s+case|another\s+case|next\s+case|more\s+cases)\b/i],
  },
  {
    value: "follow_up_meeting",
    patterns: [/\b(follow[- ]?up|call\s+(?:back|them)|check\s+back|schedule\s+(?:a\s+)?meeting)\b/i],
  },
  {
    value: "none",
    patterns: [/\b(no\s+follow[- ]?up|no\s+next\s+step|nothing\s+(?:else|further))\b/i],
  },
];

function matchCaseResult(text: string): ProductSupportCaseResultId | null {
  for (const rule of CASE_RESULT_RULES) {
    if (rule.value === "issue_encountered" && !productSupportIssueSignalMatches(text)) {
      continue;
    }
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.value;
    }
  }
  if (productSupportNoteHasOverallSuccess(text)) return "successful";
  return null;
}

function matchFirst<T extends string>(text: string, rules: OutcomeRule<T>[]): T | null {
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.value;
    }
  }
  return null;
}

export function extractProductSupportOutcomesFromNote(rawText: string): ProductSupportOutcomesExtraction {
  const text = rawText.trim();

  return {
    providerReaction: text ? matchFirst(text, PROVIDER_REACTION_RULES) : null,
    caseResult: text ? matchCaseResult(text) : null,
    nextStep: text ? matchFirst(text, NEXT_STEP_RULES) : null,
    extractedAt: new Date().toISOString(),
    model: "rules",
  };
}

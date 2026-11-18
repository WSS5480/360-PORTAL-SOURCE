import {
  productSupportIssueSignalMatches,
  productSupportNoteHasOverallSuccess,
} from "@/lib/surgical-sales/productSupportNoteTone";

export const PRODUCT_SUPPORT_OBSERVATION_CATEGORIES = [
  "provider_feedback",
  "staff_feedback",
  "product_signal",
  "product_fit_signal",
  "issue",
  "question",
  "follow_up",
  "success",
  "other",
] as const;

export type ProductSupportObservationCategory = (typeof PRODUCT_SUPPORT_OBSERVATION_CATEGORIES)[number];

export const PRODUCT_SUPPORT_OBSERVATION_CATEGORY_LABELS: Record<ProductSupportObservationCategory, string> = {
  provider_feedback: "Provider Feedback",
  staff_feedback: "Staff Feedback",
  product_signal: "Product Signal",
  product_fit_signal: "Product Fit Signal",
  issue: "Issue",
  question: "Question",
  follow_up: "Follow Up",
  success: "Success",
  other: "Other",
};

export type ProductSupportObservationExtraction = {
  primaryClassification: ProductSupportObservationCategory;
  classificationLabel: string;
  summary: string;
  extractedAt: string;
  model: "rules";
};

type ClassificationRule = {
  category: ProductSupportObservationCategory;
  patterns: RegExp[];
};

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    category: "success",
    patterns: [
      /\b(went well|went smoothly|smooth(?:ly)?|successful|great case|no major issues|pleased|worked well|good outcome)\b/i,
      /\b(team seemed comfortable|overall things went)\b/i,
    ],
  },
  {
    category: "follow_up",
    patterns: [
      /\bfollow[- ]?up\b/i,
      /\bworth following up\b/i,
      /\bcall\s+(?:back|them|or)\b/i,
      /\bcheck\s+back\b/i,
      /\bschedule\b/i,
      /\bcontinuing to watch\b/i,
    ],
  },
  {
    category: "provider_feedback",
    patterns: [
      /\b(surgeon|provider|doctor|physician)\b.*\b(said|mentioned|prefer|liked|disliked|feedback|comment|challenging)\b/i,
      /\b(said|mentioned|prefer)\b.*\b(surgeon|provider|doctor|physician)\b/i,
    ],
  },
  {
    category: "staff_feedback",
    patterns: [/\b(nurse|tech|circulator|scrub|or\s+staff|staff|spd)\b/i],
  },
  {
    category: "issue",
    patterns: [
      /\b(issue|problem|broken|failed|failure|complication|defect|recall|wrong|missing|delay|backorder)\b/i,
      /\bdidn['']t work\b/i,
    ],
  },
  {
    category: "question",
    patterns: [/\?\s*$/, /\b(how|what|why|when|whether|wonder|ask(?:ed|ing)?)\b/i],
  },
  {
    category: "product_fit_signal",
    patterns: [
      /\bproduct\s+fit\b/i,
      /\b(good fit|strong fit|fit well)\b/i,
      /\b(trial|demo|evaluation|adopt(?:ion)?|interest in)\b/i,
    ],
  },
  {
    category: "product_signal",
    patterns: [
      /\b(product|tray|implant|sku|peel[- ]?pack|instrument|set)\b/i,
      /\b(opened|used|deployed|applied)\b/i,
      /\bACSIS\b/i,
    ],
  },
];

function summarize(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 157)}…`;
}

export function classifyProductSupportObservation(text: string): ProductSupportObservationCategory {
  const trimmed = text.trim();
  if (!trimmed) return "other";

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.category === "issue" && !productSupportIssueSignalMatches(trimmed)) {
      continue;
    }
    if (!rule.patterns.some((pattern) => pattern.test(trimmed))) {
      continue;
    }
    return rule.category;
  }

  if (productSupportNoteHasOverallSuccess(trimmed)) return "success";
  return "other";
}

export function extractProductSupportObservation(rawText: string): ProductSupportObservationExtraction {
  const summary = summarize(rawText);
  const primaryClassification = classifyProductSupportObservation(rawText);

  return {
    primaryClassification,
    classificationLabel: PRODUCT_SUPPORT_OBSERVATION_CATEGORY_LABELS[primaryClassification],
    summary,
    extractedAt: new Date().toISOString(),
    model: "rules",
  };
}

export function productSupportObservationCaseField(
  category: ProductSupportObservationCategory,
): string | null {
  switch (category) {
    case "provider_feedback":
      return "live_observation_surgeon_reactions";
    case "staff_feedback":
      return "live_observation_staff_process";
    case "product_signal":
    case "product_fit_signal":
      return "live_observation_product_fit";
    case "issue":
      return "live_observation_workflow";
    case "question":
      return "live_observation_questions";
    case "follow_up":
      return "live_observation_follow_up_items";
    case "success":
    case "other":
      return "debrief_key_findings";
    default:
      return null;
  }
}

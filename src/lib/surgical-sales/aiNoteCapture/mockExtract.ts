import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { AI_NOTE_CAPTURE_HIPAA_WARNING } from "./labels";
import type {
  AiNoteCaptureClassification,
  AiNoteCaptureContext,
  AiNoteCaptureDestination,
  AiNoteCaptureExtractedSuggestion,
  AiNoteCaptureExtractResult,
  AiNoteCaptureInputMode,
} from "./types";
import { buildWorkflowTarget, type AiNoteCaptureWorkflowTarget, type ProviderPlanningLogicalField } from "./workflowTargets";

function uid(): string {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

type FragmentRule = {
  test: RegExp;
  category: AiNoteCaptureClassification;
  destination: AiNoteCaptureDestination;
  cleaned: (raw: string, ctx: AiNoteCaptureContext) => string;
  reasoning: string;
  confidence: number;
  workflowField?: ProviderPlanningLogicalField;
};

const FRAGMENT_RULES: FragmentRule[] = [
  {
    test: /^(stark|dr\.?\s*stark)/i,
    category: "case_observation",
    destination: "case",
    cleaned: (r, ctx) =>
      `Dr. ${ctx.providerLabel?.replace(/^Dr\.?\s*/i, "") || "Stark"} observed at ${ctx.organizationLabel || "JH"}.`,
    reasoning: "Provider presence at facility — case observation context.",
    confidence: 0.82,
  },
  {
    test: /^ventral\b/i,
    category: "workflow_field_suggestion",
    destination: "provider",
    workflowField: "common_procedures",
    cleaned: () => "Ventral hernia procedures.",
    reasoning: "Procedure type maps to Provider Planning procedural intelligence.",
    confidence: 0.88,
  },
  {
    test: /\b(tg\s*mostly|tg\b|mesh\s*mostly)/i,
    category: "workflow_field_suggestion",
    destination: "provider",
    workflowField: "current_vendors_products",
    cleaned: () => "TG mesh used for most cases.",
    reasoning: "Current vendor/product usage for procedural intelligence.",
    confidence: 0.9,
  },
  {
    test: /\b(fix\s*slow|fixation\s*slow|slow\s*fix)/i,
    category: "workflow_field_suggestion",
    destination: "provider",
    workflowField: "preference_card_signals",
    cleaned: () => "Fixation is slow / takes too long — potential product fit concern.",
    reasoning: "Product fit signal for provider preference card intelligence.",
    confidence: 0.84,
  },
  {
    test: /\b(lp\s*maybe|if\s*data\s*good)/i,
    category: "workflow_field_suggestion",
    destination: "provider",
    workflowField: "product_interest_areas",
    cleaned: () => "Possible interest in LP product if clinical data supports.",
    reasoning: "Conditional product interest for procedural intelligence.",
    confidence: 0.8,
  },
  {
    test: /\b(post\s*app|large\s*defects)/i,
    category: "workflow_field_suggestion",
    destination: "provider",
    workflowField: "technique_preferences",
    cleaned: () => "Post-application: large defects observed.",
    reasoning: "Technique preference for provider intelligence.",
    confidence: 0.83,
  },
  {
    test: /\b(or\s*wants\s*\$|wants\s*\$|cost|pricing|\$)/i,
    category: "organization_intelligence",
    destination: "organization",
    cleaned: () => "OR manager wants cost / pricing information.",
    reasoning: "Facility-level purchasing concern.",
    confidence: 0.85,
  },
  {
    test: /\b(slow\s*trays|tray)/i,
    category: "organization_intelligence",
    destination: "organization",
    cleaned: () => "OR tray turnaround is slow.",
    reasoning: "Facility process intelligence.",
    confidence: 0.83,
  },
  {
    test: /\b(eval\s*june)/i,
    category: "opportunity_signal",
    destination: "opportunity",
    cleaned: () => "Possible product evaluation in June.",
    reasoning: "Evaluation timing indicates adoption opportunity.",
    confidence: 0.82,
  },
  {
    test: /\bcommittee\s*first/i,
    category: "opportunity_signal",
    destination: "opportunity",
    cleaned: () => "Committee review required before proceeding.",
    reasoning: "Buying process gate.",
    confidence: 0.76,
  },
  {
    test: /\bcomp\s*rep|competitor/i,
    category: "workflow_field_suggestion",
    destination: "provider",
    workflowField: "competitive_products_used",
    cleaned: () => "Competitor representative was present.",
    reasoning: "Competitive presence maps to procedural intelligence.",
    confidence: 0.89,
  },
  {
    test: /\b(fri|friday)\s*call|call\s*or\s*mgr/i,
    category: "follow_up_task",
    destination: "task",
    cleaned: () => "Follow up with OR manager on Friday.",
    reasoning: "Action item with timing.",
    confidence: 0.91,
  },
  {
    test: /\bdemo\s*smaller\s*fix/i,
    category: "opportunity_signal",
    destination: "opportunity",
    cleaned: () => "Request demo for smaller fixation product.",
    reasoning: "Demo request signals commercial interest.",
    confidence: 0.79,
  },
  {
    test: /\bpref\s*card/i,
    category: "opportunity_signal",
    destination: "opportunity",
    cleaned: () => "Preference card update may be needed (uncertain).",
    reasoning: "Preference card change may affect adoption — needs confirmation.",
    confidence: 0.58,
  },
  {
    test: /\b(document|brochure|ifu|resource|pdf|literature)/i,
    category: "resource_or_document_note",
    destination: "case",
    cleaned: (r) => r.trim(),
    reasoning: "References collateral or documentation.",
    confidence: 0.77,
  },
];

function resolveTarget(
  destination: AiNoteCaptureDestination,
  ctx: AiNoteCaptureContext,
): { destinationRecordId: string | null; destinationRecordLabel: string | null } {
  switch (destination) {
    case "provider":
      return { destinationRecordId: ctx.providerId ?? null, destinationRecordLabel: ctx.providerLabel ?? null };
    case "case":
      return { destinationRecordId: ctx.caseId ?? null, destinationRecordLabel: ctx.caseLabel ?? null };
    case "opportunity":
      return { destinationRecordId: ctx.opportunityId ?? null, destinationRecordLabel: ctx.opportunityLabel ?? null };
    case "organization":
      return { destinationRecordId: ctx.organizationId ?? null, destinationRecordLabel: ctx.organizationLabel ?? null };
    case "task":
      return {
        destinationRecordId: ctx.opportunityId ?? ctx.caseId ?? null,
        destinationRecordLabel: ctx.opportunityLabel ?? ctx.caseLabel ?? "New task",
      };
    case "product":
      return {
        destinationRecordId: ctx.caseId ?? ctx.providerId ?? null,
        destinationRecordLabel: ctx.caseLabel ?? ctx.providerLabel ?? null,
      };
    default:
      return { destinationRecordId: null, destinationRecordLabel: null };
  }
}

function splitFragments(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2);
  if (lines.length > 1) return lines;

  return text
    .split(/(?<=[.!?])\s+|[,;]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

function classifyFragment(
  raw: string,
  ctx: AiNoteCaptureContext,
  existingFields: Record<string, string>,
): AiNoteCaptureExtractedSuggestion {
  const rule = FRAGMENT_RULES.find((r) => r.test.test(raw));
  let category = rule?.category ?? "unclassified";
  let destination = rule?.destination ?? "unclassified";
  let confidence = rule?.confidence ?? 0.45;
  let workflowTarget: AiNoteCaptureWorkflowTarget | null = null;

  if (rule?.workflowField && ctx.providerId) {
    workflowTarget = buildWorkflowTarget({ field: rule.workflowField, mergeStrategy: "append" });
    category = "workflow_field_suggestion";
    destination = "provider";
  } else if (rule?.workflowField && !ctx.providerId) {
    category = "provider_intelligence";
    destination = "provider";
    confidence = Math.min(confidence, 0.65);
  }

  if (category === "opportunity_signal" && /pref\s*card/i.test(raw) && confidence < 0.7) {
    category = "unclassified";
    destination = "unclassified";
    confidence = 0.5;
  }

  const target = resolveTarget(destination, ctx);
  const existingFieldValue =
    workflowTarget && existingFields[workflowTarget.field] ? existingFields[workflowTarget.field] : null;

  return {
    id: uid(),
    originalText: raw,
    cleanedText: rule ? rule.cleaned(raw, ctx) : raw,
    category,
    destination,
    confidence,
    reasoningShort: rule?.reasoning ?? "Could not confidently classify — review before saving.",
    suggestedRecordId: target.destinationRecordId,
    suggestedRecordLabel: target.destinationRecordLabel,
    destinationRecordId: target.destinationRecordId,
    destinationRecordLabel: target.destinationRecordLabel,
    needsUserReview: confidence < 0.75 || category === "unclassified" || Boolean(existingFieldValue),
    workflowTarget,
    existingFieldValue,
  };
}

function assessPhi(text: string, fragments: string[]): Pick<AiNoteCaptureExtractResult, "phiDetected" | "phiWarning" | "riskyFragments"> {
  const riskyFragments: string[] = [];
  const all = [text, ...fragments];
  for (const chunk of all) {
    if (detectSurgicalPhiPatternKinds(chunk).length) riskyFragments.push(chunk.slice(0, 120));
  }
  const phiDetected = riskyFragments.length > 0;
  return {
    phiDetected,
    phiWarning: phiDetected ? AI_NOTE_CAPTURE_HIPAA_WARNING : null,
    riskyFragments: [...new Set(riskyFragments)],
  };
}

/** Regex-based extractor for offline dev and when OpenAI is unavailable. */
export async function mockAiNoteCaptureExtract(params: {
  rawText: string;
  inputMode: AiNoteCaptureInputMode;
  context: AiNoteCaptureContext;
  existingPlanningFields?: Record<string, string>;
}): Promise<AiNoteCaptureExtractResult> {
  const rawExtractedText = params.rawText.trim();
  await new Promise((r) => setTimeout(r, params.inputMode === "photo" || params.inputMode === "upload" ? 700 : 400));

  const existingFields = params.existingPlanningFields ?? {};
  const fragments = splitFragments(rawExtractedText);
  const suggestions = (fragments.length ? fragments : [rawExtractedText])
    .filter(Boolean)
    .slice(0, 24)
    .map((f) => classifyFragment(f, params.context, existingFields));

  const phi = assessPhi(
    rawExtractedText,
    suggestions.map((s) => s.originalText),
  );

  const classified = suggestions.filter((s) => s.category !== "unclassified");
  const unclassified = suggestions.filter((s) => s.category === "unclassified");

  return {
    rawExtractedText,
    ...phi,
    suggestions: classified,
    unclassified,
  };
}

export function mockOcrFromImageHint(_fileName?: string): string {
  return `Stark JH
ventral
TG mostly
fix slow
LP maybe if data good
post app large defects
OR wants $
slow trays
eval June?
committee first
comp rep there
Fri call OR mgr
demo smaller fix
pref card??`;
}

import { z } from "zod";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { AI_NOTE_CAPTURE_HIPAA_WARNING } from "./labels";
import { enrichExtractResultWithPlanningFields } from "./enrichSuggestions";
import { mockAiNoteCaptureExtract } from "./mockExtract";
import { loadProviderPlanningFieldValues } from "./loadProviderPlanningFields";
import {
  AI_NOTE_CAPTURE_MERGE_STRATEGIES,
  buildWorkflowTarget,
  type ProviderPlanningLogicalField,
} from "./workflowTargets";
import {
  AI_NOTE_CAPTURE_CLASSIFICATIONS,
  AI_NOTE_CAPTURE_DESTINATIONS,
  type AiNoteCaptureContext,
  type AiNoteCaptureExtractResult,
  type AiNoteCaptureExtractedSuggestion,
  type AiNoteCaptureInputMode,
} from "./types";

const WorkflowTargetSchema = z.object({
  workflow: z.literal("provider_planning"),
  section: z.string(),
  field: z.string(),
  field_label: z.string().optional(),
  merge_strategy: z.enum(AI_NOTE_CAPTURE_MERGE_STRATEGIES).optional(),
});

const SuggestionSchema = z.object({
  id: z.string().optional(),
  original_text: z.string(),
  cleaned_text: z.string(),
  category: z.enum(AI_NOTE_CAPTURE_CLASSIFICATIONS),
  destination: z.enum(AI_NOTE_CAPTURE_DESTINATIONS),
  confidence: z.number().min(0).max(1),
  reasoning_short: z.string(),
  suggested_record_id: z.string().nullable().optional(),
  suggested_record_label: z.string().nullable().optional(),
  destination_record_id: z.string().nullable().optional(),
  destination_record_label: z.string().nullable().optional(),
  needs_user_review: z.boolean().optional(),
  workflow_target: WorkflowTargetSchema.nullable().optional(),
});

const AiResponseSchema = z.object({
  raw_extracted_text: z.string(),
  phi_detected: z.boolean().optional(),
  phi_warning: z.string().nullable().optional(),
  risky_fragments: z.array(z.string()).optional(),
  suggestions: z.array(SuggestionSchema),
  unclassified: z.array(SuggestionSchema).optional(),
});

const SYSTEM_PROMPT = `You are analyzing messy handwritten or dictated surgical field notes from a medical device sales rep.

The notes may be:
- fragmented
- shorthand
- incomplete
- abbreviated
- out of order
- partially illegible
- filled with product nicknames
- filled with provider/facility shorthand

Do not summarize.
Do not create one note.
Extract atomic operational observations independently.
Classify each observation.
Map each observation to the correct platform destination.
Return JSON only.

Categories (use exactly these values):
- workflow_field_suggestion — maps to a specific Provider Planning workflow field (use workflow_target)
- provider_intelligence — general surgeon intel when no specific planning field fits
- case_observation — what happened in a specific case or OR visit
- opportunity_signal — trials, evaluations, adoption timing, demos, preference cards
- organization_intelligence — facility process, OR logistics, pricing at facility level
- competitive_intelligence — competitor presence, products, reps
- follow_up_task — action items with timing
- product_usage — which products/mesh/fixation used
- resource_or_document_note — brochures, IFUs, documents
- unclassified — when uncertain

Destinations (use exactly these values):
- provider, case, opportunity, organization, task, product, unclassified

When uncertain, use low confidence or unclassified.
Never invent facts not present in the note.
Use destination_record_id / suggested_record_id only when context IDs are provided and clearly match.

Provider Planning workflow_target (when category is workflow_field_suggestion):
- workflow: "provider_planning"
- section: procedural_intelligence | product_competitor_intelligence | relationship_strategy | observation_prompts
- field: common_procedures | technique_preferences | current_vendors_products | product_interest_areas | preference_card_signals | or_team_dynamics | competitive_products_used | communication_style | etc.
- Never route to Pre-Call Plan fields (SMART objective, opening statement, probes, tools/resources, value hypothesis, planned close) — those belong on the case only.
- merge_strategy: append (default), replace, needs_review — never use replace unless user will confirm
- Prefer workflow_field_suggestion over generic provider_intelligence when a planning field clearly fits
- ventral → common_procedures; TG mostly → current_vendors_products; comp rep → competitive_products_used

Also detect possible PHI (patient names, DOB, MRN, etc.). Set phi_detected true if any fragment may contain PHI.`;

function buildContextBlock(ctx: AiNoteCaptureContext): string {
  const lines: string[] = ["Available context (use for suggested_record_id when appropriate):"];
  if (ctx.providerId) lines.push(`- provider_id: ${ctx.providerId} (${ctx.providerLabel || "Provider"})`);
  if (ctx.caseId) lines.push(`- case_id: ${ctx.caseId} (${ctx.caseLabel || "Case"})`);
  if (ctx.opportunityId) lines.push(`- opportunity_id: ${ctx.opportunityId} (${ctx.opportunityLabel || "Opportunity"})`);
  if (ctx.organizationId) lines.push(`- organization_id: ${ctx.organizationId} (${ctx.organizationLabel || "Organization"})`);
  return lines.join("\n");
}

function uid(): string {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeWorkflowTarget(
  raw: z.infer<typeof WorkflowTargetSchema> | null | undefined,
): AiNoteCaptureExtractedSuggestion["workflowTarget"] {
  if (!raw?.field) return null;
  try {
    return buildWorkflowTarget({
      field: raw.field as ProviderPlanningLogicalField,
      mergeStrategy: raw.merge_strategy ?? "append",
    });
  } catch {
    return null;
  }
}

function normalizeSuggestion(
  raw: z.infer<typeof SuggestionSchema>,
  ctx: AiNoteCaptureContext,
  index: number,
  existingFields: Record<string, string>,
): AiNoteCaptureExtractedSuggestion {
  let destinationRecordId = raw.destination_record_id ?? raw.suggested_record_id ?? null;
  let destinationRecordLabel = raw.destination_record_label ?? raw.suggested_record_label ?? null;

  if (!destinationRecordId) {
    if (raw.destination === "provider" && ctx.providerId) {
      destinationRecordId = ctx.providerId;
      destinationRecordLabel = ctx.providerLabel ?? destinationRecordLabel;
    } else if (raw.destination === "case" && ctx.caseId) {
      destinationRecordId = ctx.caseId;
      destinationRecordLabel = ctx.caseLabel ?? destinationRecordLabel;
    } else if (raw.destination === "opportunity" && ctx.opportunityId) {
      destinationRecordId = ctx.opportunityId;
      destinationRecordLabel = ctx.opportunityLabel ?? destinationRecordLabel;
    } else if (raw.destination === "organization" && ctx.organizationId) {
      destinationRecordId = ctx.organizationId;
      destinationRecordLabel = ctx.organizationLabel ?? destinationRecordLabel;
    }
  }

  const workflowTarget = normalizeWorkflowTarget(raw.workflow_target);
  const existingFieldValue = workflowTarget ? existingFields[workflowTarget.field] ?? null : null;
  const confidence = Math.min(1, Math.max(0, raw.confidence));
  let category = raw.category;
  if (workflowTarget && category !== "workflow_field_suggestion") {
    category = "workflow_field_suggestion";
  }

  return {
    id: raw.id || `temp-${index + 1}`,
    originalText: raw.original_text.trim(),
    cleanedText: raw.cleaned_text.trim(),
    category,
    destination: raw.destination,
    confidence,
    reasoningShort: raw.reasoning_short.trim(),
    suggestedRecordId: destinationRecordId,
    suggestedRecordLabel: destinationRecordLabel,
    destinationRecordId,
    destinationRecordLabel,
    workflowTarget,
    existingFieldValue,
    needsUserReview:
      raw.needs_user_review ?? (confidence < 0.75 || category === "unclassified" || Boolean(existingFieldValue)),
  };
}

function mergePhi(
  parsed: z.infer<typeof AiResponseSchema>,
  localText: string,
): Pick<AiNoteCaptureExtractResult, "phiDetected" | "phiWarning" | "riskyFragments"> {
  const riskyFragments = [...(parsed.risky_fragments || [])];
  if (detectSurgicalPhiPatternKinds(localText).length && !riskyFragments.includes(localText.slice(0, 120))) {
    riskyFragments.push(localText.slice(0, 120));
  }
  for (const s of parsed.suggestions) {
    if (detectSurgicalPhiPatternKinds(s.original_text).length) {
      riskyFragments.push(s.original_text.slice(0, 120));
    }
  }
  const phiDetected = parsed.phi_detected === true || riskyFragments.length > 0;
  return {
    phiDetected,
    phiWarning: phiDetected ? parsed.phi_warning || AI_NOTE_CAPTURE_HIPAA_WARNING : null,
    riskyFragments: [...new Set(riskyFragments.filter(Boolean))],
  };
}

async function callOpenAiJson(params: {
  messages: Array<{ role: "system" | "user"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_NOTE_CAPTURE_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return content;
}

export async function extractTextFromImage(params: {
  imageBase64: string;
  mimeType: string;
}): Promise<string> {
  const dataUrl = `data:${params.mimeType};base64,${params.imageBase64}`;
  const content = await callOpenAiJson({
    messages: [
      {
        role: "system",
        content:
          "Extract ALL handwritten or printed text from this surgical sales field note image. Preserve fragments, shorthand, and line breaks. Do not summarize or interpret. Return JSON: { \"raw_extracted_text\": \"...\" }",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract raw text only. JSON response." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const parsed = JSON.parse(content) as { raw_extracted_text?: string };
  return String(parsed.raw_extracted_text || "").trim();
}

export async function openAiNoteCaptureExtract(params: {
  rawText: string;
  inputMode: AiNoteCaptureInputMode;
  context: AiNoteCaptureContext;
  existingPlanningFields?: Record<string, string>;
}): Promise<AiNoteCaptureExtractResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const existingFields = params.existingPlanningFields ?? {};
  if (!apiKey) {
    return mockAiNoteCaptureExtract({ ...params, existingPlanningFields: existingFields });
  }

  const userPrompt = `${buildContextBlock(params.context)}

Field notes to analyze:
"""
${params.rawText}
"""

Return JSON with shape:
{
  "raw_extracted_text": "...",
  "phi_detected": false,
  "phi_warning": null,
  "risky_fragments": [],
  "suggestions": [{ "id": "temp-1", "original_text": "...", "cleaned_text": "...", "category": "workflow_field_suggestion", "destination": "provider", "confidence": 0.0, "reasoning_short": "...", "destination_record_id": null, "destination_record_label": null, "workflow_target": { "workflow": "provider_planning", "section": "procedural_intelligence", "field": "common_procedures", "merge_strategy": "append" }, "needs_user_review": true }],
  "unclassified": []
}`;

  const content = await callOpenAiJson({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  let parsed: z.infer<typeof AiResponseSchema>;
  try {
    parsed = AiResponseSchema.parse(JSON.parse(content));
  } catch {
    console.error("[openaiExtract] invalid JSON", content.slice(0, 500));
    return mockAiNoteCaptureExtract({ ...params, existingPlanningFields: existingFields });
  }

  const phi = mergePhi(parsed, params.rawText);
  const allRaw = [...parsed.suggestions, ...(parsed.unclassified || [])];
  const suggestions = allRaw
    .filter((s) => s.category !== "unclassified")
    .map((s, i) => normalizeSuggestion(s, params.context, i, existingFields));
  const unclassified = (parsed.unclassified || [])
    .concat(allRaw.filter((s) => s.category === "unclassified"))
    .map((s, i) => normalizeSuggestion(s, params.context, i + 100, existingFields));

  const seen = new Set<string>();
  const deduped = suggestions.filter((s) => {
    const key = `${s.category}:${s.originalText.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    rawExtractedText: parsed.raw_extracted_text || params.rawText,
    ...phi,
    suggestions: deduped,
    unclassified: [...new Map(unclassified.map((u) => [u.originalText, u])).values()],
  };
}

export async function runAiNoteCaptureExtract(params: {
  rawText: string;
  inputMode: AiNoteCaptureInputMode;
  context: AiNoteCaptureContext;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AiNoteCaptureExtractResult> {
  let rawText = params.rawText.trim();

  if (params.imageBase64 && params.imageMimeType) {
    try {
      rawText = await extractTextFromImage({
        imageBase64: params.imageBase64,
        mimeType: params.imageMimeType,
      });
    } catch (e) {
      console.error("[ai-note-capture] vision OCR failed, using mock OCR", e);
      if (!rawText) {
        const { mockOcrFromImageHint } = await import("./mockExtract");
        rawText = mockOcrFromImageHint();
      }
    }
  }

  if (!rawText) {
    return {
      rawExtractedText: "",
      phiDetected: false,
      phiWarning: null,
      riskyFragments: [],
      suggestions: [],
      unclassified: [],
    };
  }

  let existingPlanningFields: Record<string, string> = {};
  if (params.context.providerId) {
    existingPlanningFields = await loadProviderPlanningFieldValues(params.context.providerId);
  }

  const result = await openAiNoteCaptureExtract({
    rawText,
    inputMode: params.inputMode,
    context: params.context,
    existingPlanningFields,
  });

  return enrichExtractResultWithPlanningFields(result, params.context);
}

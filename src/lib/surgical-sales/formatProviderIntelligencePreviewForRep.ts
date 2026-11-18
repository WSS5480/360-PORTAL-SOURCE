/**
 * Rep-facing provider intelligence preview — grouped signals with human labels only.
 */

import { stripStoredIntelligenceEncoding } from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  buildIntelligenceLearningGaps,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  resolveIntelligenceFieldLifecycle,
  type IntelligenceSignalLifecycleState,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  assessIntelligenceFieldQuality,
  type IntelligenceFieldQualityAssessment,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  formatIntelligenceCaptureDisplay,
  intelligenceCaptureHasSignal,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { isLowQualityIntelligenceText } from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type RepIntelligencePreviewStatus = "Confirmed" | "Likely" | "Needs validation" | "Unknown";

export type RepIntelligencePreviewGroupId =
  | "clinical"
  | "access"
  | "scheduling"
  | "credentialing"
  | "workflow_fit"
  | "open_questions";

export type RepIntelligencePreviewItem = {
  text: string;
  status: RepIntelligencePreviewStatus;
  dbKey?: string;
};

export type RepIntelligencePreviewGroup = {
  id: RepIntelligencePreviewGroupId;
  title: string;
  items: RepIntelligencePreviewItem[];
};

export type RepIntelligencePreviewView = {
  groups: RepIntelligencePreviewGroup[];
  hasContent: boolean;
};

export type RepIntelligenceInsightCard = {
  id: string;
  title: string;
  detail: string;
  status: RepIntelligencePreviewStatus;
  dbKey?: string;
};

export type RepIntelligenceInsightCardsView = {
  cards: RepIntelligenceInsightCard[];
  hasContent: boolean;
};

const VARIABLE_LIKE_RE = /^(?:[a-z][a-z0-9]*)(?:_[a-z0-9]+)+$/i;
const CONCATENATED_MACHINE_BLOB_RE = /^(?:[a-z][a-z0-9]*_){4,}[a-z0-9]+$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACRONYM_PARTS = new Set(["acsis", "or", "sku", "pa", "erp"]);

/** Exact machine signal ids → rep copy. */
export const REP_INTELLIGENCE_SIGNAL_LABELS: Record<string, string> = {
  interest_in_acsis_discussed: "ACSIS interest was discussed",
  fit_strength_still_needs_confirmation_in_a_live_case: "Fit still needs confirmation in a live case",
  interest_in_acsis: "ACSIS interest noted",
  product_fit_still_needs_confirmation: "Product fit still needs confirmation",
  fit_strength_still_needs_confirmation: "Fit still needs confirmation",
  observe_a_case_to_validate_fit_strength: "Observe a case to validate fit",
  discussed_only: "Discussed — not yet validated in the field",
  partially_understood: "Partially understood — gaps remain",
  observed_in_field: "Observed in the field",
  fully_validated: "Validated in the field",
  credentialing_required: "Credentialing required before access",
  still_learning: "Still learning",
  early_signal: "Early signal — needs follow-up",
  operationally_inferred: "Inferred from recent touch — confirm live",
  provider_confirmed: "Confirmed with provider",
  observed_directly: "Observed directly",
};

function knownSignalKeysDescending(): string[] {
  return Object.keys(REP_INTELLIGENCE_SIGNAL_LABELS).sort((a, b) => b.length - a.length);
}

const FIELD_LABEL_BY_KEY = new Map<string, string>([
  ...PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
  ...ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label] as const),
]);

export const REP_INTELLIGENCE_PREVIEW_GROUP_META: Record<
  RepIntelligencePreviewGroupId,
  { title: string; dbKeys: readonly string[] }
> = {
  clinical: {
    title: "Clinical signals",
    dbKeys: [
      "provider_procedure_focus",
      "provider_technique_preferences",
      "provider_technique_detail",
      "provider_workflow_pain_points",
      "provider_case_volume_estimate",
      "provider_or_team_dynamics",
    ],
  },
  access: {
    title: "Access signals",
    dbKeys: [
      "provider_observation_feasibility",
      "provider_observation_access_path",
      "provider_ideal_observation_cases",
      "provider_first_observation_questions",
    ],
  },
  scheduling: {
    title: "Scheduling signals",
    dbKeys: [
      "provider_observation_scheduling_control",
      "provider_scheduling_contact",
      "provider_facility_scheduling_contact",
      "provider_observation_coordinator_contact",
      "provider_observation_cadence_preference",
      "provider_observation_best_days_case_types",
    ],
  },
  credentialing: {
    title: "Credentialing signals",
    dbKeys: [
      "provider_observation_credentialing_needed",
      "provider_credentialing_status",
      "provider_credentialing_platform_name",
      "provider_credentialing_contact",
      "provider_credentialing_approval_contact",
    ],
  },
  workflow_fit: {
    title: "Workflow fit",
    dbKeys: [
      "provider_evaluation_openness",
      "provider_competitive_products",
      "provider_preference_card_signals",
      "provider_dissatisfaction_areas",
      "provider_current_vendors",
    ],
  },
  open_questions: {
    title: "Still exploring",
    dbKeys: [],
  },
};

function titleCasePart(part: string): string {
  const lower = part.toLowerCase();
  if (ACRONYM_PARTS.has(lower)) return lower.toUpperCase();
  if (lower.length <= 3 && /^[a-z]+$/.test(lower)) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function isMachineGeneratedIntelligenceLabel(text: string | null | undefined): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;
  if (UUID_RE.test(trimmed)) return true;
  if (VARIABLE_LIKE_RE.test(trimmed)) return true;
  if (/^\{[\s\S]*\}$/.test(trimmed)) return true;
  if (isLowQualityIntelligenceText(trimmed)) return true;
  return false;
}

function inferPhraseFromSnakeToken(token: string): string | null {
  const key = token.trim().toLowerCase();
  if (!key) return null;
  const exact = REP_INTELLIGENCE_SIGNAL_LABELS[key];
  if (exact) return exact;

  if (key.startsWith("interest_in_") && key.endsWith("_discussed")) {
    const product = key.slice("interest_in_".length, -"_discussed".length);
    const label = product.split("_").map(titleCasePart).join(" ");
    return `${label} interest was discussed`;
  }

  if (key.includes("still_needs_confirmation")) {
    const prefix = key.split("still_needs_confirmation")[0]?.replace(/_+$/g, "") ?? "";
    if (prefix.includes("fit_strength") || prefix.includes("product_fit") || prefix.includes("fit")) {
      if (key.includes("live_case")) {
        return "Fit still needs confirmation in a live case";
      }
      return "Fit still needs confirmation";
    }
    const subject = prefix
      .replace(/^fit_strength_?/, "")
      .replace(/_+/g, " ")
      .trim();
    if (subject) {
      return `${subject.split(" ").map(titleCasePart).join(" ")} still needs confirmation`;
    }
    return "Still needs confirmation";
  }

  if (key.endsWith("_discussed")) {
    const stem = key.slice(0, -"_discussed".length).replace(/_+/g, " ");
    return `${stem.split(" ").map(titleCasePart).join(" ")} was discussed`;
  }

  if (key.startsWith("observe_a_case_to_validate_")) {
    const subject = key.slice("observe_a_case_to_validate_".length).replace(/_+/g, " ");
    if (!subject) return "Observe a case to validate fit";
    return `Observe a case to validate ${subject.split(" ").map(titleCasePart).join(" ").toLowerCase()}`;
  }

  return null;
}

/** Convert snake_case tokens to plain English when no known mapping exists. */
export function humanizeSnakeCaseLabel(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const inferred = inferPhraseFromSnakeToken(trimmed);
  if (inferred) return inferred;
  return trimmed
    .split("_")
    .filter(Boolean)
    .map(titleCasePart)
    .join(" ");
}

/** Rep-safe display text — never returns raw snake_case machine tokens when avoidable. */
export function formatRepFacingDisplayText(raw: string | null | undefined, dbKey?: string): string | null {
  const translated = translateRepIntelligenceText(raw, dbKey);
  if (translated) return translated;

  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (isMachineGeneratedIntelligenceLabel(trimmed)) {
    const humanized = humanizeSnakeCaseLabel(trimmed);
    return humanized && !isMachineGeneratedIntelligenceLabel(humanized) ? humanized : null;
  }
  return trimmed;
}

export type RepInsightCategoryLabel =
  | "Clinical interest"
  | "Fit validation"
  | "Workflow friction"
  | "Access notes"
  | "Still exploring";

export function repInsightCategoryLabel(card: RepIntelligenceInsightCard): RepInsightCategoryLabel {
  const title = card.title.toLowerCase();
  const dbKey = String(card.dbKey ?? "").toLowerCase();

  if (title.includes("open question") || title.includes("still exploring") || card.id.startsWith("gap-")) {
    return "Still exploring";
  }
  if (
    title.includes("fit") ||
    dbKey.includes("evaluation_openness") ||
    dbKey.includes("product_fit") ||
    dbKey.includes("preference_card")
  ) {
    return "Fit validation";
  }
  if (
    title.includes("workflow") ||
    title.includes("friction") ||
    dbKey.includes("workflow_pain") ||
    dbKey.includes("staff_process") ||
    dbKey.includes("dissatisfaction")
  ) {
    return "Workflow friction";
  }
  if (
    title.includes("access") ||
    title.includes("observation") ||
    title.includes("credential") ||
    title.includes("scheduling") ||
    dbKey.includes("observation_") ||
    dbKey.includes("credentialing") ||
    dbKey.includes("scheduling")
  ) {
    return "Access notes";
  }
  return "Clinical interest";
}

export function withRepInsightCategoryTitles(cards: RepIntelligenceInsightCard[]): RepIntelligenceInsightCard[] {
  return cards.map((card) => ({
    ...card,
    title: repInsightCategoryLabel(card),
  }));
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeSegmentKey(key: string): string {
  return key.trim().toLowerCase().replace(/^_+|_+$/g, "");
}

/** Split concatenated machine signal blobs (no separators) into individual tokens. */
export function parseMachineIntelligenceSegments(raw: string | null | undefined): string[] {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return [];

  const pipeIdx = trimmed.indexOf("|");
  if (pipeIdx >= 0) {
    const token = trimmed.slice(0, pipeIdx).trim();
    const tail = trimmed.slice(pipeIdx + 1).trim();
    const headSegments = parseMachineIntelligenceSegments(token);
    return tail ? [...headSegments, tail] : headSegments;
  }

  const lower = trimmed.toLowerCase();
  const looksConcatenated =
    CONCATENATED_MACHINE_BLOB_RE.test(lower) ||
    (VARIABLE_LIKE_RE.test(lower) && lower.length > 36 && (lower.match(/_/g)?.length ?? 0) >= 4);

  if (!looksConcatenated && !isMachineGeneratedIntelligenceLabel(trimmed)) {
    return [trimmed];
  }

  const segments: string[] = [];
  let remaining = lower.replace(/[^a-z0-9_]/g, "");

  const tryDynamic = (input: string): string | null => {
    const interest = input.match(/^(interest_in_[a-z0-9]+_discussed)/);
    if (interest) return interest[1]!;
    const fit = input.match(/^(fit_strength_still_needs_confirmation(?:_in_a_live_case)?)/);
    if (fit) return fit[1]!;
    const observe = input.match(/^(observe_a_case_to_validate_[a-z0-9_]+)/);
    if (observe) return observe[1]!;
    const productFit = input.match(/^(product_fit_still_needs_confirmation(?:_in_a_live_case)?)/);
    if (productFit) return productFit[1]!;
    return null;
  };

  let guard = 0;
  while (remaining.length > 0 && guard++ < 24) {
    let matched: string | null = null;
    for (const key of knownSignalKeysDescending()) {
      if (remaining === key || remaining.startsWith(`${key}_`)) {
        matched = key;
        break;
      }
    }
    if (!matched) matched = tryDynamic(remaining);
    if (!matched) break;

    segments.push(matched);
    remaining = remaining.slice(matched.length);
    if (remaining.startsWith("_")) remaining = remaining.slice(1);
  }

  if (segments.length > 0) return segments;
  if (VARIABLE_LIKE_RE.test(lower)) return [lower];
  return [trimmed];
}

function translateSingleSegment(segment: string, dbKey?: string): string | null {
  const key = normalizeSegmentKey(segment);
  const fromCapture = dbKey ? formatIntelligenceCaptureDisplay(dbKey, key) : null;
  let text = stripStoredIntelligenceEncoding(fromCapture ?? key);
  if (!text) return null;

  if (isMachineGeneratedIntelligenceLabel(text)) {
    const inferred = inferPhraseFromSnakeToken(text) ?? humanizeSnakeCaseLabel(text);
    return collapseWhitespace(inferred) || null;
  }

  const sanitized = sanitizeFieldIntelligenceText(text, { maxLen: 400 });
  if (!sanitized) return null;
  if (isMachineGeneratedIntelligenceLabel(sanitized)) {
    const rescue = inferPhraseFromSnakeToken(sanitized);
    return rescue ? collapseWhitespace(rescue) : null;
  }
  return sanitized;
}

function discoveryPhraseForSegment(segment: string, translated: string): string {
  const key = normalizeSegmentKey(segment);
  if (key.startsWith("interest_in_") && key.endsWith("_discussed")) {
    return "Discussed during discovery";
  }
  if (key.includes("still_needs_confirmation")) {
    return "Still needs observation confirmation";
  }
  if (/discussed/i.test(translated) && !/confirmation/i.test(translated)) {
    return "Discussed during discovery";
  }
  return translated;
}

function insightTitleForSegment(dbKey: string, segment: string, translated: string): string {
  const key = normalizeSegmentKey(segment);
  if (key.startsWith("interest_in_") && key.includes("acsis")) return "ACSIS Interest";
  if (key.startsWith("interest_in_")) {
    const product = key.slice("interest_in_".length).replace(/_discussed$/, "");
    const label = product.split("_").map(titleCasePart).join(" ");
    return `${label} Interest`;
  }
  if (key.includes("fit_strength") || key.includes("product_fit") || key.includes("still_needs_confirmation")) {
    return "Fit Validation";
  }
  if (dbKey === "provider_procedure_focus") return "Recommended Observation Focus";
  if (dbKey === "provider_technique_preferences") return "Technique signal";
  if (dbKey === "provider_workflow_pain_points") return "Workflow friction";
  if (dbKey === "provider_observation_feasibility") return "Observation access";
  if (dbKey === "provider_credentialing_status") return "Credentialing";
  if (/acsis/i.test(translated)) return "ACSIS Interest";
  return fieldLabelForRepPreview(dbKey);
}

export function translateRepIntelligenceText(
  raw: string | null | undefined,
  dbKey?: string,
): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  const segments = parseMachineIntelligenceSegments(trimmed);
  if (segments.length > 1) {
    const parts = segments
      .map((segment) => translateSingleSegment(segment, dbKey))
      .filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  const fromCapture = dbKey ? formatIntelligenceCaptureDisplay(dbKey, trimmed) : null;
  let text = stripStoredIntelligenceEncoding(fromCapture ?? trimmed);
  if (!text) return null;

  if (isMachineGeneratedIntelligenceLabel(text)) {
    const inferred = inferPhraseFromSnakeToken(text) ?? humanizeSnakeCaseLabel(text);
    return collapseWhitespace(inferred) || null;
  }

  text = text.replace(SNAKE_TOKEN_INLINE_RE, (match) => {
    if (isMachineGeneratedIntelligenceLabel(match)) {
      return inferPhraseFromSnakeToken(match) ?? humanizeSnakeCaseLabel(match);
    }
    return match;
  });

  const sanitized = sanitizeFieldIntelligenceText(text, { maxLen: 400 });
  if (!sanitized) return null;
  if (isMachineGeneratedIntelligenceLabel(sanitized)) {
    const rescue = inferPhraseFromSnakeToken(sanitized);
    return rescue ? collapseWhitespace(rescue) : null;
  }
  return sanitized;
}

const SNAKE_TOKEN_INLINE_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;

export function formatRepIntelligenceFieldValue(
  dbKey: string,
  raw: string | null | undefined,
): string | null {
  if (!intelligenceCaptureHasSignal(dbKey, raw) && !fieldHasIntelligenceSignal(dbKey, raw)) {
    return null;
  }
  return translateRepIntelligenceText(raw, dbKey);
}

function expandFieldToInsightCards(
  dbKey: string,
  raw: string | null | undefined,
  contact: Record<string, unknown>,
  fieldMetadata: ProviderIntelligenceFieldMetadataMap,
  cardIdPrefix: string,
): RepIntelligenceInsightCard[] {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return [];
  if (!intelligenceCaptureHasSignal(dbKey, trimmed) && !fieldHasIntelligenceSignal(dbKey, trimmed)) {
    return [];
  }

  const status = resolveRepIntelligencePreviewStatus(dbKey, contact, fieldMetadata);
  const segments = parseMachineIntelligenceSegments(trimmed);

  return segments.flatMap((segment, index): RepIntelligenceInsightCard[] => {
    const translated = translateSingleSegment(segment, dbKey);
    if (!translated) return [];
    const title = insightTitleForSegment(dbKey, segment, translated);
    const detail =
      segments.length > 1 && isMachineGeneratedIntelligenceLabel(segment)
        ? discoveryPhraseForSegment(segment, translated)
        : translated;
    return [
      {
        id: `${cardIdPrefix}-${dbKey}-${index}`,
        title,
        detail,
        status,
        dbKey,
      },
    ];
  });
}

function lifecycleToRepStatus(
  lifecycle: IntelligenceSignalLifecycleState | null,
  assessment: IntelligenceFieldQualityAssessment,
): RepIntelligencePreviewStatus {
  if (lifecycle === "validated" || lifecycle === "confirmed") return "Confirmed";
  if (lifecycle === "outdated" || assessment.depth === "weak") return "Needs validation";
  if (lifecycle === "assumed" || lifecycle === "captured") return "Likely";
  if (assessment.depth === "validated") return "Confirmed";
  if (assessment.depth === "structured") return "Likely";
  return "Needs validation";
}

export function resolveRepIntelligencePreviewStatus(
  dbKey: string,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): RepIntelligencePreviewStatus {
  const raw = contact[dbKey] as string | null | undefined;
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return "Unknown";

  const meta = fieldMetadata?.[dbKey];
  const lifecycle = resolveIntelligenceFieldLifecycle(dbKey, raw, meta)?.state ?? null;
  const assessment = assessIntelligenceFieldQuality(dbKey, raw);
  return lifecycleToRepStatus(lifecycle, assessment);
}

function gapToRepStatus(gap: IntelligenceLearningGap): RepIntelligencePreviewStatus {
  if (gap.state === "unknown") return "Unknown";
  if (gap.state === "outdated") return "Needs validation";
  return "Needs validation";
}

function buildFieldItems(
  dbKeys: readonly string[],
  contact: Record<string, unknown>,
  fieldMetadata: ProviderIntelligenceFieldMetadataMap,
  maxItems: number,
): RepIntelligencePreviewItem[] {
  const items: RepIntelligencePreviewItem[] = [];
  for (const dbKey of dbKeys) {
    if (items.length >= maxItems) break;
    const raw = contact[dbKey] as string | null | undefined;
    const cards = expandFieldToInsightCards(dbKey, raw, contact, fieldMetadata, "preview");
    for (const card of cards) {
      if (items.length >= maxItems) break;
      items.push({
        dbKey: card.dbKey,
        text: card.detail === card.title ? card.title : `${card.title}: ${card.detail}`,
        status: card.status,
      });
    }
  }
  return items;
}

export function buildProviderIntelligenceInsightCards(
  contact: Record<string, unknown>,
  options?: {
    planning?: ProviderPlanningCompletion | null;
    maxCards?: number;
    maxOpenQuestions?: number;
  },
): RepIntelligenceInsightCardsView {
  const maxCards = options?.maxCards ?? 12;
  const maxOpenQuestions = options?.maxOpenQuestions ?? 3;
  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );

  const cards: RepIntelligenceInsightCard[] = [];
  const seen = new Set<string>();

  const pushCard = (card: RepIntelligenceInsightCard) => {
    if (cards.length >= maxCards) return;
    const key = `${card.title.toLowerCase()}::${card.detail.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    cards.push(card);
  };

  for (const id of [
    "workflow_fit",
    "clinical",
    "access",
    "scheduling",
    "credentialing",
  ] as const) {
    const meta = REP_INTELLIGENCE_PREVIEW_GROUP_META[id];
    for (const dbKey of meta.dbKeys) {
      const raw = contact[dbKey] as string | null | undefined;
      for (const card of expandFieldToInsightCards(dbKey, raw, contact, fieldMetadata, id)) {
        pushCard(card);
      }
    }
  }

  const gaps = buildIntelligenceLearningGaps(contact, options?.planning ?? null, maxOpenQuestions);
  for (const gap of gaps) {
    const translated = translateRepIntelligenceText(gap.phrase) ?? gap.phrase;
    if (!translated || isMachineGeneratedIntelligenceLabel(translated)) continue;
    pushCard({
      id: `gap-${gap.dbKey}`,
      title: gap.dbKey === "provider_procedure_focus" ? "Recommended Observation Focus" : "Open question",
      detail: translated,
      status: gapToRepStatus(gap),
      dbKey: gap.dbKey,
    });
  }

  return { cards, hasContent: cards.length > 0 };
}

export function buildProviderIntelligencePreviewForRep(
  contact: Record<string, unknown>,
  options?: {
    planning?: ProviderPlanningCompletion | null;
    maxItemsPerGroup?: number;
    maxOpenQuestions?: number;
  },
): RepIntelligencePreviewView {
  const maxPerGroup = options?.maxItemsPerGroup ?? 4;
  const maxOpenQuestions = options?.maxOpenQuestions ?? 3;
  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );

  const groups: RepIntelligencePreviewGroup[] = [];

  for (const id of [
    "clinical",
    "access",
    "scheduling",
    "credentialing",
    "workflow_fit",
  ] as const) {
    const meta = REP_INTELLIGENCE_PREVIEW_GROUP_META[id];
    const items = buildFieldItems(meta.dbKeys, contact, fieldMetadata, maxPerGroup);
    if (items.length > 0) {
      groups.push({ id, title: meta.title, items });
    }
  }

  const gaps = buildIntelligenceLearningGaps(contact, options?.planning ?? null, maxOpenQuestions);
  const openItems: RepIntelligencePreviewItem[] = gaps
    .map((gap) => ({
      text: translateRepIntelligenceText(gap.phrase) ?? gap.phrase,
      status: gapToRepStatus(gap),
      dbKey: gap.dbKey,
    }))
    .filter((item) => item.text && !isMachineGeneratedIntelligenceLabel(item.text));

  if (openItems.length > 0) {
    groups.push({
      id: "open_questions",
      title: REP_INTELLIGENCE_PREVIEW_GROUP_META.open_questions.title,
      items: openItems,
    });
  }

  return {
    groups,
    hasContent: groups.some((g) => g.items.length > 0),
  };
}

export function fieldLabelForRepPreview(dbKey: string): string {
  return FIELD_LABEL_BY_KEY.get(dbKey) ?? humanizeSnakeCaseLabel(dbKey.replace(/^provider_/, ""));
}

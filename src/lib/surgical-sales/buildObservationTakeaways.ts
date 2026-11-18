import { extractFieldObservationNoteEntities, entityToTakeawayText } from "@/lib/surgical-sales/fieldObservationIntelligence";
import { isActionableIntelligenceFinding } from "@/lib/surgical-sales/observationFindingQuality";
import type { ObservationNoteExtraction } from "@/lib/surgical-sales/extractObservationNoteEntities";

export type ObservationTakeawaySource = {
  kind: "note" | "case_field" | "provider" | "prior_case" | "debrief";
  label: string;
  detail?: string;
};

export type ObservationTakeaway = {
  id: string;
  text: string;
  sources: ObservationTakeawaySource[];
  relevance: number;
};

export const OBSERVATION_TAKEAWAY_PREVIEW_COUNT = 5;

const CASE_FIELD_SOURCES: Array<{ key: string; label: string }> = [
  { key: "live_observation_competitors", label: "This case" },
  { key: "live_observation_product_fit", label: "This case" },
  { key: "live_observation_clinical_pain_points", label: "This case" },
  { key: "live_observation_workflow", label: "This case" },
  { key: "live_observation_staff_process", label: "This case" },
  { key: "live_observation_surgeon_reactions", label: "This case" },
  { key: "debrief_key_findings", label: "Debrief" },
];

const PROVIDER_FIELD_SOURCES: Array<{ key: string; label: string }> = [
  { key: "provider_competitive_products", label: "Provider profile" },
  { key: "provider_current_vendors", label: "Provider profile" },
  { key: "provider_workflow_pain_points", label: "Provider profile" },
  { key: "provider_clinical_frustrations", label: "Provider profile" },
  { key: "provider_staff_frustrations", label: "Provider profile" },
  { key: "provider_future_opportunity_signals", label: "Provider profile" },
  { key: "provider_procedure_focus", label: "Provider profile" },
  { key: "provider_product_interests", label: "Provider profile" },
];

type NoteActivity = {
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
};

type PriorCaseRow = {
  id: string;
  procedure_type?: string | null;
  case_date?: string | null;
  live_observation_competitors?: unknown;
  live_observation_product_fit?: unknown;
  live_observation_workflow?: unknown;
  live_observation_clinical_pain_points?: unknown;
  live_observation_staff_process?: unknown;
};

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function takeawayTokens(text: string): Set<string> {
  return new Set(
    normalizeKey(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 3),
  );
}

function takeawayOverlapScore(left: string, right: string): number {
  const leftTokens = takeawayTokens(left);
  const rightTokens = takeawayTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }
  return shared / Math.min(leftTokens.size, rightTokens.size);
}

function findSimilarTakeawayKey(map: Map<string, ObservationTakeaway>, text: string): string | null {
  const key = normalizeKey(text);
  if (map.has(key)) return key;

  for (const [existingKey, existing] of map.entries()) {
    if (key.includes(existingKey) || existingKey.includes(key)) return existingKey;
    if (takeawayOverlapScore(text, existing.text) >= 0.55) return existingKey;
  }

  return null;
}

function preferTakeawayText(left: string, right: string): string {
  const leftStructured = /^(competitor|product|staff|procedure|room|open to|visualization)/i.test(left);
  const rightStructured = /^(competitor|product|staff|procedure|room|open to|visualization)/i.test(right);
  if (leftStructured && !rightStructured) return left;
  if (rightStructured && !leftStructured) return right;
  return left.length >= right.length ? left : right;
}

function readStoredExtraction(metadata: Record<string, unknown> | null | undefined): ObservationNoteExtraction | null {
  const raw = metadata?.ai_extraction;
  if (!raw || typeof raw !== "object") return null;
  const entities = Array.isArray((raw as ObservationNoteExtraction).entities)
    ? (raw as ObservationNoteExtraction).entities
    : [];
  if (entities.length === 0) return null;
  return raw as ObservationNoteExtraction;
}

function pushTakeaway(
  map: Map<string, ObservationTakeaway>,
  text: string,
  source: ObservationTakeawaySource,
  relevanceBoost = 0,
) {
  const trimmed = text.trim();
  if (!trimmed || !isActionableIntelligenceFinding(trimmed)) return;
  const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const similarKey = findSimilarTakeawayKey(map, formatted);
  if (similarKey) {
    const existing = map.get(similarKey)!;
    existing.text = preferTakeawayText(existing.text, formatted);
    if (!existing.sources.some((s) => s.label === source.label && s.detail === source.detail)) {
      existing.sources.push(source);
    }
    existing.relevance += relevanceBoost;
    return;
  }

  const key = normalizeKey(formatted);
  map.set(key, {
    id: key.slice(0, 48),
    text: formatted,
    sources: [source],
    relevance: 10 + relevanceBoost,
  });
}

function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function takeawaysFromExtraction(
  extraction: ObservationNoteExtraction,
  source: ObservationTakeawaySource,
  map: Map<string, ObservationTakeaway>,
  relevanceBoost: number,
) {
  for (const entity of extraction.entities) {
    const text = entityToTakeawayText(entity);
    if (text) pushTakeaway(map, text, source, relevanceBoost);
  }
}

export function buildObservationTakeaways(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
  providerContact?: Record<string, unknown> | null;
  priorCases?: PriorCaseRow[];
}): ObservationTakeaway[] {
  const map = new Map<string, ObservationTakeaway>();

  for (const activity of input.activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const body = String(activity.body ?? "").trim();
    const source: ObservationTakeawaySource = {
      kind: "note",
      label: "This case note",
      detail: body.length > 120 ? `${body.slice(0, 117)}…` : body,
    };

    const stored = readStoredExtraction(activity.metadata_json ?? null);
    if (stored) {
      takeawaysFromExtraction(stored, source, map, 8);
    } else {
      takeawaysFromExtraction(extractFieldObservationNoteEntities(body), source, map, 6);
    }
  }

  for (const { key, label } of CASE_FIELD_SOURCES) {
    for (const line of linesFromField(input.caseRow[key])) {
      pushTakeaway(map, line, { kind: "case_field", label, detail: line }, 4);
    }
  }

  if (input.providerContact) {
    for (const { key, label } of PROVIDER_FIELD_SOURCES) {
      for (const line of linesFromField(input.providerContact[key])) {
        pushTakeaway(map, line, { kind: "provider", label, detail: line }, 2);
      }
    }
  }

  for (const prior of input.priorCases ?? []) {
    const caseLabel = prior.procedure_type
      ? `Prior case: ${prior.procedure_type}`
      : "Prior observation case";
    const fields = [
      "live_observation_competitors",
      "live_observation_product_fit",
      "live_observation_workflow",
      "live_observation_clinical_pain_points",
      "live_observation_staff_process",
    ] as const;
    for (const field of fields) {
      for (const line of linesFromField(prior[field])) {
        pushTakeaway(
          map,
          line,
          { kind: "prior_case", label: caseLabel, detail: line },
          1,
        );
      }
    }
  }

  return [...map.values()].sort((left, right) => right.relevance - left.relevance);
}

export function splitObservationTakeawayPreview(takeaways: ObservationTakeaway[]): {
  preview: ObservationTakeaway[];
  hiddenCount: number;
} {
  const preview = takeaways.slice(0, OBSERVATION_TAKEAWAY_PREVIEW_COUNT);
  return {
    preview,
    hiddenCount: Math.max(0, takeaways.length - preview.length),
  };
}

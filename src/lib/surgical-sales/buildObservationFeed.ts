import type {
  ObservationNoteEntityType,
  ObservationNoteExtraction,
} from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isUsableObservationEntity,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";

export type ObservationFeedSignalKind =
  | "extracted_signal"
  | "provider_statement"
  | "staff_statement"
  | "competitor_mention"
  | "product_signal";

export const OBSERVATION_FEED_SIGNAL_LABELS: Record<ObservationFeedSignalKind, string> = {
  extracted_signal: "Extracted Signal",
  provider_statement: "Provider Statement",
  staff_statement: "Staff Statement",
  competitor_mention: "Competitor Mention",
  product_signal: "Product Signal",
};

export type ObservationFeedSignal = {
  id: string;
  kind: ObservationFeedSignalKind;
  label: string;
  text: string;
  confidence: string | null;
};

export type ObservationFeedEntry = {
  id: string;
  timestamp: string;
  noteText: string;
  signals: ObservationFeedSignal[];
};

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
};

function parseAiExtraction(metadata: Record<string, unknown> | null | undefined): ObservationNoteExtraction | null {
  const raw = metadata?.ai_extraction;
  if (!raw || typeof raw !== "object") return null;
  const extraction = raw as ObservationNoteExtraction;
  if (!Array.isArray(extraction.entities)) return null;
  return extraction;
}

function feedSignalKindForEntity(type: ObservationNoteEntityType): ObservationFeedSignalKind | null {
  switch (type) {
    case "competitor_signal":
      return "competitor_mention";
    case "product_signal":
      return "product_signal";
    case "staff_signal":
      return "staff_statement";
    case "provider_behavior_signal":
    case "procedure_focus":
      return "provider_statement";
    case "clinical_pain_signal":
    case "workflow_friction_signal":
    case "workflow_signal":
    case "growth_signal":
    case "follow_up_signal":
      return "extracted_signal";
    case "scheduling_contact":
      return null;
    default:
      return "extracted_signal";
  }
}

function formatFeedSignalText(_type: ObservationNoteEntityType, finding: string): string {
  return finding.trim();
}

function entitiesToFeedSignals(
  noteId: string,
  extraction: ObservationNoteExtraction | null,
): ObservationFeedSignal[] {
  if (!extraction) return [];

  const signals: ObservationFeedSignal[] = [];
  const seen = new Set<string>();

  for (const [index, entity] of extraction.entities.entries()) {
    if (!isUsableObservationEntity(entity)) continue;
    const kind = feedSignalKindForEntity(entity.type);
    if (!kind) continue;

    const text = formatFeedSignalText(entity.type, observationEntityFinding(entity));
    if (!text) continue;

    const key = `${kind}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    signals.push({
      id: `${noteId}:signal:${index}`,
      kind,
      label: OBSERVATION_FEED_SIGNAL_LABELS[kind],
      text,
      confidence: entity.confidence ?? null,
    });
  }

  return signals;
}

export function formatObservationFeedTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildObservationFeed(
  activities: ActivityInput[] | undefined,
  limit?: number,
): ObservationFeedEntry[] {
  const entries = [...(activities ?? [])]
    .filter((activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note")
    .map((activity) => {
      const noteText = String(activity.body ?? "").trim();
      const extraction = parseAiExtraction(activity.metadata_json);
      return {
        id: activity.id,
        timestamp: activity.created_at,
        noteText,
        signals: entitiesToFeedSignals(activity.id, extraction),
      };
    })
    .filter((entry) => entry.noteText.length > 0)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return limit != null ? entries.slice(0, limit) : entries;
}

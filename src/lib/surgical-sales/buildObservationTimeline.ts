import type { ObservationNoteExtraction } from "@/lib/surgical-sales/extractObservationNoteEntities";

export type ObservationTimelineExtractedEntity = {
  label: string;
  value: string;
  category: string;
  confidence: string;
};

export type ObservationTimelineEntry = {
  id: string;
  timestamp: string;
  text: string;
  extraction: ObservationTimelineExtractedEntity[] | null;
  primaryCategory: string | null;
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

export function formatObservationTimelineTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function buildObservationTimeline(activities: ActivityInput[] | undefined): ObservationTimelineEntry[] {
  return [...(activities ?? [])]
    .filter((activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note")
    .map((activity) => {
      const extraction = parseAiExtraction(activity.metadata_json);
      return {
        id: activity.id,
        timestamp: activity.created_at,
        text: String(activity.body ?? "").trim(),
        extraction:
          extraction?.entities.map((entity) => ({
            label: entity.label,
            value: entity.finding ?? entity.value ?? "",
            evidence: entity.evidence ?? "",
            category: entity.category,
            confidence: entity.confidence,
          })) ?? null,
        primaryCategory: extraction?.primaryCategory ?? null,
      };
    })
    .filter((entry) => entry.text.length > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

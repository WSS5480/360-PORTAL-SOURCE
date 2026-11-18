import type { ProductSupportNoteAiExtraction } from "@/lib/surgical-sales/processProductSupportNoteCapture";
import { productSupportObservationClassificationLabel } from "@/lib/surgical-sales/productSupportObservationTimeline";

export type ProductSupportTimelineEntryKind = "voice_note" | "quick_note" | "ai_insight";

export type ProductSupportTimelineEntry = {
  id: string;
  kind: ProductSupportTimelineEntryKind;
  timestamp: string;
  label: string;
  body: string;
  actor: string;
};

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

function captureMode(metadata: Record<string, unknown> | null | undefined): "voice" | "quick" | null {
  const mode = String(metadata?.capture_mode ?? "").trim().toLowerCase();
  if (mode === "voice" || mode === "quick") return mode;
  return null;
}

function aiInsightRows(
  activityId: string,
  timestamp: string,
  actor: string,
  metadata: Record<string, unknown> | null | undefined,
): ProductSupportTimelineEntry[] {
  const extraction = metadata?.ai_extraction;
  if (!extraction || typeof extraction !== "object") return [];

  const typed = extraction as ProductSupportNoteAiExtraction;
  const rows: ProductSupportTimelineEntry[] = [];
  const classification = productSupportObservationClassificationLabel(metadata);

  if (classification) {
    rows.push({
      id: `${activityId}:insight:primary`,
      kind: "ai_insight",
      timestamp,
      label: classification,
      body: typed.productSupport?.summary ?? "",
      actor: "AI",
    });
  }

  for (const [index, entity] of (typed.observation?.entities ?? []).entries()) {
    const finding = String(entity.finding ?? entity.value ?? "").trim();
    if (!finding) continue;
    rows.push({
      id: `${activityId}:insight:${index}`,
      kind: "ai_insight",
      timestamp,
      label: entity.label,
      body: finding,
      actor: "AI",
    });
  }

  return rows;
}

export function buildProductSupportObservationTimelineEntries(
  activities: ActivityInput[] | undefined,
  defaultActor: string,
  limit = 50,
): ProductSupportTimelineEntry[] {
  const notes = [...(activities ?? [])]
    .filter((activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const entries: ProductSupportTimelineEntry[] = [];

  for (const note of notes) {
    if (entries.length >= limit) break;

    const actor = note.actor_display_name?.trim() || defaultActor || "Rep";
    const mode = captureMode(note.metadata_json);
    const body = String(note.body ?? "").trim();
    if (!body) continue;

    entries.push({
      id: note.id,
      kind: mode === "voice" ? "voice_note" : "quick_note",
      timestamp: note.created_at,
      label: mode === "voice" ? "Voice Note" : "Quick Note",
      body,
      actor,
    });

    for (const insight of aiInsightRows(note.id, note.created_at, actor, note.metadata_json)) {
      if (entries.length >= limit) break;
      entries.push(insight);
    }
  }

  return entries;
}

export function formatProductSupportTimelineTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

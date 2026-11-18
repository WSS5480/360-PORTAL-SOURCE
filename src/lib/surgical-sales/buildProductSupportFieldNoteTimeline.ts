export type ProductSupportFieldNoteEntry = {
  id: string;
  noteId: string | null;
  timestamp: string;
  body: string;
  actor: string;
  captureMode: "voice" | "quick" | "note";
};

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

function readCaptureMode(metadata: Record<string, unknown> | null | undefined): "voice" | "quick" | "note" {
  const mode = String(metadata?.capture_mode ?? "").trim().toLowerCase();
  if (mode === "voice") return "voice";
  if (mode === "quick") return "quick";
  return "note";
}

export function buildProductSupportFieldNoteTimeline(
  activities: ActivityInput[] | undefined,
  defaultActor: string,
  limit = 80,
): ProductSupportFieldNoteEntry[] {
  return [...(activities ?? [])]
    .filter((activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note")
    .map((note) => {
      const body = String(note.body ?? "").trim();
      if (!body) return null;
      const noteId =
        String(note.metadata_json?.note_id ?? "").trim() || String(note.id ?? "").trim() || null;
      return {
        id: note.id,
        noteId,
        timestamp: note.created_at,
        body,
        actor: note.actor_display_name?.trim() || defaultActor || "Rep",
        captureMode: readCaptureMode(note.metadata_json),
      };
    })
    .filter((entry): entry is ProductSupportFieldNoteEntry => entry != null)
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .slice(-limit);
}

export function formatProductSupportFieldNoteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

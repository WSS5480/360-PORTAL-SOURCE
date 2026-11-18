import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

export type ObservationWatchItemSource = "manual" | "provider_signal" | "procedural_context" | "chip";

export type ObservationWatchItemStatus = "planned" | "observed";

export type ObservationWatchItem = {
  id: string;
  label: string;
  source: ObservationWatchItemSource;
  status: ObservationWatchItemStatus;
  created_at: string;
};

export const OBSERVATION_WATCH_PRESETS = [
  "Workflow fit",
  "Fixation technique",
  "Visualization challenges",
  "Current product usage",
  "Surgeon feedback",
  "Staff workflow friction",
] as const;

export function parseObservationWatchItems(raw: unknown): ObservationWatchItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ObservationWatchItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    const id = String(row.id ?? "").trim();
    if (!label || !id) continue;
    const source = String(row.source ?? "manual") as ObservationWatchItemSource;
    const statusRaw = String(row.status ?? "planned");
    const status: ObservationWatchItemStatus = statusRaw === "observed" ? "observed" : "planned";
    items.push({
      id,
      label,
      source: ["manual", "provider_signal", "procedural_context", "chip"].includes(source) ? source : "manual",
      status,
      created_at: String(row.created_at ?? new Date().toISOString()),
    });
  }
  return items;
}

export function formatObservationWatchItemLabel(label: string, dbKey?: string): string {
  return formatRepFacingDisplayText(label, dbKey) ?? label.trim();
}

export function observationWatchItemsFromCaseRow(caseRow: Record<string, unknown>): ObservationWatchItem[] {
  return parseObservationWatchItems(caseRow.observation_validation_targets);
}

export function createObservationWatchItem(label: string, source: ObservationWatchItemSource = "manual"): ObservationWatchItem {
  return {
    id: crypto.randomUUID(),
    label: label.trim(),
    source,
    status: "planned",
    created_at: new Date().toISOString(),
  };
}

export function addObservationWatchItem(
  items: ObservationWatchItem[],
  label: string,
  source: ObservationWatchItemSource = "manual",
): ObservationWatchItem[] {
  const trimmed = label.trim();
  if (!trimmed) return items;
  const lower = trimmed.toLowerCase();
  if (items.some((item) => item.label.toLowerCase() === lower)) return items;
  return [...items, createObservationWatchItem(trimmed, source)];
}

export function removeObservationWatchItem(items: ObservationWatchItem[], id: string): ObservationWatchItem[] {
  return items.filter((item) => item.id !== id);
}

export function setObservationWatchItemStatus(
  items: ObservationWatchItem[],
  id: string,
  status: ObservationWatchItemStatus,
): ObservationWatchItem[] {
  return items.map((item) => (item.id === id ? { ...item, status } : item));
}

export function unusedObservationWatchPresets(items: ObservationWatchItem[]): string[] {
  const existing = new Set(items.map((item) => item.label.toLowerCase()));
  return OBSERVATION_WATCH_PRESETS.filter((preset) => !existing.has(preset.toLowerCase()));
}

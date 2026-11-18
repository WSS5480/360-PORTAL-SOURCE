export const PREPARE_CHECKLIST_ITEMS = [
  { key: "provider_snapshot", label: "Provider snapshot" },
  { key: "upcoming_engagement", label: "Upcoming engagement" },
  { key: "at_a_glance", label: "At a glance" },
  { key: "known_intelligence", label: "Known intelligence" },
  { key: "talking_points", label: "Talking points" },
  { key: "suggested_goal", label: "Suggested goal" },
  { key: "risks_barriers", label: "Deployment risk" },
  { key: "next_actions", label: "Next actions" },
] as const;

export type PrepareChecklistKey = (typeof PREPARE_CHECKLIST_ITEMS)[number]["key"];

export type PrepareChecklistJson = {
  completed?: Partial<Record<PrepareChecklistKey, boolean>>;
  completed_at?: string;
};

export function buildCompletedPrepareChecklist(nowIso: string): PrepareChecklistJson {
  const completed: Partial<Record<PrepareChecklistKey, boolean>> = {};
  for (const item of PREPARE_CHECKLIST_ITEMS) {
    completed[item.key] = true;
  }
  return { completed, completed_at: nowIso };
}

export function parsePrepareChecklistJson(raw: unknown): PrepareChecklistJson {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const completed =
    o.completed && typeof o.completed === "object"
      ? (o.completed as Partial<Record<PrepareChecklistKey, boolean>>)
      : undefined;
  const completed_at = typeof o.completed_at === "string" ? o.completed_at : undefined;
  return { completed, completed_at };
}

export type PrepareChecklistDisplayItem = {
  key: PrepareChecklistKey;
  label: string;
  completed: boolean;
};

export function buildPrepareChecklistDisplay(raw: unknown): PrepareChecklistDisplayItem[] {
  const parsed = parsePrepareChecklistJson(raw);
  return PREPARE_CHECKLIST_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    completed: parsed.completed?.[item.key] === true,
  }));
}

export function formatPreparePreparedAtLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

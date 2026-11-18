import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

export const OBSERVATION_WORKFLOW_INTEL_PLACEHOLDER =
  "Workflow intelligence will appear here after observation notes or debrief are captured.";

export const OBSERVATION_WORKFLOW_INTEL_CATEGORIES = [
  { id: "procedure_workflow", title: "Procedure workflow" },
  { id: "product_usage", title: "Product usage" },
  { id: "staff_workflow", title: "Staff workflow" },
  { id: "surgeon_preferences", title: "Surgeon preferences" },
  { id: "friction_points", title: "Friction points" },
  { id: "access_logistics", title: "Access/logistics notes" },
  { id: "follow_up_signals", title: "Follow-up signals" },
] as const;

export type ObservationWorkflowIntelCategoryId =
  (typeof OBSERVATION_WORKFLOW_INTEL_CATEGORIES)[number]["id"];

export type ObservationWorkflowIntelCategory = {
  id: ObservationWorkflowIntelCategoryId;
  title: string;
  items: string[];
};

export type ObservationWorkflowIntelView = {
  hasContent: boolean;
  categories: ObservationWorkflowIntelCategory[];
  extractedAt: string | null;
};

const CATEGORY_ALIASES: Record<string, ObservationWorkflowIntelCategoryId> = {
  procedure_workflow: "procedure_workflow",
  procedure: "procedure_workflow",
  workflow: "procedure_workflow",
  product_usage: "product_usage",
  product: "product_usage",
  products: "product_usage",
  staff_workflow: "staff_workflow",
  staff: "staff_workflow",
  surgeon_preferences: "surgeon_preferences",
  surgeon_preference: "surgeon_preferences",
  preferences: "surgeon_preferences",
  friction_points: "friction_points",
  friction: "friction_points",
  workflow_friction: "friction_points",
  access_logistics: "access_logistics",
  access: "access_logistics",
  logistics: "access_logistics",
  follow_up_signals: "follow_up_signals",
  follow_up: "follow_up_signals",
  followup: "follow_up_signals",
};

function normalizeCategoryId(raw: string): ObservationWorkflowIntelCategoryId | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  if (OBSERVATION_WORKFLOW_INTEL_CATEGORIES.some((category) => category.id === key)) {
    return key as ObservationWorkflowIntelCategoryId;
  }
  return null;
}

function formatIntelItem(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  return formatRepFacingDisplayText(text) ?? text;
}

function pushItems(target: Map<ObservationWorkflowIntelCategoryId, string[]>, id: ObservationWorkflowIntelCategoryId, raw: unknown) {
  if (raw == null) return;
  const bucket = target.get(id) ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  for (const value of values) {
    const formatted = formatIntelItem(value);
    if (!formatted) continue;
    if (!bucket.includes(formatted)) bucket.push(formatted);
  }
  if (bucket.length > 0) target.set(id, bucket);
}

function parseSnapshotObject(snapshot: Record<string, unknown>): Map<ObservationWorkflowIntelCategoryId, string[]> {
  const grouped = new Map<ObservationWorkflowIntelCategoryId, string[]>();

  const categories = snapshot.categories;
  if (Array.isArray(categories)) {
    for (const entry of categories) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const id = normalizeCategoryId(String(row.id ?? row.key ?? ""));
      if (!id) continue;
      pushItems(grouped, id, row.items ?? row.signals ?? row.notes ?? row.value);
    }
  }

  const sections = snapshot.sections;
  if (Array.isArray(sections)) {
    for (const entry of sections) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const id = normalizeCategoryId(String(row.id ?? row.key ?? row.title ?? ""));
      if (!id) continue;
      pushItems(grouped, id, row.items ?? row.signals ?? row.notes ?? row.value);
    }
  }

  for (const [rawKey, rawValue] of Object.entries(snapshot)) {
    if (rawKey === "categories" || rawKey === "sections" || rawKey === "extracted_at" || rawKey === "updated_at") {
      continue;
    }
    const id = normalizeCategoryId(rawKey);
    if (!id) continue;
    pushItems(grouped, id, rawValue);
  }

  return grouped;
}

function parseSnapshotRaw(snapshot: unknown): ObservationWorkflowIntelView {
  if (snapshot == null) {
    return { hasContent: false, categories: [], extractedAt: null };
  }

  let parsed: Record<string, unknown>;
  if (typeof snapshot === "string") {
    const trimmed = snapshot.trim();
    if (!trimmed) return { hasContent: false, categories: [], extractedAt: null };
    try {
      const json = JSON.parse(trimmed) as unknown;
      if (!json || typeof json !== "object") return { hasContent: false, categories: [], extractedAt: null };
      parsed = json as Record<string, unknown>;
    } catch {
      return { hasContent: false, categories: [], extractedAt: null };
    }
  } else if (typeof snapshot === "object") {
    parsed = snapshot as Record<string, unknown>;
  } else {
    return { hasContent: false, categories: [], extractedAt: null };
  }

  const grouped = parseSnapshotObject(parsed);
  const categories = OBSERVATION_WORKFLOW_INTEL_CATEGORIES.map((meta) => ({
    id: meta.id,
    title: meta.title,
    items: grouped.get(meta.id) ?? [],
  })).filter((category) => category.items.length > 0);

  const extractedAt = String(parsed.extracted_at ?? parsed.updated_at ?? "").trim() || null;

  return {
    hasContent: categories.length > 0,
    categories,
    extractedAt,
  };
}

export function buildObservationWorkflowIntelView(caseRow: Record<string, unknown>): ObservationWorkflowIntelView {
  return parseSnapshotRaw(caseRow.observation_workflow_intelligence_snapshot);
}

export function hasObservationExtractedWorkflowIntel(caseRow: Record<string, unknown>): boolean {
  return buildObservationWorkflowIntelView(caseRow).hasContent;
}

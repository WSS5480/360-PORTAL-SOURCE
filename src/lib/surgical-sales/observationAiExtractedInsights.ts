/**
 * Future-facing AI extraction slots for observation notes — Workflow tab display model.
 * Reads `observation_workflow_intelligence_snapshot` today; structured for five canonical sections.
 */

import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

export const OBSERVATION_AI_EXTRACTED_SECTIONS = [
  {
    id: "workflow_findings",
    title: "Workflow findings",
    placeholder: "OR workflow patterns will surface here from your notes.",
  },
  {
    id: "product_opportunities",
    title: "Product fit signals",
    placeholder: "Product mentions and fit signals will appear here.",
  },
  {
    id: "competitor_observations",
    title: "Competitor observations",
    placeholder: "Competitor usage noted in the case will extract here.",
  },
  {
    id: "surgeon_preferences",
    title: "Surgeon preferences",
    placeholder: "Technique and preference cues will appear here.",
  },
  {
    id: "follow_up_recommendations",
    title: "Follow-up recommendations",
    placeholder: "Suggested next steps will appear after notes are captured.",
  },
] as const;

export type ObservationAiExtractedSectionId = (typeof OBSERVATION_AI_EXTRACTED_SECTIONS)[number]["id"];

export type ObservationAiExtractedSection = {
  id: ObservationAiExtractedSectionId;
  title: string;
  placeholder: string;
  items: string[];
  hasItems: boolean;
};

export type ObservationAiExtractedInsightsView = {
  sections: ObservationAiExtractedSection[];
  hasAnyContent: boolean;
  extractedAt: string | null;
};

export const OBSERVATION_AI_EXTRACT_INTRO =
  "Structured insights distilled from live observation notes — capture freely on Overview; extraction will populate these slots.";

const SECTION_ALIASES: Record<string, ObservationAiExtractedSectionId> = {
  workflow_findings: "workflow_findings",
  workflow_finding: "workflow_findings",
  workflow: "workflow_findings",
  procedure_workflow: "workflow_findings",
  staff_workflow: "workflow_findings",
  friction_points: "workflow_findings",
  workflow_friction: "workflow_findings",
  friction: "workflow_findings",
  access_logistics: "workflow_findings",
  access: "workflow_findings",
  logistics: "workflow_findings",
  product_opportunities: "product_opportunities",
  product_opportunity: "product_opportunities",
  product_usage: "product_opportunities",
  product: "product_opportunities",
  products: "product_opportunities",
  competitor_observations: "competitor_observations",
  competitor_observation: "competitor_observations",
  competitor: "competitor_observations",
  competitors: "competitor_observations",
  competitive_footprint: "competitor_observations",
  surgeon_preferences: "surgeon_preferences",
  surgeon_preference: "surgeon_preferences",
  preferences: "surgeon_preferences",
  follow_up_recommendations: "follow_up_recommendations",
  follow_up_recommendation: "follow_up_recommendations",
  follow_up_signals: "follow_up_recommendations",
  follow_up: "follow_up_recommendations",
  followup: "follow_up_recommendations",
};

function normalizeSectionId(raw: string): ObservationAiExtractedSectionId | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (SECTION_ALIASES[key]) return SECTION_ALIASES[key];
  if (OBSERVATION_AI_EXTRACTED_SECTIONS.some((section) => section.id === key)) {
    return key as ObservationAiExtractedSectionId;
  }
  return null;
}

function formatInsightItem(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  return formatRepFacingDisplayText(text) ?? text;
}

function pushItems(
  target: Map<ObservationAiExtractedSectionId, string[]>,
  id: ObservationAiExtractedSectionId,
  raw: unknown,
): void {
  if (raw == null) return;
  const bucket = target.get(id) ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  for (const value of values) {
    const formatted = formatInsightItem(value);
    if (!formatted) continue;
    if (!bucket.includes(formatted)) bucket.push(formatted);
  }
  if (bucket.length > 0) target.set(id, bucket);
}

function parseSnapshotObject(snapshot: Record<string, unknown>): Map<ObservationAiExtractedSectionId, string[]> {
  const grouped = new Map<ObservationAiExtractedSectionId, string[]>();

  const categories = snapshot.categories;
  if (Array.isArray(categories)) {
    for (const entry of categories) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const id = normalizeSectionId(String(row.id ?? row.key ?? ""));
      if (!id) continue;
      pushItems(grouped, id, row.items ?? row.signals ?? row.notes ?? row.value);
    }
  }

  const sections = snapshot.sections;
  if (Array.isArray(sections)) {
    for (const entry of sections) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const id = normalizeSectionId(String(row.id ?? row.key ?? row.title ?? ""));
      if (!id) continue;
      pushItems(grouped, id, row.items ?? row.signals ?? row.notes ?? row.value);
    }
  }

  for (const [rawKey, rawValue] of Object.entries(snapshot)) {
    if (rawKey === "categories" || rawKey === "sections" || rawKey === "extracted_at" || rawKey === "updated_at") {
      continue;
    }
    const id = normalizeSectionId(rawKey);
    if (!id) continue;
    pushItems(grouped, id, rawValue);
  }

  return grouped;
}

function parseSnapshotRaw(snapshot: unknown): { grouped: Map<ObservationAiExtractedSectionId, string[]>; extractedAt: string | null } {
  if (snapshot == null) {
    return { grouped: new Map(), extractedAt: null };
  }

  let parsed: Record<string, unknown>;
  if (typeof snapshot === "string") {
    const trimmed = snapshot.trim();
    if (!trimmed) return { grouped: new Map(), extractedAt: null };
    try {
      const json = JSON.parse(trimmed) as unknown;
      if (!json || typeof json !== "object") return { grouped: new Map(), extractedAt: null };
      parsed = json as Record<string, unknown>;
    } catch {
      return { grouped: new Map(), extractedAt: null };
    }
  } else if (typeof snapshot === "object") {
    parsed = snapshot as Record<string, unknown>;
  } else {
    return { grouped: new Map(), extractedAt: null };
  }

  return {
    grouped: parseSnapshotObject(parsed),
    extractedAt: String(parsed.extracted_at ?? parsed.updated_at ?? "").trim() || null,
  };
}

export function buildObservationAiExtractedInsightsView(
  caseRow: Record<string, unknown>,
): ObservationAiExtractedInsightsView {
  const { grouped, extractedAt } = parseSnapshotRaw(caseRow.observation_workflow_intelligence_snapshot);

  const sections = OBSERVATION_AI_EXTRACTED_SECTIONS.map((meta) => {
    const items = grouped.get(meta.id) ?? [];
    return {
      id: meta.id,
      title: meta.title,
      placeholder: meta.placeholder,
      items,
      hasItems: items.length > 0,
    };
  });

  return {
    sections,
    hasAnyContent: sections.some((section) => section.hasItems),
    extractedAt,
  };
}

export function hasObservationAiExtractedInsights(caseRow: Record<string, unknown>): boolean {
  return buildObservationAiExtractedInsightsView(caseRow).hasAnyContent;
}

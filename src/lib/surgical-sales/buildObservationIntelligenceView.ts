import { splitDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";

import { observationQuickFindingsFromCaseRow } from "@/lib/surgical-sales/observationQuickFindings";
import { isActionableIntelligenceFinding } from "@/lib/surgical-sales/observationFindingQuality";



export const OBSERVATION_INTELLIGENCE_EMPTY = "No intelligence captured yet.";



export const OBSERVATION_INTELLIGENCE_CATEGORIES = [

  { id: "clinical_pain_points", title: "Clinical Pain Points" },

  { id: "workflow_friction", title: "Workflow Friction" },

  { id: "competitor_products", title: "Competitor Products" },

  { id: "product_fit_signals", title: "Product Fit Signals" },

  { id: "staff_observations", title: "Staff Observations" },

  { id: "provider_behavior", title: "Provider Behavior" },

  { id: "growth_opportunities", title: "Growth Opportunities" },

] as const;



export type ObservationIntelligenceCategoryId =

  (typeof OBSERVATION_INTELLIGENCE_CATEGORIES)[number]["id"];



export type ObservationIntelligenceCategory = {

  id: ObservationIntelligenceCategoryId;

  title: string;

  items: string[];

  hasItems: boolean;

};



export type ObservationIntelligenceView = {

  categories: ObservationIntelligenceCategory[];

  hasAnyContent: boolean;

  extractedAt: string | null;

};



const CATEGORY_ALIASES: Record<string, ObservationIntelligenceCategoryId> = {

  clinical_pain_points: "clinical_pain_points",

  clinical_pain_point: "clinical_pain_points",

  clinical: "clinical_pain_points",

  pain_points: "clinical_pain_points",

  workflow_friction: "workflow_friction",

  friction_points: "workflow_friction",

  friction: "workflow_friction",

  workflow_findings: "workflow_friction",

  procedure_workflow: "workflow_friction",

  staff_workflow: "workflow_friction",

  access_logistics: "workflow_friction",

  competitor_products: "competitor_products",

  competitor_observations: "competitor_products",

  competitor: "competitor_products",

  competitors: "competitor_products",

  competitive_footprint: "competitor_products",

  product_fit_signals: "product_fit_signals",

  product_opportunities: "product_fit_signals",

  product_usage: "product_fit_signals",

  product: "product_fit_signals",

  staff_observations: "staff_observations",

  staff: "staff_observations",

  provider_behavior: "provider_behavior",

  surgeon_preferences: "provider_behavior",

  surgeon_preference: "provider_behavior",

  preferences: "provider_behavior",

  growth_opportunities: "growth_opportunities",

  follow_up_recommendations: "growth_opportunities",

  follow_up_signals: "growth_opportunities",

  follow_up: "growth_opportunities",

  followup: "growth_opportunities",

};



const FIT_ENUM_LABELS: Record<string, string> = {

  weak: "Workflow fit looks weak from field notes",

  possible: "Product fit looks possible from field notes",

  strong: "Strong product fit signal from field notes",

  unknown: "Product fit still being assessed",

};



const INTEREST_ENUM_LABELS: Record<string, string> = {

  mentioned: "Product interest was mentioned during the observation",

  strong: "Strong product interest surfaced during the observation",

};



function normalizeCategoryId(raw: string): ObservationIntelligenceCategoryId | null {

  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];

  if (OBSERVATION_INTELLIGENCE_CATEGORIES.some((category) => category.id === key)) {

    return key as ObservationIntelligenceCategoryId;

  }

  return null;

}



function formatFinding(raw: unknown): string | null {

  const text = String(raw ?? "").trim();

  if (!text) return null;

  const lower = text.toLowerCase();

  if (lower === "yes" || lower === "no" || lower === "unknown" || lower === "none") return null;
  if (!isActionableIntelligenceFinding(text)) return null;

  return text;
}



function pushUnique(target: string[], seen: Set<string>, value: string): void {

  const trimmed = value.trim();

  if (!trimmed) return;

  const key = trimmed.toLowerCase();

  if (seen.has(key)) return;

  seen.add(key);

  target.push(trimmed);

}



function appendFieldLines(

  caseRow: Record<string, unknown>,

  field: string,

  target: string[],

  seen: Set<string>,

): void {

  for (const line of splitDelimitedObjectiveLines(String(caseRow[field] ?? ""))) {

    const formatted = formatFinding(line);

    if (formatted) pushUnique(target, seen, formatted);

  }

}



function readYesNoFriction(value: unknown): string | null {

  const raw = String(value ?? "").trim().toLowerCase();

  if (raw === "yes") return "Workflow friction observed during the case";

  return null;

}



function readCompetitorEnum(value: unknown): string | null {

  const raw = String(value ?? "").trim().toLowerCase();

  if (raw === "yes") return "Competitor product observed in the OR";

  return null;

}



function readProductFitFinding(caseRow: Record<string, unknown>, target: string[], seen: Set<string>): void {

  const fitRaw = String(caseRow.live_observation_product_fit ?? "").trim();

  if (fitRaw) {

    const lower = fitRaw.toLowerCase();

    const enumLine = FIT_ENUM_LABELS[lower];

    if (enumLine && lower.length <= 8) {

      pushUnique(target, seen, enumLine);

    } else {

      for (const line of splitDelimitedObjectiveLines(fitRaw)) {

        const formatted = formatFinding(line);

        if (formatted) pushUnique(target, seen, formatted);

      }

    }

  }



  const quick = observationQuickFindingsFromCaseRow(caseRow);

  if (quick.product_interest === "Mentioned" || quick.product_interest === "Strong") {

    pushUnique(target, seen, INTEREST_ENUM_LABELS[quick.product_interest.toLowerCase()]!);

  }



  const keyNote = formatFinding(quick.key_finding_note);

  if (keyNote && /\b(product|fit|acsis|implant|tray)\b/i.test(keyNote)) {

    pushUnique(target, seen, keyNote);

  }

}



function readStaffAndFriction(caseRow: Record<string, unknown>, buckets: Record<ObservationIntelligenceCategoryId, string[]>, seen: Record<ObservationIntelligenceCategoryId, Set<string>>): void {

  const staffRaw = String(caseRow.live_observation_staff_process ?? "").trim();

  const frictionFromEnum = readYesNoFriction(staffRaw);

  if (frictionFromEnum) {

    pushUnique(buckets.workflow_friction, seen.workflow_friction, frictionFromEnum);

    return;

  }



  for (const line of splitDelimitedObjectiveLines(staffRaw)) {

    const formatted = formatFinding(line);

    if (!formatted) continue;

    if (/\b(friction|delay|setup|turnover|inefficien|workaround|step)\b/i.test(formatted)) {

      pushUnique(buckets.workflow_friction, seen.workflow_friction, formatted);

    } else {

      pushUnique(buckets.staff_observations, seen.staff_observations, formatted);

    }

  }



  const quick = observationQuickFindingsFromCaseRow(caseRow);

  if (quick.workflow_friction === "Yes") {

    pushUnique(buckets.workflow_friction, seen.workflow_friction, "Workflow friction observed during the case");

  }

}



function readGrowthOpportunities(caseRow: Record<string, unknown>, target: string[], seen: Set<string>): void {

  appendFieldLines(caseRow, "live_observation_follow_up_items", target, seen);

  appendFieldLines(caseRow, "case_product_needs", target, seen);



  const keyNote = formatFinding(observationQuickFindingsFromCaseRow(caseRow).key_finding_note);

  if (keyNote && /\b(opportunit|trial|demo|follow[- ]?up|growth|expand)\b/i.test(keyNote)) {

    pushUnique(target, seen, keyNote);

  }



  if (caseRow.follow_up_needed === true) {

    pushUnique(target, seen, "Follow-up action identified from this observation");

  }

}



function pushSnapshotItems(

  grouped: Map<ObservationIntelligenceCategoryId, string[]>,

  target: Record<ObservationIntelligenceCategoryId, string[]>,

  seen: Record<ObservationIntelligenceCategoryId, Set<string>>,

): void {

  for (const [id, items] of grouped.entries()) {

    for (const item of items) {

      const formatted = formatFinding(item);

      if (formatted) pushUnique(target[id], seen[id], formatted);

    }

  }

}



function parseSnapshotObject(snapshot: Record<string, unknown>): Map<ObservationIntelligenceCategoryId, string[]> {

  const grouped = new Map<ObservationIntelligenceCategoryId, string[]>();



  const pushToGroup = (id: ObservationIntelligenceCategoryId, raw: unknown) => {

    if (raw == null) return;

    const bucket = grouped.get(id) ?? [];

    const values = Array.isArray(raw) ? raw : [raw];

    for (const value of values) {

      const formatted = formatFinding(value);

      if (!formatted) continue;

      if (!bucket.includes(formatted)) bucket.push(formatted);

    }

    if (bucket.length > 0) grouped.set(id, bucket);

  };



  if (Array.isArray(snapshot.categories)) {

    for (const entry of snapshot.categories) {

      if (!entry || typeof entry !== "object") continue;

      const row = entry as Record<string, unknown>;

      const id = normalizeCategoryId(String(row.id ?? row.key ?? ""));

      if (!id) continue;

      pushToGroup(id, row.items ?? row.signals ?? row.notes ?? row.value);

    }

  }



  if (Array.isArray(snapshot.sections)) {

    for (const entry of snapshot.sections) {

      if (!entry || typeof entry !== "object") continue;

      const row = entry as Record<string, unknown>;

      const id = normalizeCategoryId(String(row.id ?? row.key ?? row.title ?? ""));

      if (!id) continue;

      pushToGroup(id, row.items ?? row.signals ?? row.notes ?? row.value);

    }

  }



  for (const [rawKey, rawValue] of Object.entries(snapshot)) {

    if (rawKey === "categories" || rawKey === "sections" || rawKey === "extracted_at" || rawKey === "updated_at" || rawKey === "primary_category") {

      continue;

    }

    const id = normalizeCategoryId(rawKey);

    if (!id) continue;

    pushToGroup(id, rawValue);

  }



  return grouped;

}



function emptyBuckets(): Record<ObservationIntelligenceCategoryId, string[]> {

  return {

    clinical_pain_points: [],

    workflow_friction: [],

    competitor_products: [],

    product_fit_signals: [],

    staff_observations: [],

    provider_behavior: [],

    growth_opportunities: [],

  };

}



function emptySeen(): Record<ObservationIntelligenceCategoryId, Set<string>> {

  return {

    clinical_pain_points: new Set(),

    workflow_friction: new Set(),

    competitor_products: new Set(),

    product_fit_signals: new Set(),

    staff_observations: new Set(),

    provider_behavior: new Set(),

    growth_opportunities: new Set(),

  };

}



export function buildObservationIntelligenceView(caseRow: Record<string, unknown>): ObservationIntelligenceView {

  const buckets = emptyBuckets();

  const seen = emptySeen();



  appendFieldLines(caseRow, "live_observation_clinical_pain_points", buckets.clinical_pain_points, seen.clinical_pain_points);

  appendFieldLines(caseRow, "live_observation_workflow", buckets.workflow_friction, seen.workflow_friction);



  const competitorEnum = readCompetitorEnum(caseRow.live_observation_competitors);

  if (competitorEnum) {

    pushUnique(buckets.competitor_products, seen.competitor_products, competitorEnum);

  }

  appendFieldLines(caseRow, "live_observation_competitors", buckets.competitor_products, seen.competitor_products);



  readProductFitFinding(caseRow, buckets.product_fit_signals, seen.product_fit_signals);

  readStaffAndFriction(caseRow, buckets, seen);

  appendFieldLines(caseRow, "live_observation_surgeon_reactions", buckets.provider_behavior, seen.provider_behavior);

  readGrowthOpportunities(caseRow, buckets.growth_opportunities, seen.growth_opportunities);



  const keyNote = formatFinding(observationQuickFindingsFromCaseRow(caseRow).key_finding_note);

  if (keyNote) {

    if (/\b(pain|fixation|visuali|clinical|technique|outcome)\b/i.test(keyNote)) {

      pushUnique(buckets.clinical_pain_points, seen.clinical_pain_points, keyNote);

    } else if (!buckets.growth_opportunities.some((line) => line.toLowerCase() === keyNote.toLowerCase())) {

      pushUnique(buckets.clinical_pain_points, seen.clinical_pain_points, keyNote);

    }

  }



  let extractedAt: string | null = null;

  const snapshotRaw = caseRow.observation_workflow_intelligence_snapshot;

  if (snapshotRaw != null) {

    let parsed: Record<string, unknown> | null = null;

    if (typeof snapshotRaw === "string") {

      try {

        const json = JSON.parse(snapshotRaw.trim()) as unknown;

        if (json && typeof json === "object") parsed = json as Record<string, unknown>;

      } catch {

        parsed = null;

      }

    } else if (typeof snapshotRaw === "object") {

      parsed = snapshotRaw as Record<string, unknown>;

    }



    if (parsed) {

      pushSnapshotItems(parseSnapshotObject(parsed), buckets, seen);

      extractedAt = String(parsed.extracted_at ?? parsed.updated_at ?? "").trim() || null;

    }

  }



  const categories = OBSERVATION_INTELLIGENCE_CATEGORIES.map((meta) => {

    const items = buckets[meta.id];

    return {

      id: meta.id,

      title: meta.title,

      items,

      hasItems: items.length > 0,

    };

  });



  return {

    categories,

    hasAnyContent: categories.some((category) => category.hasItems),

    extractedAt,

  };

}



export function hasObservationIntelligenceContent(caseRow: Record<string, unknown>): boolean {

  return buildObservationIntelligenceView(caseRow).hasAnyContent;

}



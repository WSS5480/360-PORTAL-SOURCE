/**
 * Overview concept deduplication — one operational theme appears once on the page.
 */

import type { ProviderOverviewDeploymentStep } from "@/lib/surgical-sales/buildProviderOverviewCommandCenterView";

export type OverviewConceptBucket =
  | "or_access"
  | "scheduling"
  | "workflow"
  | "credentialing"
  | "field_time"
  | "commercial"
  | "relationship"
  | "general";

const DB_KEY_BUCKET: Record<string, OverviewConceptBucket> = {
  provider_observation_access_path: "or_access",
  provider_observation_feasibility: "or_access",
  provider_observation_credentialing_needed: "credentialing",
  provider_credentialing_status: "credentialing",
  provider_observation_coordinator_contact: "scheduling",
  provider_observation_cadence_preference: "scheduling",
  provider_observation_best_days_case_types: "scheduling",
  provider_workflow_pain_points: "workflow",
  provider_procedure_focus: "workflow",
  provider_technique_preferences: "workflow",
  provider_technique_detail: "workflow",
  provider_case_volume_estimate: "workflow",
  provider_or_team_dynamics: "workflow",
  influence_level: "commercial",
  provider_decision_maker_status: "commercial",
  provider_current_vendors: "commercial",
  provider_competitive_products: "commercial",
  relationship_strength: "relationship",
  provider_communication_style: "relationship",
  provider_responsiveness: "relationship",
};

const DEPLOYMENT_STEP_BUCKET: Record<string, OverviewConceptBucket> = {
  access: "or_access",
  scheduling: "scheduling",
  workflow: "workflow",
  relationship: "relationship",
  commercial: "commercial",
};

const TEXT_BUCKET_PATTERNS: Array<{ bucket: OverviewConceptBucket; re: RegExp }> = [
  { bucket: "or_access", re: /\b(or access|credential|committee|gate|feasibility|observation allowed)\b/i },
  { bucket: "scheduling", re: /\b(schedul|coordinator|cadence|posting|window|booking)\b/i },
  { bucket: "workflow", re: /\b(workflow|procedure|modality|technique|case mix|turnover)\b/i },
  { bucket: "field_time", re: /\b(field time|field deployment|wasted|protect field|remote validation)\b/i },
  { bucket: "commercial", re: /\b(vendor|commercial|evaluation|incumbent|influence|decision.?maker)\b/i },
  { bucket: "relationship", re: /\b(relationship|champion|responsiveness|follow.?up)\b/i },
];

export function normalizeOverviewText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function conceptBucketForDbKey(dbKey: string): OverviewConceptBucket {
  return DB_KEY_BUCKET[dbKey] ?? "general";
}

export function conceptBucketForText(text: string): OverviewConceptBucket {
  for (const { bucket, re } of TEXT_BUCKET_PATTERNS) {
    if (re.test(text)) return bucket;
  }
  return "general";
}

export function conceptBucketForDeploymentStep(stepId: string): OverviewConceptBucket | null {
  return DEPLOYMENT_STEP_BUCKET[stepId] ?? null;
}

export function textsShareOperationalConcept(a: string, b: string): boolean {
  const na = normalizeOverviewText(a);
  const nb = normalizeOverviewText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const ba = conceptBucketForText(a);
  const bb = conceptBucketForText(b);
  return ba !== "general" && ba === bb;
}

export class OverviewConceptRegistry {
  private buckets = new Set<OverviewConceptBucket>();
  private dbKeys = new Set<string>();
  private headlines = new Set<string>();

  claimDbKey(dbKey: string): boolean {
    if (!dbKey || this.dbKeys.has(dbKey)) return false;
    this.dbKeys.add(dbKey);
    this.buckets.add(conceptBucketForDbKey(dbKey));
    return true;
  }

  claimHeadline(headline: string): boolean {
    const key = normalizeOverviewText(headline);
    if (!key || this.headlines.has(key)) return false;
    if ([...this.headlines].some((h) => textsShareOperationalConcept(h, headline))) return false;

    const bucket = conceptBucketForText(headline);
    if (bucket !== "general" && this.buckets.has(bucket)) return false;

    this.headlines.add(key);
    this.buckets.add(bucket);
    return true;
  }

  claimBucket(bucket: OverviewConceptBucket): void {
    this.buckets.add(bucket);
  }

  hasBucket(bucket: OverviewConceptBucket): boolean {
    return this.buckets.has(bucket);
  }

  claimDeploymentOpenSteps(steps: ProviderOverviewDeploymentStep[]): void {
    for (const step of steps) {
      if (step.status !== "open" && step.status !== "partial") continue;
      const bucket = conceptBucketForDeploymentStep(step.id);
      if (bucket) this.buckets.add(bucket);
    }
  }
}

export function operationalLineDistinctFrom(
  line: string,
  registry: OverviewConceptRegistry,
): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return registry.claimHeadline(trimmed);
}

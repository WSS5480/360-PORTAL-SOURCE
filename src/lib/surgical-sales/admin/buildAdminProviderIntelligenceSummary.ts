import {
  isPositiveWatchSignal,
  isWatchBriefingNoise,
} from "@/lib/surgical-sales/caseFieldWatchBriefing";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { intelligenceChipTextFromFact } from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const INTELLIGENCE_FIELDS: Array<{ key: string; prefix: string }> = [
  { key: "provider_clinical_frustrations", prefix: "Clinical" },
  { key: "provider_procedure_focus", prefix: "Procedure focus" },
  { key: "provider_staff_frustrations", prefix: "Staff" },
  { key: "provider_workflow_pain_points", prefix: "Workflow" },
  { key: "provider_product_gaps", prefix: "Inventory / product" },
  { key: "provider_future_opportunity_signals", prefix: "Opportunity" },
  { key: "provider_product_interests", prefix: "Product interest" },
];

const ADMIN_UF_CONCEPTS = new Set([
  "visualization_or_access_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "product_performance_issue",
  "unavailable_item",
  "requested_item",
  "provider_sentiment",
]);

const UF_CONCEPT_PREFIX: Record<string, string> = {
  visualization_or_access_issue: "Clinical",
  provider_sentiment: "Clinical",
  sizing_or_fit_issue: "Inventory / product",
  inventory_availability_issue: "Inventory / product",
  unavailable_item: "Inventory / product",
  requested_item: "Inventory / product",
  workflow_or_timing_issue: "Workflow",
  placement_or_positioning_issue: "Product performance",
  product_performance_issue: "Product performance",
  training_or_familiarity_issue: "Staff",
};

function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stageNudge(stageId: SalesPathwayStageId | string): string {
  switch (stageId) {
    case "discovery":
      return "Schedule intro call and confirm observation access";
    case "observe":
    case "debrief":
      return "Complete observation notes to build intelligence";
    case "evaluation":
      return "Capture evaluation signals from recent cases";
    case "commitment":
      return "Document commitment details and case targets";
    case "outcomes":
      return "Track utilization and outcome signals";
    default:
      return "Capture field notes on the next case";
  }
}

function pushBullet(bullets: string[], seen: Set<string>, prefix: string, text: string, maxBullets: number): boolean {
  if (isWatchBriefingNoise(text) || isPositiveWatchSignal(text)) return false;
  const scanned = scanLine(text, 72);
  if (!scanned) return false;
  const dedupe = scanned.toLowerCase();
  if (seen.has(dedupe)) return false;
  seen.add(dedupe);
  bullets.push(`${prefix}: ${scanned}`);
  return bullets.length >= maxBullets;
}

export function providerIntelligenceHasSignals(bullets: string[]): boolean {
  return bullets.length > 0 && !/^no intelligence on file yet/i.test(bullets[0] ?? "");
}

export function buildAdminProviderIntelligenceSummary(input: {
  contact: Record<string, unknown>;
  stageId?: SalesPathwayStageId | string;
  maxBullets?: number;
  universalFacts?: UniversalSurgicalFactRow[];
}): string[] {
  const maxBullets = input.maxBullets ?? 3;
  const bullets: string[] = [];
  const seen = new Set<string>();

  for (const { key, prefix } of INTELLIGENCE_FIELDS) {
    for (const line of linesFromField(input.contact[key])) {
      if (pushBullet(bullets, seen, prefix, line, maxBullets)) return bullets;
    }
  }

  for (const fact of input.universalFacts ?? []) {
    const concept = String(fact.concept ?? "").trim();
    if (!ADMIN_UF_CONCEPTS.has(concept)) continue;
    if (fact.negated || fact.uncertain) continue;

    const chip = intelligenceChipTextFromFact(fact);
    if (!chip) continue;
    const prefix = UF_CONCEPT_PREFIX[concept] ?? "Intelligence";
    if (pushBullet(bullets, seen, prefix, chip, maxBullets)) return bullets;
  }

  if (bullets.length === 0) {
    bullets.push(`No intelligence on file yet — ${stageNudge(input.stageId ?? "discovery")}`);
  }

  return bullets;
}

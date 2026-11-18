import { buildObservationTakeaways } from "@/lib/surgical-sales/buildObservationTakeaways";
import { OBSERVATION_FOCUS_CHIP_OPTIONS } from "@/lib/surgical-sales/observationCaseFocusChips";

export type ObservationFieldInsightSectionId =
  | "provider_pain"
  | "staff_pain"
  | "workflow"
  | "products"
  | "competitors"
  | "product_fit"
  | "unknown";

export type ObservationFieldInsightSection = {
  id: ObservationFieldInsightSectionId;
  title: string;
  items: string[];
};

type ObservationFieldInsightPriorCaseRow = Record<string, unknown> & {
  id: string;
};

const SECTION_META: Array<{ id: ObservationFieldInsightSectionId; title: string }> = [
  { id: "provider_pain", title: "Provider pain points" },
  { id: "staff_pain", title: "Staff pain points" },
  { id: "workflow", title: "Workflow bottlenecks" },
  { id: "products", title: "Products observed" },
  { id: "competitors", title: "Competitor products" },
  { id: "product_fit", title: "Product fit opportunities" },
  { id: "unknown", title: "Still unknown" },
];

const FOCUS_TO_SECTION: Record<string, ObservationFieldInsightSectionId> = {
  "Provider pain points": "provider_pain",
  "Staff pain points": "staff_pain",
  "Workflow bottlenecks": "workflow",
  "Current products used": "products",
  "Competitor products used": "competitors",
  "Product fit opportunities": "product_fit",
};

function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pushUnique(
  bucket: Map<ObservationFieldInsightSectionId, string[]>,
  sectionId: ObservationFieldInsightSectionId,
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const items = bucket.get(sectionId) ?? [];
  const key = trimmed.toLowerCase();
  if (items.some((item) => item.toLowerCase() === key)) return;
  items.push(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
  bucket.set(sectionId, items);
}

function isFieldInsightSource(takeaway: { sources: Array<{ kind: string }> }): boolean {
  return takeaway.sources.some((source) =>
    ["note", "case_field", "debrief", "prior_case"].includes(source.kind),
  );
}

function classifyInsight(text: string): ObservationFieldInsightSectionId {
  const lower = text.toLowerCase();
  if (/\b(competitor|rival|comp\s+rep)\b/.test(lower)) return "competitors";
  if (/\b(product\s+fit|fit\s+opportunit|trial|evaluat|demo)\b/.test(lower)) return "product_fit";
  if (/\b(product|vendor|tray|implant|instrument|acsis|preference)\b/.test(lower) && !/\bcompetitor\b/.test(lower)) {
    return "products";
  }
  if (/\b(workflow|turnover|setup|delay|bottleneck|friction)\b/.test(lower)) return "workflow";
  if (/\b(staff|nurse|tech|circulator|scrub)\b/.test(lower)) return "staff_pain";
  if (/\b(provider|surgeon|visuali|frustrat|pain point|preference|reaction)\b/.test(lower)) {
    return "provider_pain";
  }
  return "provider_pain";
}

export function buildObservationFieldInsights(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{
    activity_type?: string;
    body?: string;
    metadata_json?: Record<string, unknown> | null;
    created_at?: string;
  }>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: ObservationFieldInsightPriorCaseRow[];
}): ObservationFieldInsightSection[] {
  const buckets = new Map<ObservationFieldInsightSectionId, string[]>();

  for (const takeaway of buildObservationTakeaways(input)) {
    if (!isFieldInsightSource(takeaway)) continue;
    pushUnique(buckets, classifyInsight(takeaway.text), takeaway.text);
  }

  for (const line of linesFromField(input.caseRow.live_observation_product_fit)) {
    pushUnique(buckets, "products", line);
  }
  for (const line of linesFromField(input.caseRow.live_observation_competitors)) {
    pushUnique(buckets, "competitors", line);
  }
  for (const line of linesFromField(input.caseRow.live_observation_workflow)) {
    pushUnique(buckets, "workflow", line);
  }
  for (const line of linesFromField(input.caseRow.live_observation_clinical_pain_points)) {
    pushUnique(buckets, "provider_pain", line);
  }
  for (const line of linesFromField(input.caseRow.live_observation_surgeon_reactions)) {
    pushUnique(buckets, "provider_pain", line);
  }
  for (const line of linesFromField(input.caseRow.live_observation_staff_process)) {
    pushUnique(buckets, "staff_pain", line);
  }

  const learnedText = [...buckets.values()].flat().join(" ").toLowerCase();
  for (const focusLabel of OBSERVATION_FOCUS_CHIP_OPTIONS) {
    const sectionId = FOCUS_TO_SECTION[focusLabel];
    const keywords = focusLabel
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4);
    const covered = keywords.some((word) => learnedText.includes(word));
    if (!covered) {
      pushUnique(buckets, "unknown", `Still learning: ${focusLabel.toLowerCase()}`);
    }
  }

  return SECTION_META.map((section) => ({
    id: section.id,
    title: section.title,
    items: (buckets.get(section.id) ?? []).slice(0, 5),
  }));
}

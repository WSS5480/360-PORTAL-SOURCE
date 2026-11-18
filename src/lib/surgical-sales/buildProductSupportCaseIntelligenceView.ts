import type { ProductSupportNoteAiExtraction } from "@/lib/surgical-sales/processProductSupportNoteCapture";
import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { buildProductSupportKnownInsights } from "@/lib/surgical-sales/buildProductSupportRepBriefingContent";
import { mergeProductSupportIntelligenceSections } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProductSupportIntelligence";import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import {
  PRODUCT_SUPPORT_CASE_RESULT_LABELS,
  PRODUCT_SUPPORT_NEXT_STEP_LABELS,
  PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS,
  parseProductSupportCaseResult,
  parseProductSupportNextStep,
  parseProductSupportProviderReaction,
} from "@/lib/surgical-sales/productSupportCaseMoments";
import { productSupportObservationClassificationLabel } from "@/lib/surgical-sales/productSupportObservationTimeline";
export type ProductSupportIntelligenceItem = {
  id: string;
  text: string;
  sourceLabel: string;
  sourceKind: "field_note" | "support_case" | "debrief" | "observation";
  timestamp?: string;
};

export type ProductSupportIntelligenceSection = {
  id: string;
  title: string;
  items: ProductSupportIntelligenceItem[];
};

export type ProductSupportIntelligenceView = {
  sections: ProductSupportIntelligenceSection[];
  evidenceCount: number;
};

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
};

const CASE_FIELD_SECTIONS: Array<{ sectionId: string; title: string; key: string; sourceLabel: string }> = [
  { sectionId: "surgeon_feedback", title: "Surgeon Feedback", key: "live_observation_surgeon_reactions", sourceLabel: "This case" },
  { sectionId: "staff_feedback", title: "Staff Feedback", key: "live_observation_staff_process", sourceLabel: "This case" },
  { sectionId: "workflow", title: "Workflow Insights", key: "live_observation_workflow", sourceLabel: "This case" },
  { sectionId: "product_signals", title: "Product Signals", key: "live_observation_product_fit", sourceLabel: "This case" },
  { sectionId: "opportunities", title: "Opportunities", key: "live_observation_competitors", sourceLabel: "This case" },
  { sectionId: "risks", title: "Risks", key: "live_observation_clinical_pain_points", sourceLabel: "This case" },
];

function linesFromField(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pushItem(
  map: Map<string, ProductSupportIntelligenceItem[]>,
  sectionId: string,
  item: ProductSupportIntelligenceItem,
) {
  const bucket = map.get(sectionId) ?? [];
  const key = item.text.toLowerCase();
  if (bucket.some((existing) => existing.text.toLowerCase() === key)) return;
  bucket.push(item);
  map.set(sectionId, bucket);
}

function sectionForClassification(label: string): string {
  const lower = label.toLowerCase();
  if (/provider|surgeon/.test(lower)) return "surgeon_feedback";
  if (/staff/.test(lower)) return "staff_feedback";
  if (/workflow|friction|turnover/.test(lower)) return "workflow";
  if (/product|fit|competitor/.test(lower)) return "product_signals";
  if (/growth|opportunit|evaluat/.test(lower)) return "opportunities";
  if (/issue|risk|pain|clinical/.test(lower)) return "risks";
  return "product_signals";
}

function itemsFromActivities(activities: ActivityInput[] | undefined, map: Map<string, ProductSupportIntelligenceItem[]>) {
  for (const activity of activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const metadata = activity.metadata_json ?? null;
    const extraction = metadata?.ai_extraction;
    const classification = productSupportObservationClassificationLabel(metadata);
    const noteLabel = classification || "Field note";

    if (extraction && typeof extraction === "object") {
      const typed = extraction as ProductSupportNoteAiExtraction;
      const summary = typed.productSupport?.summary?.trim();
      if (summary) {
        pushItem(map, sectionForClassification(noteLabel), {
          id: `${activity.id}:summary`,
          text: summary,
          sourceLabel: `Field note · ${noteLabel}`,
          sourceKind: "field_note",
          timestamp: activity.created_at,
        });
      }

      for (const [index, entity] of (typed.observation?.entities ?? []).entries()) {
        const finding = String(entity.finding ?? entity.value ?? "").trim();
        if (!finding) continue;
        pushItem(map, sectionForClassification(entity.label), {
          id: `${activity.id}:entity:${index}`,
          text: finding,
          sourceLabel: `Field note · ${entity.label}`,
          sourceKind: "field_note",
          timestamp: activity.created_at,
        });
      }
    }
  }
}

function itemsFromCaseOutcomes(caseRow: Record<string, unknown>, map: Map<string, ProductSupportIntelligenceItem[]>) {
  const reaction = parseProductSupportProviderReaction(caseRow.case_support_provider_reaction as string | null | undefined);
  const result = parseProductSupportCaseResult(caseRow.case_support_case_result as string | null | undefined);
  const nextStep = parseProductSupportNextStep(caseRow.case_support_next_step as string | null | undefined);

  if (reaction) {
    pushItem(map, "case_outcome", {
      id: "outcome:reaction",
      text: `Provider reaction: ${PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS[reaction]}`,
      sourceLabel: "Documented outcome",
      sourceKind: "support_case",
    });
  }
  if (result) {
    pushItem(map, "case_outcome", {
      id: "outcome:result",
      text: `Case result: ${PRODUCT_SUPPORT_CASE_RESULT_LABELS[result]}`,
      sourceLabel: "Documented outcome",
      sourceKind: "support_case",
    });
  }
  if (nextStep) {
    pushItem(map, "case_outcome", {
      id: "outcome:next_step",
      text: `Next step: ${PRODUCT_SUPPORT_NEXT_STEP_LABELS[nextStep]}`,
      sourceLabel: "Documented outcome",
      sourceKind: "support_case",
    });
  }
}

function itemsFromCaseFields(caseRow: Record<string, unknown>, map: Map<string, ProductSupportIntelligenceItem[]>) {
  itemsFromCaseOutcomes(caseRow, map);
  for (const { sectionId, title: _title, key, sourceLabel } of CASE_FIELD_SECTIONS) {
    for (const [index, line] of linesFromField(caseRow[key]).entries()) {
      pushItem(map, sectionId, {
        id: `${key}:${index}`,
        text: line,
        sourceLabel,
        sourceKind: "support_case",
      });
    }
  }

  for (const [index, line] of linesFromField(caseRow.debrief_key_findings).entries()) {
    pushItem(map, "surgeon_feedback", {
      id: `debrief:${index}`,
      text: line,
      sourceLabel: "Debrief",
      sourceKind: "debrief",
    });
  }
}

function itemsFromProviderContext(
  input: {
    caseRow: Record<string, unknown>;
    providerContact?: Record<string, unknown> | null;
    specialty?: string | null;
    priorCases?: Array<Record<string, unknown>>;
    activities?: ActivityInput[];
  },
  map: Map<string, ProductSupportIntelligenceItem[]>,
) {
  for (const insight of buildProductSupportKnownInsights(input)) {
    pushItem(map, "provider_context", {
      id: insight.id,
      text: insight.text,
      sourceLabel: "Provider history",
      sourceKind: "observation",
    });
  }
}

function itemsFromOperationalContext(
  operationalContext: CaseOperationalContextView | null | undefined,
  map: Map<string, ProductSupportIntelligenceItem[]>,
) {
  if (!operationalContext) return;

  for (const item of operationalContext.provider.items) {
    pushItem(map, "case_day_prep", {
      id: `provider:${item.id}`,
      text: `${item.label}: ${item.value}`,
      sourceLabel: "Provider profile",
      sourceKind: "observation",
    });
  }

  for (const item of operationalContext.facility.items.slice(0, 4)) {
    pushItem(map, "case_day_prep", {
      id: `facility:${item.id}`,
      text: `${item.label}: ${item.value}`,
      sourceLabel: item.inherited ? "Facility baseline" : "Facility profile",
      sourceKind: "observation",
    });
  }

  for (const item of operationalContext.caseDay.items) {
    if (/still open for this case/i.test(item.value)) continue;
    pushItem(map, "case_day_prep", {
      id: `case-day:${item.id}`,
      text: `${item.label}: ${item.value}`,
      sourceLabel: "This case",
      sourceKind: "support_case",
    });
  }

  if (operationalContext.priorCaseIssues) {
    pushItem(map, "provider_context", {
      id: "prior-case-issues",
      text: operationalContext.priorCaseIssues,
      sourceLabel: "Prior case signal",
      sourceKind: "debrief",
    });
  }
}

export function buildProductSupportCaseIntelligenceView(input: {
  caseRow: Record<string, unknown>;
  activities?: ActivityInput[];
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
  providerContact?: Record<string, unknown> | null;
  operationalContext?: CaseOperationalContextView | null;
  priorCases?: Array<Record<string, unknown>>;
  specialty?: string | null;
}): ProductSupportIntelligenceView {
  const map = new Map<string, ProductSupportIntelligenceItem[]>();
  itemsFromCaseFields(input.caseRow, map);
  itemsFromActivities(input.activities, map);
  itemsFromProviderContext(
    {
      caseRow: input.caseRow,
      providerContact: input.providerContact,
      specialty: input.specialty,
      priorCases: input.priorCases,
      activities: input.activities,
    },
    map,
  );
  itemsFromOperationalContext(input.operationalContext, map);

  const oieSections: ProductSupportIntelligenceSection[] = [
    {
      id: "provider_context",
      title: "Provider Context",
      items: map.get("provider_context") ?? [],
    },
    {
      id: "case_day_prep",
      title: "Case Day Prep",
      items: map.get("case_day_prep") ?? [],
    },
    ...CASE_FIELD_SECTIONS.map((config) => ({
      id: config.sectionId,
      title: config.title,
      items: map.get(config.sectionId) ?? [],
    })),
    {
      id: "case_outcome",
      title: "Case Outcome",
      items: map.get("case_outcome") ?? [],
    },
  ].filter((section) => section.items.length > 0);
  const sections = mergeProductSupportIntelligenceSections({
    oieSections,
    caseRuns: input.universalFactsReadModel?.caseRuns,
  });

  const evidenceCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  return { sections, evidenceCount };
}

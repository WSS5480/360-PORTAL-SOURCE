import { describe, expect, it } from "vitest";

import { buildObservationRepPresentationView } from "@/lib/surgical-sales/buildObservationRepPresentationView";
import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { groupRepFriendlyIntelligenceItems } from "@/lib/surgical-sales/repFriendlyIntelligenceGroups";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import {
  adaptUniversalFactsToCapturedSignals,
  adaptUniversalFactsToFollowUpNextVisitItems,
  adaptUniversalFactsToThisObservationItems,
  type UniversalFactsReadModelPayload,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import type {
  UniversalFactExtractionRun,
  UniversalSurgicalFactRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

type PipelineStage =
  | "extraction"
  | "universalFacts"
  | "readModelObservation"
  | "readModelProvider"
  | "observationRenderer"
  | "providerIntelligence"
  | "debriefReadiness";

type ExpectedPipelineFact = {
  id: string;
  label: string;
  expectedSections?: string[];
  stages: Partial<Record<PipelineStage, RegExp[]>>;
};

type StageSnapshot = {
  extraction: string[];
  universalFacts: string[];
  readModelObservation: string[];
  readModelProvider: string[];
  observationRenderer: string[];
  providerIntelligence: string[];
  debriefReadiness: string[];
  observationSections: Array<{ section: string; text: string }>;
  providerSections: Array<{ section: string; text: string }>;
};

type FullPipelineFixture = {
  name: string;
  providerId: string;
  caseId: string;
  note: string;
  expectedFacts: ExpectedPipelineFact[];
  absentFacts?: Array<{ label: string; stages: Partial<Record<PipelineStage, RegExp[]>> }>;
};

const FULL_PIPELINE_FIXTURES: FullPipelineFixture[] = [{
  name: "Lettuce observation with product, pain, inventory, request, interest, and Sarah access",
  providerId: "provider-lettuce",
  caseId: "case-lettuce-latest",
  note:
    "Observed Dr. Tom Lettuce during a laparoscopic ventral hernia repair today. They used Bard Soft Mesh for the case. Dr. Lettuce said positioning the mesh in larger defects can be awkward and he wants more flexibility. He asked whether our mesh is available in a larger size and wanted product information for complex cases. The circulator mentioned they are getting low on mesh inventory. Sarah coordinated the observation and had the room ready before we arrived. He was interested when I mentioned alternatives designed for easier handling in larger defects.",
  expectedFacts: [
    {
      id: "current-product",
      label: "Current product",
      expectedSections: ["Current Workflow"],
      stages: {
        extraction: [/current_product|competitor_product/i, /Bard Soft Mesh/i],
        universalFacts: [/current_product|competitor_product/i, /Bard Soft Mesh/i],
        readModelObservation: [/Bard Soft Mesh/i],
        observationRenderer: [/Bard Soft Mesh/i],
        providerIntelligence: [/Bard Soft Mesh/i],
      },
    },
    {
      id: "provider-pain-point",
      label: "Provider pain point",
      expectedSections: ["Challenges & Friction"],
      stages: {
        extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /larger defects|awkward|flexibility/i],
        universalFacts: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /larger defects|awkward|flexibility/i],
        readModelObservation: [/larger defects/i, /awkward|flexibility|Conformability/i],
        observationRenderer: [/larger defects/i, /awkward|flexibility|Conformability/i],
        providerIntelligence: [/larger defects/i, /awkward|flexibility|Conformability/i],
      },
    },
    {
      id: "staff-inventory",
      label: "Staff inventory issue",
      expectedSections: ["Challenges & Friction"],
      stages: {
        extraction: [/inventory_availability_issue/i, /low|inventory/i],
        universalFacts: [/inventory_availability_issue/i, /low|inventory/i],
        readModelObservation: [/low|inventory|Product availability issue/i],
        observationRenderer: [/low|inventory|Product availability issue/i],
        providerIntelligence: [/low|inventory|Product availability issue/i],
      },
    },
    {
      id: "product-info-requested",
      label: "Product information requested",
      expectedSections: ["Product Signals", "Next Steps"],
      stages: {
        extraction: [/requested_item|product_interest|next_action/i, /larger size|product information|available/i],
        universalFacts: [/requested_item|product_interest|next_action/i, /larger size|product information|available/i],
        readModelObservation: [/larger size|product information|available/i],
        observationRenderer: [/larger size|product information|available/i],
        providerIntelligence: [/larger size|product information|available/i],
      },
    },
    {
      id: "product-interest",
      label: "Product interest",
      expectedSections: ["Product Signals"],
      stages: {
        extraction: [/product_interest|provider_sentiment/i, /interested|alternatives|easier handling/i],
        universalFacts: [/product_interest|provider_sentiment/i, /interested|alternatives|easier handling/i],
        readModelObservation: [/interested|alternatives|easier handling/i],
        observationRenderer: [/interested|alternatives|easier handling/i],
        providerIntelligence: [/interested|alternatives|easier handling/i],
      },
    },
    {
      id: "sarah-access",
      label: "Sarah/access",
      expectedSections: ["People & Access"],
      stages: {
        extraction: [/contact_role|access_pathway/i, /Sarah|coordinated|observation/i],
        universalFacts: [/contact_role|access_pathway/i, /Sarah|coordinated|observation/i],
        readModelObservation: [/Sarah/i, /Scheduling|Coordinator|access|observation/i],
        observationRenderer: [/Sarah/i, /Scheduling|Coordinator|access|observation/i],
        providerIntelligence: [/Sarah/i, /Scheduling|Coordinator|access|observation/i],
      },
    },
  ] satisfies ExpectedPipelineFact[],
},
{
  name: "narrative observation with product pain and explicit comparison request",
  providerId: "provider-quote",
  caseId: "case-quote",
  note:
    "Field note from Dr. Pepper observation: Current product was MiraMesh. He said the handling on bigger defects is what slows us down. He asked me to bring comparison information on options with better conformability. Morgan from materials said backup sizes were not stocked before the case.",
  expectedFacts: [
    {
      id: "current-product",
      label: "Current product",
      expectedSections: ["Current Workflow"],
      stages: {
        extraction: [/current_product|competitor_product/i, /MiraMesh/i],
        readModelObservation: [/MiraMesh/i],
        observationRenderer: [/MiraMesh/i],
        providerIntelligence: [/MiraMesh/i],
      },
    },
    {
      id: "handling-pain",
      label: "Handling pain",
      expectedSections: ["Challenges & Friction"],
      stages: {
        extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /handling|bigger defects|slows/i],
        readModelObservation: [/bigger defects/i, /handling|slows/i],
        observationRenderer: [/bigger defects/i, /handling|slows/i],
        providerIntelligence: [/bigger defects/i, /handling|slows/i],
      },
    },
    {
      id: "comparison-request",
      label: "Comparison request",
      expectedSections: ["Product Signals", "Next Steps"],
      stages: {
        extraction: [/product_interest|requested_item|next_action/i, /comparison|bring|information|conformability/i],
        readModelObservation: [/comparison|bring|information|conformability/i],
        observationRenderer: [/comparison|bring|information|conformability/i],
        providerIntelligence: [/comparison|bring|information|conformability/i],
      },
    },
    {
      id: "materials-inventory",
      label: "Materials inventory",
      expectedSections: ["Challenges & Friction", "People & Access"],
      stages: {
        extraction: [/inventory_availability_issue|contact_role/i, /Morgan|backup sizes|stocked/i],
        readModelObservation: [/Inventory or availability issue|Product availability|backup sizes|stocked/i],
        observationRenderer: [/Inventory or availability issue|Product availability|backup sizes|stocked/i],
        providerIntelligence: [/Inventory or availability issue|Product availability|backup sizes|stocked/i],
      },
    },
  ],
},
{
  name: "Lettuce contour annoyance with clinical comparison and Sarah evaluation coordination",
  providerId: "provider-contour",
  caseId: "case-contour",
  note:
    "Observed Dr. Lettuce again today during another laparoscopic ventral hernia repair. They were still using Bard Soft Mesh. During the case he mentioned that larger defects still take longer than he'd like because the mesh doesn't contour very well, and he said that's probably his biggest annoyance with the current setup. One of the scrub techs mentioned they've had a couple of cases delayed recently because the correct implant wasn't available in the room before the patient arrived. After the case, Dr. Lettuce asked me to bring some clinical information comparing products that handle larger defects better. Sarah said she could help coordinate a product evaluation if the surgeon decides he wants to see something different.",
  expectedFacts: [
    {
      id: "current-product",
      label: "Current product",
      expectedSections: ["Current Workflow"],
      stages: {
        extraction: [/current_product|competitor_product/i, /Bard Soft Mesh/i],
        universalFacts: [/current_product|competitor_product/i, /Bard Soft Mesh/i],
        readModelObservation: [/Bard Soft Mesh/i],
        observationRenderer: [/Bard Soft Mesh/i],
        providerIntelligence: [/Bard Soft Mesh/i],
      },
    },
    {
      id: "provider-contour-annoyance",
      label: "Provider contour annoyance",
      expectedSections: ["Challenges & Friction"],
      stages: {
        extraction: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /larger defects|contour|annoyance|take longer/i],
        universalFacts: [/sizing_or_fit_issue|product_performance_issue|provider_sentiment/i, /larger defects|contour|annoyance|take longer/i],
        readModelObservation: [/contour|take longer/i, /mesh|current/i],
        observationRenderer: [/contour|take longer/i, /mesh|current/i],
        providerIntelligence: [/contour|take longer/i, /mesh|current/i],
      },
    },
    {
      id: "implant-room-availability",
      label: "Implant availability before patient arrival",
      expectedSections: ["Challenges & Friction"],
      stages: {
        extraction: [/inventory_availability_issue|unavailable_item/i, /implant|available|room|patient arrived|delayed/i],
        universalFacts: [/inventory_availability_issue|unavailable_item/i, /implant|available|room|patient arrived|delayed/i],
        readModelObservation: [/Inventory or availability issue|Product availability|Requested item unavailable/i],
        observationRenderer: [/Inventory or availability issue|Product availability|Requested item unavailable/i],
        providerIntelligence: [/Inventory or availability issue|Product availability|Requested item unavailable/i],
      },
    },
    {
      id: "clinical-comparison-request",
      label: "Clinical comparison request",
      expectedSections: ["Product Signals", "Next Steps"],
      stages: {
        extraction: [/product_interest|next_action/i, /clinical information|comparing products|larger defects/i],
        universalFacts: [/product_interest|next_action/i, /clinical information|comparing products|larger defects/i],
        readModelObservation: [/clinical information|comparing products/i, /larger defects/i],
        observationRenderer: [/clinical information|comparing products/i, /larger defects/i],
        providerIntelligence: [/clinical information|comparing products/i, /larger defects/i],
      },
    },
    {
      id: "sarah-evaluation-coordination",
      label: "Sarah evaluation coordination",
      expectedSections: ["People & Access"],
      stages: {
        extraction: [/contact_role|next_action|product_interest/i, /Sarah|coordinate|product evaluation/i],
        universalFacts: [/contact_role|next_action|product_interest/i, /Sarah|coordinate|product evaluation/i],
        readModelObservation: [/Sarah/i, /Evaluation Contact|coordinate|product evaluation/i],
        observationRenderer: [/Sarah/i, /Evaluation Contact|coordinate|product evaluation/i],
        providerIntelligence: [/Sarah/i, /Evaluation Contact|coordinate|product evaluation/i],
      },
    },
  ],
},
{
  name: "routine negated observation should not invent absence intelligence",
  providerId: "provider-routine",
  caseId: "case-routine",
  note:
    "Observation note: Dr. Salt used Acumed as usual. The room felt routine and the staff did not seem frustrated. No one asked for a product change.",
  expectedFacts: [
    {
      id: "current-product",
      label: "Current product",
      expectedSections: ["Current Workflow"],
      stages: {
        extraction: [/current_product|competitor_product/i, /Acumed/i],
        readModelObservation: [/Acumed/i],
        observationRenderer: [/Acumed/i],
        providerIntelligence: [/Acumed/i],
      },
    },
  ],
  absentFacts: [
    {
      label: "No inferred staff frustration absence",
      stages: {
        readModelObservation: [/Staff did not appear frustrated/i],
        observationRenderer: [/Staff did not appear frustrated/i],
        providerIntelligence: [/Staff did not appear frustrated/i],
      },
    },
    {
      label: "No inferred smooth workflow",
      stages: {
        readModelObservation: [/Workflow appeared smooth|No workflow delays/i],
        observationRenderer: [/Workflow appeared smooth|No workflow delays/i],
        providerIntelligence: [/Workflow appeared smooth|No workflow delays/i],
      },
    },
  ],
}];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[“”"'.!?()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderFact(fact: Pick<UniversalSurgicalFactRow, "concept" | "normalized_label" | "evidence_text" | "product_mentioned" | "person_mentioned">): string {
  return [
    fact.concept,
    fact.normalized_label,
    fact.evidence_text,
    fact.product_mentioned,
    fact.person_mentioned,
  ]
    .filter(Boolean)
    .join(" ");
}

function factRunFromDictation(input: {
  note: string;
  caseId: string;
  providerId: string;
}): UniversalFactExtractionRun {
  const extraction = extractUniversalSurgicalFacts({
    raw_note: input.note,
    declared_source_type: "observation_case",
    context: { provider_display_name: "Tom Lettuce" },
  });
  const createdAt = "2026-06-25T12:45:00Z";
  return {
    capture_id: "full-pipeline-latest-observation",
    declared_source_type: "observation_case",
    extraction_model: "rules",
    created_at: createdAt,
    operational_note_id: "note-latest",
    facts: extraction.facts.map((fact, index) => ({
      ...fact,
      id: `full-pipeline-fact-${index}`,
      capture_id: "full-pipeline-latest-observation",
      provider_id: input.providerId,
      organization_id: "org-lettuce",
      case_id: input.caseId,
      encounter_id: null,
      suppressed: false,
      created_at: createdAt,
    })),
  };
}

function matchAll(text: string, patterns: RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(text));
}

function stageContains(lines: string[], patterns: RegExp[]): boolean {
  return lines.some((line) => matchAll(line, patterns));
}

function duplicateFacts(lines: string[]): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = normalizeText(line);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

function buildStageSnapshot(fixture: FullPipelineFixture): StageSnapshot {
  const run = factRunFromDictation({
    note: fixture.note,
    caseId: fixture.caseId,
    providerId: fixture.providerId,
  });
  const readModel: UniversalFactsReadModelPayload = {
    caseRuns: [run],
    providerRuns: [run],
    programRuns: [run],
  };
  const caseRow = {
    id: fixture.caseId,
    status: "completed",
    case_type: "observation",
    procedure_type: "Laparoscopic ventral hernia repair",
    provider_name: "Tom Lettuce",
    surgeon_contact_id: fixture.providerId,
    account_id: "org-lettuce",
  };
  const activities = [
    {
      id: "note-latest",
      activity_type: "note",
      body: fixture.note,
      created_at: "2026-06-25T12:44:00Z",
      metadata_json: { note_id: "note-latest" },
    },
  ];
  const providerContact = {
    id: fixture.providerId,
    display_name: "Tom Lettuce",
    observation_count: 3,
  };
  const priorCases = [
    { id: "prior-1", status: "completed", case_type: "observation", surgeon_contact_id: fixture.providerId },
    { id: "prior-2", status: "completed", case_type: "observation", surgeon_contact_id: fixture.providerId },
  ];
  const observationItems = adaptUniversalFactsToThisObservationItems({
    caseRuns: [run],
    caseId: fixture.caseId,
    hasCurrentNotes: true,
    activeOperationalNoteIds: ["note-latest"],
    providerName: "Tom Lettuce",
  });
  const providerSignals = adaptUniversalFactsToCapturedSignals({
    providerRuns: [run],
    completedCaseIds: [fixture.caseId, "prior-1", "prior-2"],
    programCompletedCount: 3,
    currentCaseHasCapturedNotes: true,
    primaryCaseComplete: true,
    thisObservationLines: observationItems.map((item) => item.text),
    providerName: "Tom Lettuce",
  });
  const followUpItems = adaptUniversalFactsToFollowUpNextVisitItems({
    universalFactsReadModel: readModel,
    caseId: fixture.caseId,
    activeOperationalNoteIds: ["note-latest"],
    providerName: "Tom Lettuce",
  });
  const observationPresentation = buildObservationRepPresentationView({
    caseRow,
    activities,
    providerContact,
    priorCases,
    universalFactsReadModel: readModel,
  });
  const providerView = buildProviderIntelligenceKnowledgeDashboardView({
    contact: providerContact,
    providerId: fixture.providerId,
    cases: [caseRow, ...priorCases],
    universalFactsReadModel: readModel,
  });
  const providerCaseRollup = providerView.caseIntelligence;
  const observationGroupedSections = groupRepFriendlyIntelligenceItems([
    ...observationPresentation.thisObservation.items,
    ...observationPresentation.stillNeedToLearn,
  ]).flatMap((group) => group.items.map((item) => ({ section: group.title, text: item.text })));
  const providerGroupedSections = groupRepFriendlyIntelligenceItems([
    ...providerView.emergingSignals.map((item) => ({ text: item.text })),
    ...providerView.needsMoreEvidence.map((item) => ({ text: item.text })),
    ...(providerCaseRollup?.emergingCaseSignals ?? []).map((text) => ({ text })),
    ...(providerCaseRollup?.needsMoreEvidence ?? []).map((text) => ({ text })),
  ]).flatMap((group) => group.items.map((item) => ({ section: group.title, text: item.text })));

  return {
    extraction: run.facts.map(renderFact),
    universalFacts: run.facts.map(renderFact),
    readModelObservation: [...observationItems, ...followUpItems].map((item) => item.text),
    readModelProvider: providerSignals.map((item) => item.text),
    observationRenderer: [
      ...observationPresentation.thisObservation.items.map((item) => item.text),
      ...observationPresentation.stillNeedToLearn.map((item) => item.text),
    ],
    providerIntelligence: [
      ...providerView.emergingSignals.map((item) => item.text),
      ...providerView.needsMoreEvidence.map((item) => item.text),
    ],
    debriefReadiness: [
      observationPresentation.debriefReadiness.headline,
      observationPresentation.debriefReadiness.nextStep,
      ...observationPresentation.debriefReadiness.reasons,
      ...observationPresentation.evidenceProgress.items.map((item) => `${item.label}: ${item.statusLabel}`),
    ],
    observationSections: observationGroupedSections,
    providerSections: providerGroupedSections,
  };
}

function firstMissingStage(fact: ExpectedPipelineFact, snapshot: StageSnapshot): PipelineStage | null {
  const stages = Object.keys(fact.stages) as PipelineStage[];
  return stages.find((stage) => !stageContains(snapshot[stage], fact.stages[stage] ?? [])) ?? null;
}

function expectedSectionFailures(fact: ExpectedPipelineFact, snapshot: StageSnapshot): string[] {
  if (!fact.expectedSections?.length) return [];
  const patterns = fact.stages.observationRenderer ?? fact.stages.providerIntelligence ?? [];
  const matchingSections = [...snapshot.observationSections, ...snapshot.providerSections].filter((item) =>
    matchAll(item.text, patterns),
  );
  if (matchingSections.length === 0) return [];
  return matchingSections
    .filter(
      (item) =>
        !fact.expectedSections!.some((expectedSection) =>
          normalizeText(item.section).includes(normalizeText(expectedSection)),
        ),
    )
    .map((item) => `${fact.label} routed to ${item.section}: ${item.text}`);
}

function buildFailureReport(fixture: FullPipelineFixture, snapshot: StageSnapshot): string[] {
  const failures: string[] = [];
  for (const fact of fixture.expectedFacts) {
    const missingStage = firstMissingStage(fact, snapshot);
    if (missingStage) {
      failures.push(
        [
          `${fact.label} missing at ${missingStage}`,
          `Expected: ${(fact.stages[missingStage] ?? []).map(String).join(" AND ")}`,
          `Available ${missingStage}:`,
          ...snapshot[missingStage].map((line) => `- ${line}`),
        ].join("\n"),
      );
    }
    failures.push(...expectedSectionFailures(fact, snapshot));
  }

  for (const absent of fixture.absentFacts ?? []) {
    for (const [stage, patterns] of Object.entries(absent.stages) as Array<[PipelineStage, RegExp[]]>) {
      if (stageContains(snapshot[stage], patterns)) {
        failures.push(`${absent.label} unexpectedly present at ${stage}: ${(patterns ?? []).map(String).join(" AND ")}`);
      }
    }
  }

  const duplicateReport = {
    readModelObservation: duplicateFacts(snapshot.readModelObservation),
    observationRenderer: duplicateFacts(snapshot.observationRenderer),
    providerIntelligence: duplicateFacts(snapshot.providerIntelligence),
  };
  for (const [stage, duplicates] of Object.entries(duplicateReport)) {
    if (duplicates.length) failures.push(`Duplicate facts at ${stage}: ${duplicates.join(", ")}`);
  }

  return failures;
}

describe("full-pipeline intelligence regression", () => {
  it.each(FULL_PIPELINE_FIXTURES)("$name", (fixture) => {
    const snapshot = buildStageSnapshot(fixture);
    const failures = buildFailureReport(fixture, snapshot);

    expect(failures).toEqual([]);
    expect(snapshot.debriefReadiness.join("\n")).toMatch(/Evidence Nearly Ready|Ready for Debrief|Evidence coverage|Known|Early/i);
  });
});

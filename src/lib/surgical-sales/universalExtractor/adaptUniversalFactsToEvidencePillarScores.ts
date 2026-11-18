import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import {
  EVIDENCE_PILLAR_LABELS,
  type EvidenceAreaStatus,
  type EvidencePillarId,
  type EvidencePillarScore,
} from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";
import type { EvidenceMaturityStatus } from "@/lib/surgical-sales/evidenceMaturityScoring";

const PILLAR_UF_CONCEPTS: Record<EvidencePillarId, readonly string[]> = {
  provider_pain_points: ["provider_sentiment", "product_performance_issue"],
  staff_pain_points: ["staff_workflow", "workflow_or_timing_issue"],
  workflow_findings: [
    "visualization_or_access_issue",
    "workflow_or_timing_issue",
    "placement_or_positioning_issue",
    "inventory_availability_issue",
    "alternative_used",
    "unavailable_item",
  ],
  current_products: ["current_product", "competitor_product"],
  product_fit_signals: ["sizing_or_fit_issue", "requested_item", "support_needed"],
};

function isEligibleFact(fact: UniversalSurgicalFactRow): boolean {
  return (
    !fact.suppressed &&
    !fact.negated &&
    !fact.uncertain &&
    fact.assertion_level !== "rejected" &&
    (UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS as readonly string[]).includes(String(fact.concept))
  );
}

function flattenFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return runs.flatMap((run) => run.facts).filter(isEligibleFact);
}

function resolveEvidenceAreaStatus(input: {
  pillarId: EvidencePillarId;
  completedCasesWithSupport: number;
  incompleteCasesWithSupport: number;
  distinctCasesWithSupport: number;
}): { status: EvidenceAreaStatus; maturityStatus: EvidenceMaturityStatus } {
  if (input.completedCasesWithSupport === 0 && input.incompleteCasesWithSupport === 0) {
    return { status: "missing", maturityStatus: "missing" };
  }
  if (input.completedCasesWithSupport >= 3) {
    return { status: "validated", maturityStatus: "validated_pattern" };
  }
  if (input.completedCasesWithSupport >= 2) {
    return { status: "supported", maturityStatus: "supported_pattern" };
  }
  if (
    input.distinctCasesWithSupport >= 2 ||
    (input.completedCasesWithSupport === 1 && input.incompleteCasesWithSupport > 0)
  ) {
    return { status: "supported", maturityStatus: "repeated_signal" };
  }
  if (input.completedCasesWithSupport === 1) {
    if (input.pillarId === "product_fit_signals") {
      return { status: "early_signal", maturityStatus: "observed_once" };
    }
    return { status: "observed", maturityStatus: "observed_once" };
  }
  if (input.pillarId === "product_fit_signals") {
    return { status: "early_signal", maturityStatus: "captured_signal" };
  }
  if (input.pillarId === "workflow_findings") {
    return { status: "early_signal", maturityStatus: "captured_signal" };
  }
  return { status: "captured_signal", maturityStatus: "captured_signal" };
}

function pillarSupportsFact(pillarId: EvidencePillarId, fact: UniversalSurgicalFactRow): boolean {
  return PILLAR_UF_CONCEPTS[pillarId].includes(String(fact.concept));
}

/** UF program runs → evidence pillar scores (replaces OIE scoreObservationEvidence read path). */
export function adaptUniversalFactsToEvidencePillarScores(input: {
  programRuns: UniversalFactExtractionRun[];
  completedCaseIds: string[];
}): {
  pillars: EvidencePillarScore[];
  signalCount: number;
  validatedCount: number;
} {
  const facts = flattenFacts(input.programRuns);

  const factsByCase = new Map<string, UniversalSurgicalFactRow[]>();
  for (const fact of facts) {
    const caseId = String(fact.case_id ?? "").trim();
    if (!caseId) continue;
    const bucket = factsByCase.get(caseId) ?? [];
    bucket.push(fact);
    factsByCase.set(caseId, bucket);
  }

  const completedSet = new Set(input.completedCaseIds.map(String));

  const pillars = (Object.keys(PILLAR_UF_CONCEPTS) as EvidencePillarId[]).map((pillarId) => {
    const supportingConcepts = PILLAR_UF_CONCEPTS[pillarId];
    let supportingFactCount = 0;
    let completedCasesWithSupport = 0;
    let incompleteCasesWithSupport = 0;
    let distinctCasesWithSupport = 0;

    for (const [caseId, caseFacts] of factsByCase) {
      const supported = caseFacts.some((fact) => pillarSupportsFact(pillarId, fact));
      if (!supported) continue;
      distinctCasesWithSupport += 1;
      supportingFactCount += caseFacts.filter((fact) =>
        supportingConcepts.includes(String(fact.concept)),
      ).length;
      if (completedSet.has(caseId)) completedCasesWithSupport += 1;
      else incompleteCasesWithSupport += 1;
    }

    const { status, maturityStatus } = resolveEvidenceAreaStatus({
      pillarId,
      completedCasesWithSupport,
      incompleteCasesWithSupport,
      distinctCasesWithSupport,
    });

    return {
      id: pillarId,
      label: EVIDENCE_PILLAR_LABELS[pillarId],
      status,
      maturityStatus,
      validated: status === "validated",
      confirmed: status === "validated",
      supportingFactCount,
    };
  });

  const signalCount = pillars.filter((pillar) => pillar.status !== "missing").length;
  const validatedCount = pillars.filter((pillar) => pillar.validated).length;

  return { pillars, signalCount, validatedCount };
}

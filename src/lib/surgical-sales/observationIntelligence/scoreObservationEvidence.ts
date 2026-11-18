import type { ObservationLearningCategoryId } from "./observationLearningTypes";
import type { ObservationFact, ObservationFactType } from "./observationFactTypes";
import type { EvidenceMaturityStatus } from "@/lib/surgical-sales/evidenceMaturityScoring";

export type EvidencePillarId =
  | "provider_pain_points"
  | "staff_pain_points"
  | "workflow_findings"
  | "current_products"
  | "product_fit_signals";

export const EVIDENCE_PILLAR_LABELS: Record<EvidencePillarId, string> = {
  provider_pain_points: "Provider Pain Points",
  staff_pain_points: "Staff Pain Points",
  workflow_findings: "Workflow Bottlenecks",
  current_products: "Current Products Used",
  product_fit_signals: "Product Fit Opportunity",
};

const PILLAR_SUPPORTING_FACTS: Record<EvidencePillarId, ObservationFactType[]> = {
  provider_pain_points: ["provider_frustration", "training_gap"],
  staff_pain_points: ["staff_issue"],
  workflow_findings: [
    "workflow_issue",
    "visualization_challenge",
    "fixation_challenge",
    "workflow_delay",
    "room_turnover_issue",
  ],
  current_products: ["current_product", "competitor_product"],
  product_fit_signals: ["product_interest", "product_fit_signal"],
};

export type EvidenceAreaStatus =
  | "missing"
  | "captured_signal"
  | "observed"
  | "early_signal"
  | "supported"
  | "validated";

export type EvidencePillarScore = {
  id: EvidencePillarId;
  label: string;
  status: EvidenceAreaStatus;
  maturityStatus: EvidenceMaturityStatus;
  validated: boolean;
  confirmed: boolean;
  supportingFactCount: number;
};

function countFactsByType(facts: ObservationFact[]): Map<ObservationFactType, number> {
  const counts = new Map<ObservationFactType, number>();
  for (const fact of facts) {
    counts.set(fact.type, (counts.get(fact.type) ?? 0) + 1);
  }
  return counts;
}

function pillarHasSupportingFacts(
  pillarId: EvidencePillarId,
  facts: ObservationFact[],
): boolean {
  const supporting = PILLAR_SUPPORTING_FACTS[pillarId];
  return supporting.some((type) => facts.some((fact) => fact.type === type));
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

/** Step 3 — score evidence pillars from accumulated facts. */
export function scoreObservationEvidenceFromFacts(input: {
  factsByCase: Array<{ caseId: string; caseComplete?: boolean; facts: ObservationFact[] }>;
}): {
  pillars: EvidencePillarScore[];
  signalCount: number;
  validatedCount: number;
  aggregatedFactCounts: Map<ObservationFactType, number>;
} {
  const allFacts = input.factsByCase.flatMap((source) => source.facts);
  const aggregatedFactCounts = countFactsByType(allFacts);

  const pillars = (Object.keys(PILLAR_SUPPORTING_FACTS) as EvidencePillarId[]).map((pillarId) => {
    const supporting = PILLAR_SUPPORTING_FACTS[pillarId];
    const supportingFactCount = supporting.reduce(
      (sum, type) => sum + (aggregatedFactCounts.get(type) ?? 0),
      0,
    );

    const completedCasesWithSupport = input.factsByCase.filter(
      (source) => (source.caseComplete ?? true) && pillarHasSupportingFacts(pillarId, source.facts),
    ).length;
    const incompleteCasesWithSupport = input.factsByCase.filter(
      (source) => !(source.caseComplete ?? true) && pillarHasSupportingFacts(pillarId, source.facts),
    ).length;
    const distinctCasesWithSupport = input.factsByCase.filter((source) =>
      pillarHasSupportingFacts(pillarId, source.facts),
    ).length;
    const { status, maturityStatus } = resolveEvidenceAreaStatus({
      pillarId,
      completedCasesWithSupport,
      incompleteCasesWithSupport,
      distinctCasesWithSupport,
    });
    const validated = status === "validated";

    return {
      id: pillarId,
      label: EVIDENCE_PILLAR_LABELS[pillarId],
      status,
      maturityStatus,
      validated,
      confirmed: validated,
      supportingFactCount,
    };
  });

  const signalCount = pillars.filter((pillar) => pillar.status !== "missing").length;

  return {
    pillars,
    signalCount,
    validatedCount: pillars.filter((pillar) => pillar.validated).length,
    aggregatedFactCounts,
  };
}

export function mapEvidencePillarsToLearningCategories(
  pillars: EvidencePillarScore[],
): Record<ObservationLearningCategoryId, { validated: boolean; confirmed: boolean }> {
  return {
    provider_pain_points: pillars.find((p) => p.id === "provider_pain_points") ?? {
      validated: false,
      confirmed: false,
    },
    staff_pain_points: pillars.find((p) => p.id === "staff_pain_points") ?? {
      validated: false,
      confirmed: false,
    },
    workflow_findings: pillars.find((p) => p.id === "workflow_findings") ?? {
      validated: false,
      confirmed: false,
    },
    current_products: pillars.find((p) => p.id === "current_products") ?? {
      validated: false,
      confirmed: false,
    },
    product_fit_signals: pillars.find((p) => p.id === "product_fit_signals") ?? {
      validated: false,
      confirmed: false,
    },
    competitor_products: { validated: false, confirmed: false },
    staff_workflow: { validated: false, confirmed: false },
  };
}

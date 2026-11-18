/**
 * Formal observation intelligence test runner.
 * Validates fact extraction, normalized findings, category grouping, and evidence scoring.
 */
import { extractObservationFacts } from "../extractObservationFacts";
import { extractObservationFactsHybrid } from "../extractObservationFactsHybrid";
import type { ObservationFactType } from "../observationFactTypes";
import { OBSERVATION_LEARNING_CATEGORY_LABELS, type ObservationLearningCategoryId } from "../observationLearningTypes";
import { runObservationIntelligencePipeline } from "../observationIntelligencePipeline";
import {
  EVIDENCE_PILLAR_LABELS,
  type EvidencePillarId,
} from "../scoreObservationEvidence";
import { OBSERVATION_INTELLIGENCE_MIN_PASS_RATE } from "./observationIntelligenceTestConfig";
import {
  OBSERVATION_INTELLIGENCE_ALL_TEST_CASES,
  type ObservationIntelligenceTestCase,
  type ObservationIntelligenceTestCategory,
} from "./observationIntelligenceTestCases";

const NORMALIZED_FINDING_ID_ALIASES: Record<string, string[]> = {
  visualization_challenge: ["workflow_visualization_before_fixation"],
  visualization_fixation_workflow_opportunity: ["product_fit_visualization_fixation_workflow"],
};

function normalizedFindingIdMatches(actualId: string, expectedId: string): boolean {
  if (actualId === expectedId || actualId.startsWith(`${expectedId}:`)) return true;
  return (NORMALIZED_FINDING_ID_ALIASES[expectedId] ?? []).includes(actualId);
}

export type ObservationIntelligenceTestMismatch = {
  field:
    | "facts"
    | "forbiddenFacts"
    | "intelligence"
    | "forbiddenCategories"
    | "findings"
    | "forbiddenFindings"
    | "findingCount"
    | "observationCount"
    | "evidence"
    | "evidenceCount";
  expected: string;
  actual: string;
};

export type ObservationIntelligenceTestResult = {
  id: string;
  name: string;
  category: ObservationIntelligenceTestCategory;
  note: string;
  tier: "rules" | "hybrid";
  passed: boolean;
  mismatches: ObservationIntelligenceTestMismatch[];
  actual: {
    factTypes: ObservationFactType[];
    intelligenceCategories: ObservationLearningCategoryId[];
    intelligenceLabels: string[];
    normalizedFindingIds: string[];
    evidence: Record<EvidencePillarId, boolean>;
    evidenceCount: number;
    aggregatedFindings: Array<{ normalizedFindingId: string; observationCount: number; confidence: string }>;
  };
};

export type ObservationIntelligenceTestSuiteResult = {
  results: ObservationIntelligenceTestResult[];
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  rulesPassed: number;
  rulesTotal: number;
  hybridPassed: number;
  hybridTotal: number;
};

export type RunObservationIntelligenceTestSuiteOptions = {
  /** When true, run hybrid extraction for cases marked requiresLlmFallback. */
  includeHybrid?: boolean;
  enableLlmFallback?: boolean;
  llmExtractor?: (fragment: string) => Promise<import("../observationFactTypes").ObservationFact[]>;
};

function collectNormalizedFindingIds(
  aggregatedByCategory: Record<
    ObservationLearningCategoryId,
    Array<{ normalizedFindingId: string; observationCount: number; confidence: string }>
  >,
): string[] {
  const ids = new Set<string>();
  for (const findings of Object.values(aggregatedByCategory)) {
    for (const finding of findings) {
      ids.add(finding.normalizedFindingId);
    }
  }
  return [...ids];
}

function flattenAggregatedFindings(
  aggregatedByCategory: Record<
    ObservationLearningCategoryId,
    Array<{ normalizedFindingId: string; observationCount: number; confidence: string }>
  >,
): Array<{ normalizedFindingId: string; observationCount: number; confidence: string }> {
  const byId = new Map<string, { normalizedFindingId: string; observationCount: number; confidence: string }>();
  for (const findings of Object.values(aggregatedByCategory)) {
    for (const finding of findings) {
      const existing = byId.get(finding.normalizedFindingId);
      if (!existing || finding.observationCount > existing.observationCount) {
        byId.set(finding.normalizedFindingId, finding);
      }
    }
  }
  return [...byId.values()];
}

async function runSingleTestCase(
  testCase: ObservationIntelligenceTestCase,
  options: RunObservationIntelligenceTestSuiteOptions,
): Promise<ObservationIntelligenceTestResult> {
  const useHybrid =
    Boolean(testCase.requiresLlmFallback) &&
    Boolean(options.includeHybrid) &&
    (options.llmExtractor !== undefined || options.enableLlmFallback === true || process.env.OBSERVATION_FACT_LLM_FALLBACK === "1");

  const tier: "rules" | "hybrid" = useHybrid ? "hybrid" : "rules";

  const priorCases =
    testCase.crossCaseNotes?.map((entry) => ({
      id: entry.caseId,
      notes: entry.note,
    })) ?? [];

  const pipeline = runObservationIntelligencePipeline({
    caseRow: { id: `test-${testCase.id}` },
    priorCases,
    activities: [{ activity_type: "note", body: testCase.note }],
  });

  const extraction =
    tier === "hybrid"
      ? await extractObservationFactsHybrid(testCase.note, {
          enableLlmFallback: options.enableLlmFallback ?? true,
          llmExtractor: options.llmExtractor,
        })
      : extractObservationFacts(testCase.note);

  const actualFactTypes = [...new Set(extraction.facts.map((fact) => fact.type))];
  const actualIntelligenceCategories = pipeline.learnedCategories.map((category) => category.id);
  const actualIntelligenceLabels = pipeline.learnedCategories.map((category) => category.title);
  const actualNormalizedFindingIds = collectNormalizedFindingIds(pipeline.aggregatedByCategory);
  const flatFindings = flattenAggregatedFindings(pipeline.aggregatedByCategory);
  const actualEvidence = Object.fromEntries(
    pipeline.evidencePillars.map((pillar) => [pillar.id, pillar.status !== "missing"]),
  ) as Record<EvidencePillarId, boolean>;

  const mismatches: ObservationIntelligenceTestMismatch[] = [];

  for (const expectedType of testCase.expectedFactTypes) {
    if (!actualFactTypes.includes(expectedType)) {
      mismatches.push({
        field: "facts",
        expected: expectedType,
        actual: actualFactTypes.join(", ") || "(none)",
      });
    }
  }

  for (const forbiddenType of testCase.forbiddenFactTypes ?? []) {
    if (actualFactTypes.includes(forbiddenType)) {
      mismatches.push({
        field: "forbiddenFacts",
        expected: `must not include ${forbiddenType}`,
        actual: actualFactTypes.join(", "),
      });
    }
  }

  for (const categoryId of testCase.expectedIntelligenceCategories) {
    if (!actualIntelligenceCategories.includes(categoryId)) {
      mismatches.push({
        field: "intelligence",
        expected: OBSERVATION_LEARNING_CATEGORY_LABELS[categoryId],
        actual: actualIntelligenceLabels.join(", ") || "(none)",
      });
    }
  }

  for (const forbiddenCategory of testCase.forbiddenCategories ?? []) {
    if (actualIntelligenceCategories.includes(forbiddenCategory)) {
      mismatches.push({
        field: "forbiddenCategories",
        expected: `must not include ${OBSERVATION_LEARNING_CATEGORY_LABELS[forbiddenCategory]}`,
        actual: actualIntelligenceLabels.join(", "),
      });
    }
  }

  for (const findingId of testCase.expectedNormalizedFindingIds ?? []) {
    const matched = actualNormalizedFindingIds.some((id) =>
      normalizedFindingIdMatches(id, findingId),
    );
    if (!matched) {
      mismatches.push({
        field: "findings",
        expected: findingId,
        actual: actualNormalizedFindingIds.join(", ") || "(none)",
      });
    }
  }

  for (const forbiddenFindingId of testCase.forbiddenNormalizedFindingIds ?? []) {
    if (actualNormalizedFindingIds.includes(forbiddenFindingId)) {
      mismatches.push({
        field: "forbiddenFindings",
        expected: `must not include ${forbiddenFindingId}`,
        actual: actualNormalizedFindingIds.join(", "),
      });
    }
  }

  for (const [categoryId, maxCount] of Object.entries(testCase.maxFindingsPerCategory ?? {})) {
    const category = categoryId as ObservationLearningCategoryId;
    const count = pipeline.aggregatedByCategory[category]?.length ?? 0;
    if (count > maxCount) {
      mismatches.push({
        field: "findingCount",
        expected: `${OBSERVATION_LEARNING_CATEGORY_LABELS[category]} ≤ ${maxCount}`,
        actual: String(count),
      });
    }
  }

  for (const [findingId, expectedCount] of Object.entries(testCase.expectedObservationCount ?? {})) {
    const finding = flatFindings.find((entry) => normalizedFindingIdMatches(entry.normalizedFindingId, findingId));
    const actualCount = finding?.observationCount ?? 0;
    if (actualCount !== expectedCount) {
      mismatches.push({
        field: "observationCount",
        expected: `${findingId} observed in ${expectedCount} cases`,
        actual: String(actualCount),
      });
    }
  }

  for (const [pillarId, expectedValidated] of Object.entries(testCase.expectedEvidence) as Array<
    [EvidencePillarId, boolean]
  >) {
    const actualValidated = actualEvidence[pillarId] ?? false;
    if (actualValidated !== expectedValidated) {
      mismatches.push({
        field: "evidence",
        expected: `${EVIDENCE_PILLAR_LABELS[pillarId]} = ${expectedValidated ? "Validated" : "Not validated"}`,
        actual: `${EVIDENCE_PILLAR_LABELS[pillarId]} = ${actualValidated ? "Validated" : "Not validated"}`,
      });
    }
  }

  if (testCase.expectedEvidenceCount !== undefined) {
    if (pipeline.evidenceProgressSignalCount !== testCase.expectedEvidenceCount) {
      mismatches.push({
        field: "evidenceCount",
        expected: String(testCase.expectedEvidenceCount),
        actual: String(pipeline.evidenceProgressSignalCount),
      });
    }
  }

  return {
    id: testCase.id,
    name: testCase.name,
    category: testCase.category,
    note: testCase.note,
    tier,
    passed: mismatches.length === 0,
    mismatches,
    actual: {
      factTypes: actualFactTypes,
      intelligenceCategories: actualIntelligenceCategories,
      intelligenceLabels: actualIntelligenceLabels,
      normalizedFindingIds: actualNormalizedFindingIds,
      evidence: actualEvidence,
      evidenceCount: pipeline.evidenceProgressSignalCount,
      aggregatedFindings: flatFindings,
    },
  };
}

/** Run all formal observation intelligence test cases and compare pipeline output. */
export async function runObservationIntelligenceTestSuite(
  options: RunObservationIntelligenceTestSuiteOptions = {},
): Promise<ObservationIntelligenceTestSuiteResult> {
  const results: ObservationIntelligenceTestResult[] = [];
  for (const testCase of OBSERVATION_INTELLIGENCE_ALL_TEST_CASES) {
    results.push(await runSingleTestCase(testCase, options));
  }

  const passed = results.filter((result) => result.passed).length;
  const rulesResults = results.filter((result) => result.tier === "rules");
  const hybridResults = results.filter((result) => result.tier === "hybrid");

  return {
    results,
    passed,
    failed: results.length - passed,
    total: results.length,
    passRate: results.length === 0 ? 0 : passed / results.length,
    rulesPassed: rulesResults.filter((result) => result.passed).length,
    rulesTotal: rulesResults.length,
    hybridPassed: hybridResults.filter((result) => result.passed).length,
    hybridTotal: hybridResults.length,
  };
}

export function formatObservationIntelligenceTestMismatch(mismatch: ObservationIntelligenceTestMismatch): string {
  return `[${mismatch.field}] expected: ${mismatch.expected} | actual: ${mismatch.actual}`;
}

export function meetsObservationIntelligencePassRate(suite: ObservationIntelligenceTestSuiteResult): boolean {
  return suite.passRate >= OBSERVATION_INTELLIGENCE_MIN_PASS_RATE;
}

export { OBSERVATION_INTELLIGENCE_MIN_PASS_RATE };

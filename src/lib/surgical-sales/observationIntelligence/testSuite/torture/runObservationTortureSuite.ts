import { extractObservationFacts } from "../../extractObservationFacts";
import { runObservationIntelligencePipeline } from "../../observationIntelligencePipeline";
import { OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE } from "../observationIntelligenceTestConfig";
import { OBSERVATION_INTELLIGENCE_TORTURE_CASES } from "./observationIntelligenceTortureCases";
import type { ObservationTortureTestCase } from "./observationIntelligenceTortureCaseTypes";
import {
  detectTortureFindings,
  type TortureFindingToken,
} from "./tortureFindingVocabulary";

export type TortureTestMismatch = {
  kind: "missing" | "forbidden";
  finding: TortureFindingToken;
};

export type TortureTestResult = {
  id: number;
  style: ObservationTortureTestCase["style"];
  dictation: string;
  passed: boolean;
  expectedFindings: TortureFindingToken[];
  forbiddenFindings: TortureFindingToken[];
  actualFindings: TortureFindingToken[];
  mismatches: TortureTestMismatch[];
  factTypes: string[];
};

export type TortureSuiteResult = {
  results: TortureTestResult[];
  passed: number;
  failed: number;
  total: number;
  passRate: number;
  byStyle: Record<
    ObservationTortureTestCase["style"],
    { passed: number; total: number; passRate: number }
  >;
};

function compareFindings(
  expected: TortureFindingToken[],
  forbidden: TortureFindingToken[],
  actual: Set<TortureFindingToken>,
): TortureTestMismatch[] {
  const mismatches: TortureTestMismatch[] = [];

  for (const finding of expected) {
    if (!actual.has(finding)) {
      mismatches.push({ kind: "missing", finding });
    }
  }

  for (const finding of forbidden) {
    if (actual.has(finding)) {
      mismatches.push({ kind: "forbidden", finding });
    }
  }

  return mismatches;
}

function runSingleTortureCase(testCase: ObservationTortureTestCase): TortureTestResult {
  const priorCases =
    testCase.crossCaseDictations?.map((dictation, index) => ({
      id: `prior-${testCase.id}-${index + 1}`,
      notes: dictation,
    })) ?? [];

  const extraction = extractObservationFacts(testCase.dictation);
  const pipeline = runObservationIntelligencePipeline({
    caseRow: { id: `torture-${testCase.id}` },
    priorCases,
    activities: [{ activity_type: "note", body: testCase.dictation }],
  });

  const actual = detectTortureFindings({ facts: extraction.facts, pipeline });
  const mismatches = compareFindings(
    testCase.expectedFindings,
    testCase.forbiddenFindings,
    actual,
  );

  return {
    id: testCase.id,
    style: testCase.style,
    dictation: testCase.dictation,
    passed: mismatches.length === 0,
    expectedFindings: testCase.expectedFindings,
    forbiddenFindings: testCase.forbiddenFindings,
    actualFindings: [...actual],
    mismatches,
    factTypes: [...new Set(extraction.facts.map((fact) => fact.type))],
  };
}

/** Run all torture dictation cases against rules-tier extraction. */
export function runObservationTortureSuite(): TortureSuiteResult {
  const results = OBSERVATION_INTELLIGENCE_TORTURE_CASES.map(runSingleTortureCase);
  const passed = results.filter((result) => result.passed).length;
  const total = results.length;

  const byStyle = {} as TortureSuiteResult["byStyle"];
  for (const style of [
    "short",
    "conversational",
    "messy",
    "long",
    "ambiguous",
    "none",
  ] as const) {
    const styleResults = results.filter((result) => result.style === style);
    const stylePassed = styleResults.filter((result) => result.passed).length;
    byStyle[style] = {
      passed: stylePassed,
      total: styleResults.length,
      passRate: styleResults.length === 0 ? 1 : stylePassed / styleResults.length,
    };
  }

  return {
    results,
    passed,
    failed: total - passed,
    total,
    passRate: total === 0 ? 0 : passed / total,
    byStyle,
  };
}

export function meetsObservationTorturePassRate(suite: TortureSuiteResult): boolean {
  return suite.passRate >= OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE;
}

export function formatTortureSuiteReport(suite: TortureSuiteResult): string {
  const lines: string[] = [];
  const passLabel = suite.passRate >= OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE ? "PASS" : "FAIL";
  lines.push(`${passLabel} ${suite.passed}/${suite.total}`);
  lines.push("");

  if (suite.failed > 0) {
    lines.push("FAILED CASES");
    lines.push("");

    for (const result of suite.results.filter((entry) => !entry.passed)) {
      lines.push(`Case ${result.id} [${result.style}]`);
      lines.push(`Dictation: ${result.dictation.slice(0, 120)}${result.dictation.length > 120 ? "..." : ""}`);

      const missing = result.mismatches.filter((m) => m.kind === "missing");
      const forbidden = result.mismatches.filter((m) => m.kind === "forbidden");

      if (missing.length > 0) {
        lines.push("Expected:");
        for (const mismatch of missing) {
          lines.push(`  ${mismatch.finding}`);
        }
        lines.push("Actual:");
        lines.push(`  ${result.actualFindings.length > 0 ? result.actualFindings.join(", ") : "none"}`);
      }

      if (forbidden.length > 0) {
        lines.push("Forbidden (but detected):");
        for (const mismatch of forbidden) {
          lines.push(`  ${mismatch.finding}`);
        }
        lines.push("Actual:");
        lines.push(`  ${result.actualFindings.join(", ") || "none"}`);
      }

      lines.push("");
    }
  }

  lines.push("BY STYLE");
  for (const [style, stats] of Object.entries(suite.byStyle)) {
    if (stats.total === 0) continue;
    lines.push(`  ${style}: ${stats.passed}/${stats.total} (${Math.round(stats.passRate * 100)}%)`);
  }

  return lines.join("\n");
}

export { OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE };

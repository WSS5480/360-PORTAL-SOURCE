import { notFound } from "next/navigation";

import {
  OBSERVATION_INTELLIGENCE_TEST_CATEGORY_LABELS,
} from "@/lib/surgical-sales/observationIntelligence/testSuite/observationIntelligenceTestCases";
import {
  formatObservationIntelligenceTestMismatch,
  meetsObservationIntelligencePassRate,
  OBSERVATION_INTELLIGENCE_MIN_PASS_RATE,
  runObservationIntelligenceTestSuite,
} from "@/lib/surgical-sales/observationIntelligence/testSuite/runObservationIntelligenceTestSuite";
import {
  formatTortureSuiteReport,
  meetsObservationTorturePassRate,
  OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE,
  runObservationTortureSuite,
} from "@/lib/surgical-sales/observationIntelligence/testSuite/torture/runObservationTortureSuite";
import { EVIDENCE_PILLAR_LABELS } from "@/lib/surgical-sales/observationIntelligence/scoreObservationEvidence";

export default async function ObservationIntelligenceTestsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const suite = await runObservationIntelligenceTestSuite({ includeHybrid: false });
  const tortureSuite = runObservationTortureSuite();
  const resultsByCategory = suite.results.reduce<
    Record<string, typeof suite.results>
  >((groups, result) => {
    const key = result.category;
    groups[key] = groups[key] ?? [];
    groups[key].push(result);
    return groups;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#eee", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Observation Intelligence Test Suite</h1>
        <p style={{ margin: 0, color: "#aaa", fontSize: 14 }}>
          Dev-only runner for fact extraction, normalized findings, category grouping, and evidence scoring.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <StatCard label="Total" value={String(suite.total)} />
        <StatCard label="Passed" value={String(suite.passed)} tone="pass" />
        <StatCard label="Failed" value={String(suite.failed)} tone={suite.failed > 0 ? "fail" : "pass"} />
        <StatCard
          label="Pass rate"
          value={`${Math.round(suite.passRate * 100)}%`}
          tone={meetsObservationIntelligencePassRate(suite) ? "pass" : "fail"}
        />
        <StatCard
          label="Min pass rate"
          value={`${Math.round(OBSERVATION_INTELLIGENCE_MIN_PASS_RATE * 100)}%`}
        />
        <StatCard label="Rules tier" value={`${suite.rulesPassed}/${suite.rulesTotal}`} />
        <StatCard label="Hybrid tier" value={`${suite.hybridPassed}/${suite.hybridTotal}`} />
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: "#ccc" }}>Torture Validation Suite (100 dictations)</h2>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard label="Torture total" value={String(tortureSuite.total)} />
          <StatCard
            label="Torture pass"
            value={`${tortureSuite.passed}/${tortureSuite.total}`}
            tone={meetsObservationTorturePassRate(tortureSuite) ? "pass" : "fail"}
          />
          <StatCard
            label="Torture pass rate"
            value={`${Math.round(tortureSuite.passRate * 100)}%`}
            tone={meetsObservationTorturePassRate(tortureSuite) ? "pass" : "fail"}
          />
          <StatCard
            label="Torture min rate"
            value={`${Math.round(OBSERVATION_INTELLIGENCE_TORTURE_MIN_PASS_RATE * 100)}%`}
          />
        </div>
        <pre
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 16,
            fontSize: 12,
            lineHeight: 1.5,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {formatTortureSuiteReport(tortureSuite)}
        </pre>
      </section>

      {Object.entries(resultsByCategory).map(([category, results]) => (
        <section key={category} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12, color: "#ccc" }}>
            {OBSERVATION_INTELLIGENCE_TEST_CATEGORY_LABELS[
              category as keyof typeof OBSERVATION_INTELLIGENCE_TEST_CATEGORY_LABELS
            ] ?? category}
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            {results.map((result) => (
              <article
                key={result.id}
                style={{
                  border: `1px solid ${result.passed ? "#1f4d2e" : "#5c2323"}`,
                  background: result.passed ? "#0f1f14" : "#1f1212",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div>
                    <strong>{result.name}</strong>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {result.id} · tier: {result.tier}
                    </div>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      color: result.passed ? "#4ade80" : "#f87171",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {result.passed ? "PASS" : "FAIL"}
                  </span>
                </div>

                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>
                  {result.note}
                </p>

                <div style={{ fontSize: 12, color: "#bbb", display: "grid", gap: 6 }}>
                  <div>
                    <strong>Facts:</strong> {result.actual.factTypes.join(", ") || "(none)"}
                  </div>
                  <div>
                    <strong>Normalized findings:</strong>{" "}
                    {result.actual.normalizedFindingIds.join(", ") || "(none)"}
                  </div>
                  <div>
                    <strong>Intelligence:</strong>{" "}
                    {result.actual.intelligenceLabels.join(", ") || "(none)"}
                  </div>
                  <div>
                    <strong>Evidence ({result.actual.evidenceCount}/5):</strong>{" "}
                    {Object.entries(result.actual.evidence)
                      .filter(([, validated]) => validated)
                      .map(([pillarId]) => EVIDENCE_PILLAR_LABELS[pillarId as keyof typeof EVIDENCE_PILLAR_LABELS])
                      .join(", ") || "(none validated)"}
                  </div>
                  {result.actual.aggregatedFindings.length > 0 ? (
                    <div>
                      <strong>Cross-case counts:</strong>{" "}
                      {result.actual.aggregatedFindings
                        .map(
                          (finding) =>
                            `${finding.normalizedFindingId} (${finding.observationCount}, ${finding.confidence})`,
                        )
                        .join("; ")}
                    </div>
                  ) : null}
                </div>

                {!result.passed ? (
                  <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#fca5a5", fontSize: 12 }}>
                    {result.mismatches.map((mismatch, index) => (
                      <li key={`${result.id}-mismatch-${index}`}>
                        {formatObservationIntelligenceTestMismatch(mismatch)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pass" | "fail";
}) {
  const color = tone === "pass" ? "#4ade80" : tone === "fail" ? "#f87171" : "#eee";

  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 8,
        padding: "12px 16px",
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

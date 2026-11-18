"use client";

import React from "react";
import type { ExperimentalUniversalFactRunDto } from "@/components/sales/universalExtractor/ExperimentalUniversalFactsPanel";
import { experimentalProviderIntelligenceComparisonCss } from "@/components/sales/universalExtractor/experimentalProviderIntelligenceComparisonCss";
import type { ProviderIntelligenceFieldBriefingView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { buildProviderIntelligenceComparisonCurrentView } from "@/lib/surgical-sales/universalExtractor/buildProviderIntelligenceComparisonCurrentView";
import { buildProviderIntelligenceFromUniversalFacts } from "@/lib/surgical-sales/universalExtractor/buildProviderIntelligenceFromUniversalFacts";
import type { ProviderIntelligenceComparisonTopicRow } from "@/lib/surgical-sales/universalExtractor/providerIntelligenceComparisonTypes";
import { isUniversalFactsPanelClientEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsPanelVisible";
import { userFacingError } from "@/lib/errors/userFacingError";

type UniversalFactsQuery = {
  providerId?: string;
  organizationId?: string;
};

function TopicRows({ topics }: { topics: ProviderIntelligenceComparisonTopicRow[] }) {
  if (topics.length === 0) {
    return <p className="exp-provider-intel-compare__empty">No comparable topics yet.</p>;
  }

  return (
    <ul className="exp-provider-intel-compare__list">
      {topics.map((topic) => (
        <li key={topic.concept} className="exp-provider-intel-compare__topic">
          <p className="exp-provider-intel-compare__topic-label">{topic.label}</p>
          <div className="exp-provider-intel-compare__counts">
            <span>Observed: {topic.observed_count}</span>
            <span>Validated: {topic.validated_count}</span>
          </div>
          {topic.evidence_snippet ? (
            <p className="exp-provider-intel-compare__evidence">{topic.evidence_snippet}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Experimental side-by-side comparison — current Provider Intelligence vs Universal Facts.
 * Read-only. Does not modify existing intelligence pipelines or UI sections.
 */
export function ExperimentalProviderIntelligenceComparison({
  intelligenceView,
  query,
  refreshKey = 0,
  testId = "provider-experimental-intelligence-comparison",
}: {
  intelligenceView: Pick<
    ProviderIntelligenceFieldBriefingView,
    "fieldEvidence" | "emergingSignals" | "needsMoreEvidence" | "caseIntelligence" | "hasFieldEvidence"
  >;
  query: UniversalFactsQuery;
  refreshKey?: number;
  testId?: string;
}) {
  const enabled = isUniversalFactsPanelClientEnabled();
  const [runs, setRuns] = React.useState<ExperimentalUniversalFactRunDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentSnapshot = React.useMemo(
    () => buildProviderIntelligenceComparisonCurrentView(intelligenceView),
    [intelligenceView],
  );

  const hasScope = Boolean(query.providerId || query.organizationId);

  const loadFacts = React.useCallback(async () => {
    if (!enabled || !hasScope) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.providerId) params.set("provider_id", query.providerId);
      if (query.organizationId) params.set("organization_id", query.organizationId);

      const res = await fetch(`/api/portal/sales/universal-facts?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        runs?: ExperimentalUniversalFactRunDto[];
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "");
      }
      setRuns(json.runs ?? []);
    } catch (caught: unknown) {
      setRuns([]);
      setError(userFacingError(caught, "We could not load this page. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [enabled, hasScope, query.organizationId, query.providerId]);

  React.useEffect(() => {
    void loadFacts();
  }, [loadFacts, refreshKey]);

  if (!enabled) return null;

  const experimentalSnapshot = buildProviderIntelligenceFromUniversalFacts({
    runs: runs.map((run) => ({
      capture_id: run.capture_id,
      declared_source_type: run.declared_source_type,
      created_at: run.created_at,
      facts: run.facts.map((fact) => ({
        concept: fact.concept,
        assertion_level: fact.assertion_level,
        evidence_snippets: fact.evidence_snippets,
      })),
    })),
  });

  return (
    <>
      <style>{experimentalProviderIntelligenceComparisonCss}</style>
      <section
        className="exp-provider-intel-compare"
        data-testid={testId}
        aria-label="Experimental provider intelligence comparison"
      >
        <p className="exp-provider-intel-compare__kicker">Experimental</p>
        <h2 className="exp-provider-intel-compare__title">Provider Intelligence from Universal Facts</h2>
        <p className="exp-provider-intel-compare__note">
          Side-by-side comparison to evaluate whether Provider Intelligence can eventually be generated
          from Universal Facts instead of separate pipelines. Existing intelligence above is unchanged.
        </p>

        {loading ? <p className="exp-provider-intel-compare__status">Loading universal facts…</p> : null}
        {error ? <p className="exp-provider-intel-compare__error">{error}</p> : null}

        {!loading ? (
          <div className="exp-provider-intel-compare__columns">
            <div className="exp-provider-intel-compare__column">
              <h3 className="exp-provider-intel-compare__column-title">Current Provider Intelligence</h3>
              <p className="exp-provider-intel-compare__column-subtitle">Existing system</p>
              <TopicRows topics={currentSnapshot.topics} />
            </div>

            <div className="exp-provider-intel-compare__column exp-provider-intel-compare__column--experimental">
              <h3 className="exp-provider-intel-compare__column-title">
                Experimental Provider Intelligence
              </h3>
              <p className="exp-provider-intel-compare__column-subtitle">Generated from Universal Facts</p>
              <TopicRows topics={experimentalSnapshot.topics} />
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

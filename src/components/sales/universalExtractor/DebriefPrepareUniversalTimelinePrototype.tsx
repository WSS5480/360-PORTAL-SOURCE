"use client";

import React from "react";
import type { ExperimentalUniversalFactRunDto } from "@/components/sales/universalExtractor/ExperimentalUniversalFactsPanel";
import { debriefPrepareUniversalTimelineCss } from "@/components/sales/universalExtractor/debriefPrepareUniversalTimelineCss";
import { isUniversalFactsPanelClientEnabled } from "@/lib/surgical-sales/universalExtractor/universalFactsPanelVisible";
import { formatConceptTimelineSourceLabel } from "@/lib/surgical-sales/universalExtractor/buildUniversalConceptTimeline";
import {
  formatDebriefPrepareCaseCount,
  formatDebriefPrepareConceptRepLabel,
} from "@/lib/surgical-sales/universalExtractor/debriefPrepareConceptDisplay";
import {
  summarizeUniversalConceptTimelineForDebriefPrepare,
  type DebriefPrepareConceptDigest,
  type DebriefPrepareConceptTimelineSummary,
} from "@/lib/surgical-sales/universalExtractor/summarizeUniversalConceptTimelineForDebriefPrepare";
import { userFacingError } from "@/lib/errors/userFacingError";

type UniversalFactsQuery = {
  caseId?: string;
  encounterId?: string;
  providerId?: string;
  organizationId?: string;
};

type RepBucketConfig = {
  title: string;
  hint?: string;
  items: DebriefPrepareConceptDigest[];
  countLabel: (item: DebriefPrepareConceptDigest) => string;
};

function formatSourceTypes(sourceTypes: string[]): string {
  return sourceTypes.map((source) => formatConceptTimelineSourceLabel(source)).join(", ");
}

function ConceptDigestList({
  items,
  countLabel,
}: {
  items: DebriefPrepareConceptDigest[];
  countLabel: (item: DebriefPrepareConceptDigest) => string;
}) {
  if (items.length === 0) {
    return <p className="dpb-universal-timeline-proto__bucket-empty">Nothing here yet.</p>;
  }

  return (
    <ol className="dpb-universal-timeline-proto__list">
      {items.map((item) => (
        <li key={item.concept}>
          <div className="dpb-universal-timeline-proto__item-concept">
            {formatDebriefPrepareConceptRepLabel(item.concept)}
          </div>
          <p className="dpb-universal-timeline-proto__item-meta">
            {countLabel(item)}
            {item.source_types.length > 0 ? ` · ${formatSourceTypes(item.source_types)}` : ""}
          </p>
          {item.evidence_snippets[0] ? (
            <p className="dpb-universal-timeline-proto__item-evidence">{item.evidence_snippets[0]}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function SummaryBucket({ title, hint, items, countLabel }: RepBucketConfig) {
  return (
    <section className="dpb-universal-timeline-proto__bucket">
      <h3 className="dpb-universal-timeline-proto__bucket-title">{title}</h3>
      {hint ? <p className="dpb-universal-timeline-proto__bucket-hint">{hint}</p> : null}
      <ConceptDigestList items={items} countLabel={countLabel} />
    </section>
  );
}

function buildRepBuckets(summary: DebriefPrepareConceptTimelineSummary): RepBucketConfig[] {
  return [
    {
      title: "Strongest debrief topics",
      hint: "Seen in cases and confirmed by the provider.",
      items: summary.strongest_debrief_topics,
      countLabel: (item) =>
        `Seen in ${formatDebriefPrepareCaseCount(item.observed_count)} · Confirmed by provider`,
    },
    {
      title: "Potential topics from observations",
      hint: "Issues noted in the OR that may be worth discussing.",
      items: summary.potential_topics_from_observations,
      countLabel: (item) => `Seen in ${formatDebriefPrepareCaseCount(item.observed_count)}`,
    },
    {
      title: "Mentioned but not yet confirmed",
      hint: "The provider brought these up, but they have not been validated in a debrief yet.",
      items: summary.mentioned_not_yet_confirmed,
      countLabel: () => "Mentioned · Not yet confirmed",
    },
    {
      title: "Positive context",
      hint: "Helpful background — not primary debrief friction topics.",
      items: summary.positive_context,
      countLabel: () => "Positive context",
    },
    {
      title: "Ruled out",
      hint: "The provider pushed back on these during validation.",
      items: summary.ruled_out,
      countLabel: () => "Ruled out during debrief",
    },
  ];
}

function SummaryStack({ summary }: { summary: DebriefPrepareConceptTimelineSummary }) {
  const buckets = buildRepBuckets(summary);

  return (
    <div className="dpb-universal-timeline-proto__stack">
      {buckets.map((bucket) => (
        <SummaryBucket key={bucket.title} {...bucket} />
      ))}
    </div>
  );
}

/**
 * Experimental Debrief Prepare readout — consumes Universal Concept Timeline only.
 * Does not replace existing debrief briefing intelligence.
 */
export function DebriefPrepareUniversalTimelinePrototype({
  query,
  refreshKey = 0,
  testId = "debrief-prepare-universal-timeline-prototype",
}: {
  query: UniversalFactsQuery;
  refreshKey?: number;
  testId?: string;
}) {
  const enabled = isUniversalFactsPanelClientEnabled();
  const [runs, setRuns] = React.useState<ExperimentalUniversalFactRunDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasScope = Boolean(
    query.caseId || query.encounterId || query.providerId || query.organizationId,
  );

  const loadFacts = React.useCallback(async () => {
    if (!enabled || !hasScope) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.caseId) params.set("case_id", query.caseId);
      if (query.encounterId) params.set("encounter_id", query.encounterId);
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
  }, [enabled, hasScope, query.caseId, query.encounterId, query.organizationId, query.providerId]);

  React.useEffect(() => {
    void loadFacts();
  }, [loadFacts, refreshKey]);

  if (!enabled) return null;

  const summary = summarizeUniversalConceptTimelineForDebriefPrepare({
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
      <style>{debriefPrepareUniversalTimelineCss}</style>
      <section
        className="dpb-universal-timeline-proto"
        data-testid={testId}
        aria-label="Experimental debrief prep preview"
      >
        <p className="dpb-universal-timeline-proto__kicker">Experimental</p>
        <h2 className="dpb-universal-timeline-proto__title">Debrief prep preview</h2>
        <p className="dpb-universal-timeline-proto__note">
          Read-only preview of field intelligence grouped for debrief planning. Your current debrief
          briefing is unchanged.
        </p>

        {loading ? <p className="dpb-universal-timeline-proto__status">Loading preview…</p> : null}
        {error ? <p className="dpb-universal-timeline-proto__error">{error}</p> : null}

        {!loading && !error ? (
          <>
            {summary.meta.has_timeline_data ? (
              <SummaryStack summary={summary} />
            ) : (
              <p className="dpb-universal-timeline-proto__status">
                No field notes saved for this scope yet. Capture observation notes or discovery notes
                to populate this preview.
              </p>
            )}
          </>
        ) : null}
      </section>
    </>
  );
}

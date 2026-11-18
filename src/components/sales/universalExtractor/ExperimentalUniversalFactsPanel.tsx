"use client";

import React from "react";
import {
  isUniversalFactsPanelClientEnabled,
  universalFactsConfidenceScore,
} from "@/lib/surgical-sales/universalExtractor/universalFactsPanelVisible";
import {
  UNIVERSAL_ASSERTION_PROBE_SOURCE_TYPES,
  UNIVERSAL_DEBRIEF_VALIDATION_PROBE_PRESETS,
  UNIVERSAL_DEFAULT_ASSERTION_PROBE_NOTE,
  UNIVERSAL_SOURCE_TYPE_OPTIONS,
  formatUniversalDeclaredSourceType,
} from "@/lib/surgical-sales/universalExtractor/universalDeclaredSourceTypes";
import {
  buildUniversalConceptTimeline,
  formatConceptTimelineSourceLabel,
  groupConceptTimelineEventsByAssertion,
} from "@/lib/surgical-sales/universalExtractor/buildUniversalConceptTimeline";
import type { UniversalDeclaredSourceType } from "@/lib/surgical-sales/universalExtractor/types";
import { experimentalUniversalFactsCss } from "./experimentalUniversalFactsCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export type ExperimentalUniversalFactDto = {
  id: string;
  concept: string;
  normalized_label: string;
  assertion_level: string;
  source_type: string;
  confidence: string;
  uncertain: boolean;
  negated: boolean;
  evidence_count: number;
  evidence_snippets: string[];
  merged_fact_ids: string[];
};

export type ExperimentalUniversalFactRunDto = {
  capture_id: string;
  declared_source_type: string;
  extraction_model: string;
  created_at: string;
  operational_note_id: string | null;
  facts: ExperimentalUniversalFactDto[];
};

export type ExperimentalUniversalFactProbeDto = {
  probe_label?: string | null;
  raw_note?: string;
  declared_source_type: string;
  extraction_model: string;
  facts: ExperimentalUniversalFactDto[];
};

type UniversalFactsQuery = {
  caseId?: string;
  encounterId?: string;
  providerId?: string;
  organizationId?: string;
};

function formatExtractionRunTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function extractionRunTitle(index: number): string {
  return index === 0 ? "Latest Extraction Run" : "Previous Extraction Run";
}

function UniversalFactList({
  facts,
  listLabel,
}: {
  facts: ExperimentalUniversalFactDto[];
  listLabel: string;
}) {
  if (facts.length === 0) {
    return <p className="exp-universal-facts__run-empty">No facts extracted.</p>;
  }

  return (
    <ul className="exp-universal-facts__run-list" aria-label={listLabel}>
      {facts.map((fact) => (
        <li key={fact.id} className="exp-universal-facts__item">
          <p className="exp-universal-facts__concept">{fact.concept}</p>
          <p className="exp-universal-facts__meta">
            assertion: {fact.assertion_level}
            <br />
            confidence: {universalFactsConfidenceScore(fact.confidence).toFixed(2)}
            <br />
            evidence_count: {fact.evidence_count}
            {fact.uncertain ? (
              <>
                <br />
                uncertain: true
              </>
            ) : null}
          </p>
          <p className="exp-universal-facts__label">{fact.normalized_label}</p>
          {fact.evidence_count > 1 ? (
            <details className="exp-universal-facts__evidence">
              <summary className="exp-universal-facts__evidence-summary">
                Supporting evidence ({fact.evidence_count})
              </summary>
              <ul className="exp-universal-facts__evidence-list">
                {fact.evidence_snippets.map((snippet, snippetIndex) => (
                  <li key={`${fact.id}-evidence-${snippetIndex}`} className="exp-universal-facts__evidence-item">
                    {snippet}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function UniversalFactRunSection({
  run,
  title,
  testId,
}: {
  run: ExperimentalUniversalFactRunDto;
  title: string;
  testId: string;
}) {
  return (
    <section className="exp-universal-facts__run" data-testid={testId}>
      <h3 className="exp-universal-facts__run-title">{title}</h3>
      <p className="exp-universal-facts__run-meta">
        declared_source_type: <code>{run.declared_source_type}</code>
        <br />
        label: {formatUniversalDeclaredSourceType(run.declared_source_type)}
        <br />
        Time: {formatExtractionRunTimestamp(run.created_at)}
      </p>
      <UniversalFactList facts={run.facts} listLabel={`${title} facts`} />
    </section>
  );
}

function UniversalFactProbeSection({
  probe,
  testId,
}: {
  probe: ExperimentalUniversalFactProbeDto;
  testId: string;
}) {
  return (
    <section className="exp-universal-facts__probe-result" data-testid={testId}>
      <h4 className="exp-universal-facts__probe-result-title">
        {probe.probe_label ?? `declared_source_type: ${probe.declared_source_type}`}
      </h4>
      <p className="exp-universal-facts__probe-result-meta">
        declared_source_type: <code>{probe.declared_source_type}</code>
        {probe.raw_note ? (
          <>
            <br />
            note: {probe.raw_note}
          </>
        ) : null}
        <br />
        {formatUniversalDeclaredSourceType(probe.declared_source_type)} · in-memory probe (not saved)
      </p>
      <UniversalFactList
        facts={probe.facts}
        listLabel={`Probe facts for ${probe.declared_source_type}`}
      />
    </section>
  );
}

function UniversalConceptTimeline({
  runs,
  testId,
}: {
  runs: ExperimentalUniversalFactRunDto[];
  testId: string;
}) {
  const timeline = React.useMemo(
    () =>
      buildUniversalConceptTimeline(
        runs.map((run) => ({
          capture_id: run.capture_id,
          declared_source_type: run.declared_source_type,
          created_at: run.created_at,
          facts: run.facts.map((fact) => ({
            concept: fact.concept,
            assertion_level: fact.assertion_level,
            evidence_snippets: fact.evidence_snippets,
          })),
        })),
      ),
    [runs],
  );

  if (timeline.length === 0) return null;

  return (
    <section className="exp-universal-facts__timeline" data-testid={testId}>
      <h3 className="exp-universal-facts__timeline-title">Concept timeline</h3>
      <p className="exp-universal-facts__timeline-note">
        Assertion history per canonical concept across saved extraction runs (oldest to newest). New
        validation or rejection runs add evidence without overwriting prior observed facts.
      </p>
      {timeline.map((entry) => {
        const assertionGroups = groupConceptTimelineEventsByAssertion(entry.events);
        return (
          <article key={entry.concept} className="exp-universal-facts__timeline-entry">
            <h4 className="exp-universal-facts__timeline-concept">{entry.concept}</h4>
            <div className="exp-universal-facts__timeline-groups">
              {assertionGroups.map((group) => (
                <section
                  key={`${entry.concept}-${group.assertion_level}`}
                  className="exp-universal-facts__timeline-group"
                >
                  <h5 className="exp-universal-facts__timeline-group-title">{group.assertion_label}</h5>
                  <ul className="exp-universal-facts__timeline-group-events">
                    {group.events.map((event, index) => (
                      <li
                        key={`${entry.concept}-${event.capture_id}-${index}`}
                        className="exp-universal-facts__timeline-event"
                      >
                        <span className="exp-universal-facts__timeline-source">
                          {formatConceptTimelineSourceLabel(event.declared_source_type)}
                        </span>
                        <span className="exp-universal-facts__timeline-time">
                          {formatExtractionRunTimestamp(event.created_at)}
                        </span>
                        {event.evidence_snippets[0] ? (
                          <p className="exp-universal-facts__timeline-evidence">
                            {event.evidence_snippets[0]}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function ExperimentalUniversalFactsPanel({
  query,
  refreshKey = 0,
  testId = "experimental-universal-facts",
}: {
  query: UniversalFactsQuery;
  refreshKey?: number;
  testId?: string;
}) {
  const enabled = isUniversalFactsPanelClientEnabled();
  const [runs, setRuns] = React.useState<ExperimentalUniversalFactRunDto[]>([]);
  const [probes, setProbes] = React.useState<ExperimentalUniversalFactProbeDto[]>([]);
  const [probeNote, setProbeNote] = React.useState(UNIVERSAL_DEFAULT_ASSERTION_PROBE_NOTE);
  const [probeSourceType, setProbeSourceType] =
    React.useState<UniversalDeclaredSourceType>("observation_case");
  const [loading, setLoading] = React.useState(false);
  const [probing, setProbing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [probeError, setProbeError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

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

  const runProbe = React.useCallback(
    async (options?: {
      compareSourceTypes?: UniversalDeclaredSourceType[];
      compareNoteProbes?: Array<{
        raw_note: string;
        declared_source_type: UniversalDeclaredSourceType;
        probe_label?: string;
      }>;
      note?: string;
      sourceType?: UniversalDeclaredSourceType;
    }) => {
      if (!enabled) return;

      setProbing(true);
      setProbeError(null);
      try {
        const body = options?.compareNoteProbes
          ? { compare_note_probes: options.compareNoteProbes }
          : {
              raw_note: (options?.note ?? probeNote).trim(),
              ...(options?.compareSourceTypes
                ? { compare_source_types: options.compareSourceTypes }
                : { declared_source_type: options?.sourceType ?? probeSourceType }),
            };

        const trimmed = "raw_note" in body ? String(body.raw_note ?? "").trim() : "";
        if (!options?.compareNoteProbes && trimmed.length < 1) {
          setProbeError("Enter a note to probe.");
          return;
        }

        const res = await fetch("/api/portal/sales/universal-facts/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          probes?: ExperimentalUniversalFactProbeDto[];
        };
        if (!res.ok || !json.ok) {
          throw new Error(
            typeof json.error === "string" ? json.error : "Could not run source type probe",
          );
        }
        setProbes(json.probes ?? []);
      } catch (caught: unknown) {
        setProbes([]);
        setProbeError(userFacingError(caught, "We could not complete that probe. Please try again."));
      } finally {
        setProbing(false);
      }
    },
    [enabled, probeNote, probeSourceType],
  );

  React.useEffect(() => {
    if (!open || !enabled) return;
    void loadFacts();
  }, [open, enabled, loadFacts, refreshKey]);

  if (!enabled || !hasScope) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: experimentalUniversalFactsCss }} />
      <details
        className="exp-universal-facts"
        data-testid={testId}
        onToggle={(event) => {
          setOpen((event.currentTarget as HTMLDetailsElement).open);
        }}
      >
        <summary className="exp-universal-facts__summary">Experimental Universal Facts</summary>
        <div className="exp-universal-facts__body">
          <p className="exp-universal-facts__note">
            Read-only comparison layer. Current intelligence above remains the source of truth. Universal
            facts do not modify provider, case, debrief, stages, or opportunities.
          </p>

          <section className="exp-universal-facts__probe" data-testid={`${testId}-probe`}>
            <h3 className="exp-universal-facts__probe-title">Source type probe</h3>
            <p className="exp-universal-facts__probe-note">
              Run the same note with different <code>declared_source_type</code> values. Canonical concepts
              should stay the same; only assertion level should change. Probes are in-memory only and are
              not saved to workflow intelligence.
            </p>
            <label className="exp-universal-facts__probe-field">
              <span className="exp-universal-facts__probe-label">declared_source_type</span>
              <select
                className="exp-universal-facts__probe-select"
                value={probeSourceType}
                onChange={(event) =>
                  setProbeSourceType(event.target.value as UniversalDeclaredSourceType)
                }
              >
                {UNIVERSAL_SOURCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} — {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="exp-universal-facts__probe-field">
              <span className="exp-universal-facts__probe-label">Note</span>
              <textarea
                className="exp-universal-facts__probe-textarea"
                rows={3}
                value={probeNote}
                onChange={(event) => setProbeNote(event.target.value)}
              />
            </label>
            <div className="exp-universal-facts__probe-actions">
              <button
                type="button"
                className="exp-universal-facts__probe-btn"
                disabled={probing}
                onClick={() => void runProbe()}
              >
                {probing ? "Running…" : "Run selected source type"}
              </button>
              <button
                type="button"
                className="exp-universal-facts__probe-btn exp-universal-facts__probe-btn--secondary"
                disabled={probing}
                onClick={() => void runProbe({ compareSourceTypes: UNIVERSAL_ASSERTION_PROBE_SOURCE_TYPES })}
              >
                Compare assertion sources (4)
              </button>
              <button
                type="button"
                className="exp-universal-facts__probe-btn exp-universal-facts__probe-btn--secondary"
                disabled={probing}
                onClick={() =>
                  void runProbe({
                    compareNoteProbes: UNIVERSAL_DEBRIEF_VALIDATION_PROBE_PRESETS.map((preset) => ({
                      raw_note: preset.note,
                      declared_source_type: preset.declared_source_type,
                      probe_label: preset.label,
                    })),
                  })
                }
              >
                Compare debrief validate + reject
              </button>
            </div>
            <div className="exp-universal-facts__probe-presets">
              {UNIVERSAL_DEBRIEF_VALIDATION_PROBE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="exp-universal-facts__probe-preset"
                  disabled={probing}
                  onClick={() => {
                    setProbeNote(preset.note);
                    setProbeSourceType(preset.declared_source_type);
                    void runProbe({
                      note: preset.note,
                      sourceType: preset.declared_source_type,
                    });
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {probeError ? <p className="exp-universal-facts__error">{probeError}</p> : null}
            {probes.length > 0 ? (
              <div className="exp-universal-facts__probe-results">
                {probes.map((probe, index) => (
                  <UniversalFactProbeSection
                    key={`${probe.probe_label ?? probe.declared_source_type}-${probe.raw_note ?? index}`}
                    probe={probe}
                    testId={`${testId}-probe-${index}`}
                  />
                ))}
              </div>
            ) : null}
          </section>

          <hr className="exp-universal-facts__run-divider" />

          <h3 className="exp-universal-facts__saved-title">Saved workflow extractions</h3>
          {loading ? <p className="exp-universal-facts__empty">Loading universal facts…</p> : null}
          {error ? <p className="exp-universal-facts__error">{error}</p> : null}
          {!loading && !error && runs.length === 0 ? (
            <p className="exp-universal-facts__empty">
              No universal facts saved for this scope yet. If <code>UNIVERSAL_SURGICAL_FACTS_PERSIST=1</code>{" "}
              is set, save a new note or run debrief analyze, then reopen this section. Facts are not
              backfilled for notes saved before persistence succeeded.
            </p>
          ) : null}
          {!loading && !error && runs.length > 0 ? (
            <>
              <UniversalConceptTimeline runs={runs} testId={`${testId}-timeline`} />
              <hr className="exp-universal-facts__run-divider" />
              <div className="exp-universal-facts__runs">
              {runs.map((run, index) => (
                <React.Fragment key={run.capture_id}>
                  {index > 0 ? <hr className="exp-universal-facts__run-divider" /> : null}
                  <UniversalFactRunSection
                    run={run}
                    title={extractionRunTitle(index)}
                    testId={`${testId}-run-${index}`}
                  />
                </React.Fragment>
              ))}
              </div>
            </>
          ) : null}
        </div>
      </details>
    </>
  );
}

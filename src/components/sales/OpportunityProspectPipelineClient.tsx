"use client";

import Link from "next/link";
import React from "react";
import { SalesCmdLink, SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import type { OpportunityPipelineRow } from "@/lib/surgical-sales/opportunityPipelineView";
import { providersMissionBoardCss } from "@/app/portal/sales/providers/providersMissionBoardCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type PipelineSection = {
  id: string;
  label: string;
  title: string;
  providers: OpportunityPipelineRow[];
};

type PipelineResponse = {
  ok?: boolean;
  error?: string;
  pipeline?: {
    totalCount: number;
    sections: PipelineSection[];
  };
};

function OpportunityPipelineCard({ row }: { row: OpportunityPipelineRow }) {
  return (
    <li className="mission-board-card opportunity-pipeline-card">
      <Link href={row.providerHref} className="mission-board-card-link opportunity-pipeline-card-link">
        <div className="opportunity-pipeline-card-head">
          <strong className="mission-board-card-name">{row.providerName}</strong>
          <span className="opportunity-pipeline-priority" title={row.priorityLabel}>
            {row.priorityScore}
          </span>
        </div>
        {row.organization ? (
          <p className="mission-board-card-org">{row.organization}</p>
        ) : null}
        <dl className="opportunity-pipeline-card-meta">
          {row.specialty ? (
            <>
              <dt>Specialty</dt>
              <dd>{row.specialty}</dd>
            </>
          ) : null}
          <dt>Mission</dt>
          <dd>{row.missionStage}</dd>
          {row.pathwayStageLabel ? (
            <>
              <dt>Stage</dt>
              <dd>{row.pathwayStageLabel}</dd>
            </>
          ) : null}
          <dt>Last touch</dt>
          <dd>{row.lastTouchLabel ?? "—"}</dd>
          {row.nextRecommendedAction ? (
            <>
              <dt>Next action</dt>
              <dd>{row.nextRecommendedAction}</dd>
            </>
          ) : null}
          <dt>Observation</dt>
          <dd>{row.observationDebriefStatus}</dd>
        </dl>
        {row.productsInUse.length > 0 ? (
          <p className="opportunity-pipeline-inline-note">
            <span className="opportunity-pipeline-inline-label">Products in use:</span>{" "}
            {row.productsInUse.join(", ")}
          </p>
        ) : null}
        {row.productFits.length > 0 ? (
          <ul className="opportunity-pipeline-fit-list" aria-label="Product fit signals">
            {row.productFits.map((fit) => (
              <li key={`${row.providerId}-${fit.product}`}>
                <span className="opportunity-pipeline-fit-product">{fit.product}</span>
                <span className="opportunity-pipeline-fit-status">{fit.statusLabel}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Link>
    </li>
  );
}

export default function OpportunityProspectPipelineClient() {
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [sections, setSections] = React.useState<PipelineSection[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setErr(null);
    const id = window.setTimeout(async () => {
      try {
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        const res = await fetch(`/api/portal/sales/opportunity-pipeline?${p.toString()}`, { cache: "no-store" });
        const j = (await res.json()) as PipelineResponse;
        if (!j.ok) throw new Error(j.error || "");
        if (!cancelled) {
          setSections(j.pipeline?.sections ?? []);
          setTotalCount(j.pipeline?.totalCount ?? 0);
        }
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load opportunities. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q]);

  return (
    <SalesCommandPage
      kicker="Operations"
      title={OPPORTUNITY_UI.navListTitle}
      subtitle={OPPORTUNITY_UI.listPageSubtitle}
      actions={
        <div style={sc.toolbar}>
          <SalesCmdLink href="/portal/sales/providers/new" variant="primary">
            Add provider
          </SalesCmdLink>
          <SalesCmdLink href="/portal/sales/providers" variant="secondary">
            Manage providers
          </SalesCmdLink>
        </div>
      }
    >
      <style>{providersMissionBoardCss}</style>
      <style>{opportunityPipelineCss}</style>

      <div className="opportunity-pipeline-toolbar">
        <input
          type="search"
          className="opportunity-pipeline-search"
          placeholder="Search provider, organization, or specialty…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search opportunity pipeline"
        />
        <span className="opportunity-pipeline-count" aria-live="polite">
          {busy ? "Loading…" : `${totalCount} prospect${totalCount === 1 ? "" : "s"}`}
        </span>
      </div>

      {err ? (
        <p role="alert" style={{ color: "var(--danger, #b91c1c)", fontWeight: 600 }}>
          {err}
        </p>
      ) : null}

      {!busy && !err && totalCount === 0 ? (
        <div className="opportunity-pipeline-empty">
          <p>{OPPORTUNITY_UI.emptyDescription}</p>
          <SalesCmdLink href="/portal/sales/providers/new" variant="primary">
            Add a prospect provider
          </SalesCmdLink>
        </div>
      ) : null}

      <div
        className="mission-board opportunity-pipeline-board"
        role="region"
        aria-label="Prospect pipeline"
      >
        <div className="mission-board-columns opportunity-pipeline-columns">
          {sections.map((section) => (
            <section
              key={section.id}
              className="mission-board-column opportunity-pipeline-column"
              aria-label={`${section.label}, ${section.providers.length} providers`}
            >
              <header className="mission-board-column-header">
                <div>
                  <h2 className="mission-board-column-title" title={section.title}>
                    {section.label}
                  </h2>
                  <p className="opportunity-pipeline-section-hint">{section.title}</p>
                </div>
                <span className="mission-board-column-count" aria-hidden>
                  {section.providers.length}
                </span>
              </header>
              <ul className="mission-board-column-cards">
                {section.providers.map((row) => (
                  <OpportunityPipelineCard key={row.providerId} row={row} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </SalesCommandPage>
  );
}

const opportunityPipelineCss = `
.opportunity-pipeline-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, white) 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 7%, var(--surface)) 100%);
  box-shadow: 0 16px 38px color-mix(in srgb, var(--crm-navy, var(--foreground)) 7%, transparent), inset 0 1px 0 color-mix(in srgb, white 75%, transparent);
}
.opportunity-pipeline-search {
  flex: 1 1 280px;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  padding: 0 16px;
  font-size: 15px;
  font-weight: 650;
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--brand-600) 2%, #fff) 100%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 80%, transparent), 0 8px 18px color-mix(in srgb, var(--foreground) 5%, transparent);
}
.opportunity-pipeline-count {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 7%, #fff);
  font-size: 13px;
  font-weight: 850;
  color: color-mix(in srgb, var(--brand-700) 74%, var(--foreground));
}
.opportunity-pipeline-empty {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 16px;
  border: 1px dashed var(--border);
  margin-bottom: 16px;
}
.opportunity-pipeline-columns {
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
}
.opportunity-pipeline-column {
  min-width: 280px;
  max-width: 340px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--brand-600) 4%, #fff) 100%);
  box-shadow: 0 18px 42px color-mix(in srgb, var(--crm-navy, var(--foreground)) 9%, transparent), inset 0 1px 0 color-mix(in srgb, white 76%, transparent);
}
.opportunity-pipeline-section-hint {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 500;
}
.opportunity-pipeline-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.opportunity-pipeline-priority {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  color: var(--brand-700);
}
.opportunity-pipeline-card-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  margin: 10px 0 0;
  font-size: 12px;
}
.opportunity-pipeline-card-meta dt {
  color: var(--muted);
  font-weight: 700;
}
.opportunity-pipeline-card-meta dd {
  margin: 0;
}
.opportunity-pipeline-inline-note {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.45;
}
.opportunity-pipeline-inline-label {
  font-weight: 700;
  color: var(--muted);
}
.opportunity-pipeline-fit-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.opportunity-pipeline-fit-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}
.opportunity-pipeline-fit-product {
  font-weight: 700;
}
.opportunity-pipeline-fit-status {
  color: var(--muted);
  text-align: right;
}
.opportunity-pipeline-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background: linear-gradient(160deg, #fff 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 5%, #fff) 100%);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--foreground) 6%, transparent), inset 0 1px 0 color-mix(in srgb, white 78%, transparent);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}
@media (hover: hover) and (pointer: fine) {
  .opportunity-pipeline-card-link:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--brand-600) 34%, var(--border));
    box-shadow: 0 18px 34px color-mix(in srgb, var(--brand-600) 13%, transparent), inset 0 1px 0 color-mix(in srgb, white 78%, transparent);
  }
}
/* Small phones: the search field takes its own row instead of widening the page. */
@media (max-width: 480px) {
  .opportunity-pipeline-toolbar {
    padding: 10px;
    gap: 8px;
  }
  .opportunity-pipeline-search {
    flex: 1 1 100%;
    min-width: 0;
  }
}
`;

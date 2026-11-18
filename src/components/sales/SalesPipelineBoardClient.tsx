"use client";

import Link from "next/link";
import React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { SalesCmdLink, SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import { formatUsdFromCents } from "@/lib/sales/formatUsd";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import {
  OPEN_SALES_STAGES,
  SALES_STAGES,
  SALES_STAGE_LABEL,
  SALES_STAGE_STYLE,
  parseSalesStageOrDefault,
  type SalesStage,
} from "@/lib/sales/stages";

type Opp = {
  id: string;
  account_name: string;
  physician_name?: string | null;
  product_line?: string | null;
  product_display?: string | null;
  stage: SalesStage;
  value_cents: number;
  close_date: string | null;
  updated_at: string;
  closed_lost_reason?: string | null;
};

type TaskRow = { opportunity_id: string; title: string; due_date: string };
type ActivityRow = { opportunity_id: string; activity_at: string };

function daysSince(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

function fmtLastActivity(iso: string | null | undefined) {
  const d = daysSince(iso);
  if (d == null) return "No activity";
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

export default function SalesPipelineBoardClient() {
  const [rows, setRows] = React.useState<Opp[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [dragOppId, setDragOppId] = React.useState<string | null>(null);
  const [stageFilter, setStageFilter] = React.useState<"" | "open" | "closed" | SalesStage>("");
  const [taskByOpp, setTaskByOpp] = React.useState<Record<string, TaskRow | undefined>>({});
  const [activityByOpp, setActivityByOpp] = React.useState<Record<string, string | undefined>>({});

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [oppRes, taskRes, feedRes] = await Promise.all([
          fetch("/api/portal/sales/opportunities", { cache: "no-store" }),
          fetch("/api/portal/sales/tasks?status=open&limit=100", { cache: "no-store" }),
          fetch("/api/portal/sales/feed", { cache: "no-store" }),
        ]);
        const [j, tJson, fJson] = await Promise.all([oppRes.json(), taskRes.json(), feedRes.json()]);
        if (cancelled) return;
        if (!j.ok) {
          setErr(userFacingError(j.error, "We could not load your pipeline. Please try again."));
          setRows([]);
        } else {
          setRows((j.opportunities || []) as Opp[]);
        }
        if (tJson?.ok && Array.isArray(tJson.tasks)) {
          const nextBy: Record<string, TaskRow | undefined> = {};
          for (const t of tJson.tasks as TaskRow[]) {
            const key = String(t.opportunity_id || "");
            if (!key) continue;
            const cur = nextBy[key];
            if (!cur || String(t.due_date) < String(cur.due_date)) nextBy[key] = t;
          }
          setTaskByOpp(nextBy);
        } else {
          setTaskByOpp({});
        }
        if (fJson?.ok && Array.isArray(fJson.activities)) {
          const lastBy: Record<string, string | undefined> = {};
          for (const a of fJson.activities as ActivityRow[]) {
            const key = String(a.opportunity_id || "");
            if (!key) continue;
            if (!lastBy[key] || new Date(a.activity_at).getTime() > new Date(lastBy[key] || "").getTime()) {
              lastBy[key] = a.activity_at;
            }
          }
          setActivityByOpp(lastBy);
        } else {
          setActivityByOpp({});
        }
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load your pipeline. Please try again."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function moveOpportunityStage(opp: Opp, nextStage: SalesStage) {
    if (parseSalesStageOrDefault(opp.stage) === nextStage) return;
    let closedLostReason: string | null | undefined = undefined;
    if (nextStage === "lost") {
      const reason = window.prompt("Optional lost reason (leave blank to skip):", opp.closed_lost_reason || "");
      if (reason === null) return;
      closedLostReason = reason.trim() || null;
    }
    if (nextStage === "preference_card_progress") {
      const ok = window.confirm(
        "Confirm the product has been added to the surgeon/facility preference card."
      );
      if (!ok) return;
    }

    setSavingId(opp.id);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/sales/opportunities/${encodeURIComponent(opp.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          nextStage === "lost"
            ? { stage: nextStage, closed_lost_reason: closedLostReason }
            : { stage: nextStage }
        ),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "");
      const updated = j.opportunity as Opp;
      setRows((prev) => prev.map((r) => (r.id === opp.id ? updated : r)));
    } catch (e) {
      setErr(userFacingError(e, "That stage change did not save. Please try again."));
    } finally {
      setSavingId(null);
    }
  }

  const byStage = React.useMemo(() => {
    const m = new Map<SalesStage, Opp[]>();
    for (const s of SALES_STAGES) m.set(s, []);
    for (const o of rows) {
      const stage = parseSalesStageOrDefault(o.stage);
      m.get(stage)?.push(o);
    }
    for (const list of m.values()) {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return m;
  }, [rows]);

  const getPrimaryFamily = React.useCallback((o: Opp) => {
    const raw = String(o.product_display || o.product_line || "").trim();
    if (!raw) return "No product family";
    const firstEntry = raw.split(",")[0]?.trim() || raw;
    return firstEntry.split(" · ")[0]?.trim() || firstEntry;
  }, []);

  const visibleStages = React.useMemo(() => {
    if (!stageFilter) return SALES_STAGES;
    if (stageFilter === "open") return OPEN_SALES_STAGES as readonly SalesStage[];
    if (stageFilter === "closed") return ["won", "lost"] as const;
    return [stageFilter] as const;
  }, [stageFilter]);

  return (
    <SalesCommandPage
      title="Pipeline board"
      subtitle="Evaluation workflow board. Drag cards between columns or use stage dropdown."
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <div className="sc-native-page surgical-cases-mobile-root">
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow
              title="Pipeline board"
              countLabel="Drag cards between stages"
              actions={
                <div className="sc-pipeline-board-header-actions">
                  <select
                    value={stageFilter}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setStageFilter(raw ? (raw as "" | "open" | "closed" | SalesStage) : "");
                    }}
                    aria-label="Filter stages"
                    style={{ ...sc.input, minWidth: 0, flex: "1 1 120px", minHeight: 44, fontSize: 12 }}
                  >
                    <option value="">All stages</option>
                    <option value="open">Open only</option>
                    <option value="closed">Closed only</option>
                    {SALES_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {SALES_STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <SalesCmdLink href="/portal/sales/opportunities" variant="secondary">
                    Table
                  </SalesCmdLink>
                </div>
              }
            />
          </header>
        </div>
      {err ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: "var(--muted)", padding: 20, fontSize: 15 }}>Loading pipeline…</div>
      ) : (
        <div className="sc-native-board-track">
          {visibleStages.map((stage) => {
            const list = byStage.get(stage) || [];
            const st = SALES_STAGE_STYLE[stage];
            const stageCents = list.reduce((sum, o) => sum + (o.value_cents || 0), 0);
            return (
              <section
                className="sc-native-board-col"
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData("text/opportunity-id") || dragOppId || "";
                  if (!draggedId) return;
                  const dragged = rows.find((r) => r.id === draggedId);
                  if (!dragged) return;
                  void moveOpportunityStage(dragged, stage);
                  setDragOppId(null);
                }}
                style={{
                  borderRadius: 14,
                  border: "1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border))",
                  background: "color-mix(in srgb, var(--surface-2) 85%, var(--surface))",
                  minHeight: 160,
                  padding: 0,
                  display: "grid",
                  gap: 0,
                  alignContent: "start",
                  overflow: "hidden",
                  boxShadow: "0 2px 16px color-mix(in srgb, var(--foreground) 4%, transparent)",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
                    borderLeft: `4px solid ${st.border}`,
                    background: "color-mix(in srgb, var(--surface) 70%, transparent)",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em" }}>{SALES_STAGE_LABEL[stage]}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>
                    {list.length} deal{list.length === 1 ? "" : "s"} · {formatUsdFromCents(stageCents)}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10, padding: 12 }}>
                  {list.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 4px", fontStyle: "italic" }}>{OPPORTUNITY_UI.pipelineDropHint}</div>
                  ) : (
                    list.map((o) => (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/opportunity-id", o.id);
                          setDragOppId(o.id);
                        }}
                        onDragEnd={() => setDragOppId(null)}
                        style={{
                          display: "block",
                          padding: "14px 14px",
                          borderRadius: 12,
                          border: "1px solid color-mix(in srgb, var(--foreground) 8%, var(--border))",
                          background: "var(--surface)",
                          textDecoration: "none",
                          color: "var(--foreground)",
                          boxShadow: "0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent)",
                          transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", minWidth: 0 }}>
                          <Link
                            href={`/portal/sales/opportunities/${encodeURIComponent(o.id)}`}
                            style={{ display: "inline-flex", alignItems: "center", minHeight: 44, fontWeight: 750, fontSize: 14, lineHeight: 1.35, color: "var(--foreground)", textDecoration: "none", minWidth: 0, overflowWrap: "anywhere" }}
                          >
                            {o.account_name}
                          </Link>
                          {savingId === o.id ? (
                            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>Saving…</span>
                          ) : null}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 500, overflowWrap: "anywhere" }}>
                          {String(o.physician_name || "").trim() || "No contact"}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 600, overflowWrap: "anywhere" }}>{getPrimaryFamily(o)}</div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                          Est value: {o.value_cents ? formatUsdFromCents(o.value_cents) : "No est. value"}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)", fontWeight: 500, overflowWrap: "anywhere" }}>
                          Last activity: {fmtLastActivity(activityByOpp[o.id] || o.updated_at)}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 11, color: "var(--muted)", fontWeight: 500, overflowWrap: "anywhere" }}>
                          Next task: {taskByOpp[o.id] ? `${taskByOpp[o.id]!.title} · ${new Date(`${taskByOpp[o.id]!.due_date}T12:00:00Z`).toLocaleDateString()}` : "None"}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
                          Stage age: {daysSince(o.updated_at) ?? 0}d
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <select
                            value={o.stage}
                            aria-label={`Move ${o.account_name} to stage`}
                            onChange={(e) => {
                              e.preventDefault();
                              void moveOpportunityStage(o, e.target.value as SalesStage);
                            }}
                            style={{ ...sc.input, minHeight: 44, fontSize: 12, width: "100%" }}
                          >
                            {SALES_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {SALES_STAGE_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      </div>
    </SalesCommandPage>
  );
}

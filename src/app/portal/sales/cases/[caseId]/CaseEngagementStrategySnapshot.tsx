"use client";

import Link from "next/link";
import { SalesCmdLink, sc } from "@/components/sales/salesCommandUi";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { caseEngagementStrategySnapshotCss } from "./caseEngagementStrategySnapshotCss";

function clip(text: string | null | undefined, max = 220): string {
  const t = String(text ?? "").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const text = value.trim();
  if (!text || text === "—") return null;
  return (
    <div className="case-engagement-strategy-row">
      <span className="case-engagement-strategy-label">{label}</span>
      <p className="case-engagement-strategy-value">{text}</p>
    </div>
  );
}

export function CaseEngagementStrategySnapshot({
  engagement,
  providerId,
  organizationId,
}: {
  engagement: Record<string, unknown> | null;
  providerId?: string | null;
  organizationId?: string | null;
}) {
  const newEngagementHref = (() => {
    const params = new URLSearchParams();
    if (providerId) params.set("provider_id", providerId);
    if (organizationId) params.set("organization_id", organizationId);
    params.set("engagement_type", "observation_request");
    return `/portal/sales/engagements/new?${params.toString()}`;
  })();

  const engagementDate = String(engagement?.engagement_date ?? "").trim();
  const dateLabel = engagementDate
    ? new Date(`${engagementDate}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: caseEngagementStrategySnapshotCss }} />
      {!engagement ? (
        <section className="case-engagement-strategy-card case-engagement-strategy-card--cta">
          <div>
            <h3 className="case-engagement-strategy-title">Linked engagement</h3>
            <p className="case-engagement-strategy-sub">
              This case covers procedural execution, live observation, products used, debrief, and follow-up. Plan the
              visit on an engagement — not on this case.
            </p>
          </div>
          <SalesCmdLink href={newEngagementHref} variant="primary">
            Create engagement
          </SalesCmdLink>
        </section>
      ) : (
        <section className="case-engagement-strategy-card">
          <header className="case-engagement-strategy-head">
            <div>
              <h3 className="case-engagement-strategy-title">Linked engagement</h3>
              <p className="case-engagement-strategy-sub">
                {formatEngagementType(String(engagement.engagement_type))} ·{" "}
                {formatEngagementStatus(String(engagement.status))}
                {dateLabel ? ` · ${dateLabel}` : ""}
              </p>
            </div>
            <Link
              href={`/portal/sales/engagements/${encodeURIComponent(String(engagement.id))}`}
              style={sc.linkBrand}
              className="case-engagement-strategy-open"
            >
              Open engagement →
            </Link>
          </header>
          <div className="case-engagement-strategy-grid">
            <SummaryRow label="Title" value={clip(String(engagement.title ?? "")) || "—"} />
            <SummaryRow label="Visit objective" value={clip(String(engagement.observation_goal ?? "")) || "—"} />
            <SummaryRow
              label="Planned close"
              value={clip(String(engagement.pre_observation_planned_close ?? "")) || "—"}
            />
          </div>
          <p className="case-engagement-strategy-foot">
            Pre-Call Planning is edited on the engagement. Use the case workflow tab for what happened on site.
          </p>
        </section>
      )}
    </>
  );
}

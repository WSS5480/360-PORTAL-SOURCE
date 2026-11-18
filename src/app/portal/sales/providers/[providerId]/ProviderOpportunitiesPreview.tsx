"use client";

import Link from "next/link";
import { formatInitiativeStageLine, OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import type { ProviderEngagementSummary } from "./providerProfileTypes";
import type { ProviderProfilePayload } from "./providerProfileTypes";

const PREVIEW_LIMIT = 4;

function countOppLinks(
  oppId: string,
  cases: Record<string, unknown>[],
  engagements: ProviderEngagementSummary[],
  fromApi: { cases?: number; engagements?: number },
): { cases: number; engagements: number } {
  const caseCount =
    typeof fromApi.cases === "number"
      ? fromApi.cases
      : cases.filter((c) => String(c.related_opportunity_id || "") === oppId).length;
  const engagementCount =
    typeof fromApi.engagements === "number"
      ? fromApi.engagements
      : engagements.filter((e) => String(e.opportunity_id || "") === oppId).length;
  return { cases: caseCount, engagements: engagementCount };
}

function linkSummary(counts: { cases: number; engagements: number }): string {
  const parts: string[] = [];
  if (counts.cases > 0) parts.push(`${counts.cases} case${counts.cases === 1 ? "" : "s"}`);
  if (counts.engagements > 0) {
    parts.push(`${counts.engagements} engagement${counts.engagements === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "No linked cases or engagements";
}

export function ProviderOpportunitiesPreview({
  data,
  providerId,
  createOpportunityHref,
  variant = "default",
}: {
  data: ProviderProfilePayload;
  providerId: string;
  createOpportunityHref: string;
  variant?: "default" | "record";
}) {
  const allOpps = data.opportunities || [];
  if (variant === "record" && allOpps.length === 0) {
    return null;
  }
  const preview = allOpps.slice(0, PREVIEW_LIMIT);
  const engagements = data.engagements || [];
  const cases = data.cases || [];
  const viewAllHref = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=opportunities`;

  return (
    <div className="provider-pipe-col">
      <div className="provider-cc-section-head">
        <h3 className="provider-pipe-col-title">{OPPORTUNITY_UI.providerTabLabel}</h3>
        {allOpps.length > 0 ? (
          <Link href={viewAllHref} className="provider-cc-section-link">
            View all
          </Link>
        ) : null}
      </div>

      {allOpps.length === 0 && variant !== "record" ? (
        <div className="provider-pipe-empty">
          <p className="provider-pipe-empty-text">
            No evaluations yet. Start one when a trial, demo, or first supported case is planned.
          </p>
          <Link href={createOpportunityHref} className="provider-pipe-empty-cta">
            {OPPORTUNITY_UI.createButton}
          </Link>
        </div>
      ) : (
        <>
          <p className="provider-cc-section-meta">{allOpps.length} linked</p>
          <ul className="provider-opp-prev-list">
            {preview.map((o) => {
              const id = String(o.id);
              const productLine = String(o.product_line || "").trim();
              const stageLabel = String(o.stage_label || o.stage || "").trim();
              const nextAction = String(o.next_action || "").trim();
              const counts = countOppLinks(id, cases, engagements, {
                cases: Number(o.linked_case_count),
                engagements: Number(o.linked_engagement_count),
              });
              const title =
                productLine || String(o.account_name || OPPORTUNITY_UI.fallbackRecordLabel);

              return (
                <li key={id} className="provider-opp-prev-card">
                  <Link
                    href={`/portal/sales/opportunities/${encodeURIComponent(id)}`}
                    className="provider-opp-prev-main"
                  >
                    <div className="provider-opp-prev-top">
                      <span className="provider-opp-prev-product">{title}</span>
                      {stageLabel ? (
                        <span
                          className="provider-opp-prev-stage"
                          title={formatInitiativeStageLine(stageLabel)}
                        >
                          {stageLabel}
                        </span>
                      ) : null}
                    </div>
                    {nextAction ? (
                      <span className="provider-opp-prev-next">
                        <span className="provider-opp-prev-next-label">Next:</span> {nextAction}
                      </span>
                    ) : (
                      <span className="provider-opp-prev-next provider-opp-prev-next--empty">
                        Next step not set — add after your next planning touch.
                      </span>
                    )}
                    <span className="provider-opp-prev-links-meta">{linkSummary(counts)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {allOpps.length > PREVIEW_LIMIT ? (
            <Link href={viewAllHref} className="provider-pipe-more">
              View all {allOpps.length} opportunities →
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import {
  formatProviderCrmStatus,
  formatSurgicalContactRole,
  PROVIDER_CRM_STATUSES,
} from "@/lib/surgical-sales/labels";
import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { buildProviderDeploymentCockpitView } from "@/lib/surgical-sales/buildProviderOverviewCommandCenterView";
import {
  PROVIDER_OVERVIEW_DASHBOARD_ARIA,
  PROVIDER_OVERVIEW_LATEST_FIELD_INTELLIGENCE_TITLE,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

import { ProviderOverviewConfirmedSoFar } from "./ProviderOverviewConfirmedSoFar";
import { ProviderOverviewDeploymentResolutionPanel } from "./ProviderOverviewDeploymentResolution";
import { ProviderOverviewLatestFieldIntelligence } from "./ProviderOverviewLatestFieldIntelligence";
import { ProviderOverviewGuidanceCardView } from "./ProviderOverviewCards";
import {
  ProviderOverviewStickyActionBar,
  ProviderOverviewStickySummary,
} from "./ProviderOverviewMobileSections";
import type { ProviderProfilePayload } from "./providerProfileTypes";

const DEPLOY_QUESTION = "Worth deploying field time here?";

export function ProviderOverviewCommandCenter({
  narrative,
  data,
  providerId,
  contact,
  intelligenceHref,
  newEngagementHref,
  newCaseHref,
  createOpportunityHref,
  noteHref,
  engagementsLoading,
  activityLoading,
  onCrmStatusChange,
  savingCrmStatus,
}: {
  narrative: ProviderOverviewNarrative;
  data: ProviderProfilePayload;
  providerId: string;
  contact: Record<string, unknown>;
  intelligenceHref: string;
  newEngagementHref: string;
  newCaseHref: string;
  createOpportunityHref: string;
  noteHref: string;
  engagementsLoading?: boolean;
  activityLoading?: boolean;
  onCrmStatusChange: (status: string) => void;
  savingCrmStatus?: boolean;
}) {
  const cockpit = useMemo(
    () =>
      buildProviderDeploymentCockpitView({
        narrative,
        contact,
        intelligenceHref,
        engagements: data.engagements ?? [],
      }),
    [narrative, contact, intelligenceHref, data.engagements],
  );

  const { latestFieldIntelligence } = narrative;

  const heroExplanation =
    cockpit.deploymentResolution.whyItMatters ??
    cockpit.blocker?.headline ??
    cockpit.command.support ??
    null;

  return (
    <article className="pov pov--mobile-first" aria-label={PROVIDER_OVERVIEW_DASHBOARD_ARIA}>
      <header className="pov-hero">
        <ProviderOverviewStickySummary
          question={DEPLOY_QUESTION}
          headline={cockpit.command.headline}
          support={heroExplanation}
          tone={cockpit.command.tone}
        />
      </header>

      <div className="pov-stack">
        <section className="pov-section pov-section--priorities" aria-label="Deployment priorities">
          <div className="pov-guidance-feed">
            {cockpit.guidanceCards.map((card) => (
              <div key={card.id} className="pov-guidance-feed-item">
                <ProviderOverviewGuidanceCardView card={card} />
                {card.anchorsResolution ? (
                  <ProviderOverviewDeploymentResolutionPanel
                    resolution={cockpit.deploymentResolution}
                    variant="feed"
                  />
                ) : null}
              </div>
            ))}
            {!cockpit.guidanceCards.some((c) => c.anchorsResolution) ? (
              <ProviderOverviewDeploymentResolutionPanel
                resolution={cockpit.deploymentResolution}
                variant="feed"
              />
            ) : null}
          </div>
        </section>

        {cockpit.confirmedSoFar.length > 0 ? (
          <section className="pov-section pov-section--confirmed">
            <ProviderOverviewConfirmedSoFar lines={cockpit.confirmedSoFar} />
          </section>
        ) : null}

        <section
          className="pov-section pov-section--intel"
          aria-label={PROVIDER_OVERVIEW_LATEST_FIELD_INTELLIGENCE_TITLE}
        >
          <div className="pov-intel-panel">
            <h2 className="pov-intel-heading">{PROVIDER_OVERVIEW_LATEST_FIELD_INTELLIGENCE_TITLE}</h2>
            <ProviderOverviewLatestFieldIntelligence items={latestFieldIntelligence} />
            <Link href={intelligenceHref} className="pov-intel-link">
              Open full account notes →
            </Link>
          </div>

          <details className="pov-more pov-more--nested" id="provider-overview-crm">
            <summary className="pov-more-summary">Contact &amp; CRM</summary>
            <div className="pov-more-body provider-ops-contact-body provider-cc-details-body">
                  <div className="provider-cc-details-facts">
                    <div className="provider-cc-details-fact provider-cc-details-crm">
                      <label htmlFor="provider-details-crm-status">CRM status</label>
                      <select
                        id="provider-details-crm-status"
                        value={String(contact.provider_crm_status || "prospect")}
                        disabled={savingCrmStatus}
                        onChange={(e) => onCrmStatusChange(e.target.value)}
                      >
                        {PROVIDER_CRM_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {formatProviderCrmStatus(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="provider-cc-details-fact">
                      <span>Role: </span>
                      {formatSurgicalContactRole(String(contact.role_type || "surgeon"))}
                    </div>
                    {contact.email ? (
                      <div className="provider-cc-details-fact">
                        <span>Email: </span>
                        {String(contact.email)}
                      </div>
                    ) : null}
                    {contact.phone ? (
                      <div className="provider-cc-details-fact">
                        <span>Phone: </span>
                        {String(contact.phone)}
                      </div>
                    ) : null}
                  </div>
                  {(data.organization_links || []).length > 0 ? (
                    <ul className="provider-at-a-glance-intel provider-cc-details-orgs">
                      {(data.organization_links || []).map((l) => {
                        const acct = l.accounts as { id?: string; name?: string | null } | null;
                        const aid = String(l.account_id || acct?.id || "");
                        const name = String(acct?.name || "Organization");
                        const inner = (
                          <>
                            <span className="provider-at-a-glance-intel-value">{name}</span>
                            <span className="provider-at-a-glance-intel-label">
                              {l.is_primary_org ? "Primary" : "Linked"}
                            </span>
                          </>
                        );
                        return (
                          <li key={String(l.id || aid)}>
                            {aid ? (
                              <Link
                                href={`/portal/sales/accounts/${encodeURIComponent(aid)}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                              >
                                {inner}
                              </Link>
                            ) : (
                              inner
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

              <div className="pov-record-quick">
                <Link href={newEngagementHref} className="pov-record-chip">
                  Schedule touch
                </Link>
                <Link href={newCaseHref} className="pov-record-chip">
                  Log case
                </Link>
                <Link href={createOpportunityHref} className="pov-record-chip">
                  {OPPORTUNITY_UI.createFromProvider}
                </Link>
                <Link href={noteHref} className="pov-record-chip">
                  Add note
                </Link>
              </div>
            </div>
          </details>
        </section>
      </div>

      <ProviderOverviewStickyActionBar
        ctaLabel={cockpit.deploymentResolution.ctaLabel}
        ctaHref={cockpit.deploymentResolution.ctaHref}
        nextBestMove={cockpit.deploymentResolution.nextBestMove}
        bestSource={cockpit.deploymentResolution.bestSource}
      />
    </article>
  );
}

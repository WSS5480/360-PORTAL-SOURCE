"use client";

import Link from "next/link";
import {
  resolveProviderLastActivity,
  resolveProviderLastEngagement,
} from "@/lib/surgical-sales/buildProviderStrategicSummary";
import { resolveProviderVisualIdentity } from "@/lib/surgical-sales/providerVisualIdentity";
import {
  buildProviderCommandHeaderView,
  providerCommandHeaderChipClassName,
} from "@/lib/surgical-sales/buildProviderCommandHeaderView";
import { formatProviderRelationshipStage, isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";
import { ProviderDetailHeaderVisual } from "./ProviderDetailHeaderVisual";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import type { ReactNode } from "react";

export function ProviderDetailHeader({
  data,
  providerId,
  displayName,
  accountId = "",
  newEngagementHref = "",
  compact = false,
  engagementsLoading = false,
  suppressActivityLine = false,
  actionsSlot = null,
  onOpenObservationApproval,
  onSalesTrackChange,
  salesTrackSaving = false,
}: {
  data: ProviderProfilePayload;
  providerId: string;
  displayName: string;
  accountId?: string;
  newEngagementHref?: string;
  /** Mobile briefing: tighter identity block (What matters now carries next step). */
  compact?: boolean;
  engagementsLoading?: boolean;
  /** Overview tab uses tactical strip instead of last-activity line. */
  suppressActivityLine?: boolean;
  actionsSlot?: ReactNode;
  onOpenObservationApproval?: () => void;
  onSalesTrackChange?: (track: "sales_pathway" | "customer") => void;
  salesTrackSaving?: boolean;
}) {
  const p = data.provider!;
  const relationshipStage = String(p.provider_relationship_stage || "early_discovery");

  const lastEngagement = resolveProviderLastEngagement(data.engagements || [], providerId);
  const lastActivity = resolveProviderLastActivity(data.activity_timeline || []);
  const lastTouch = lastActivity ?? lastEngagement;

  const orgName = data.primary_organization?.name?.trim();
  const visualIdentity = resolveProviderVisualIdentity({
    displayName,
    contact: p,
    specialty: data.specialty,
    primaryOrganization: data.primary_organization,
    enrichment: data.visual_enrichment,
  });

  const commandHeader = buildProviderCommandHeaderView({
    contact: p,
    providerId,
    accountId: accountId || null,
    specialty: data.specialty ?? null,
    organizationName: orgName ?? null,
    relationshipStage,
    planning: data.planning_completion,
    engagements: data.engagements,
    cases: data.cases,
    opportunities: data.opportunities,
    newEngagementHref,
  });

  const metaSubtitle = commandHeader.metaSubtitle ?? (orgName || null);
  const isSalesCustomer = isProviderSalesCustomer(relationshipStage);
  const stageLabel = isSalesCustomer ? "Customer" : formatProviderRelationshipStage(relationshipStage);

  function renderPrimaryCta() {
    const { primaryAction } = commandHeader;
    if (!primaryAction.label.trim()) return null;

    if (primaryAction.kind === "openObservationApproval") {
      return (
        <button
          type="button"
          className="provider-command-header__cta"
          onClick={() => onOpenObservationApproval?.()}
        >
          {primaryAction.label}
        </button>
      );
    }

    if (primaryAction.href) {
      return (
        <Link href={primaryAction.href} className="provider-command-header__cta">
          {primaryAction.label}
        </Link>
      );
    }

    return null;
  }

  return (
    <div className={`provider-hd${compact ? " provider-hd--compact" : ""}`} aria-label="Provider summary">
      <div className="provider-hd-top provider-hd-top--command">
        <div className="provider-command-header">
          <div className="provider-command-header__surface">
            <div className="provider-command-header__left">
              {compact ? <PortalMobileMenuButton className="provider-hd-menu" /> : null}
              {!compact ? <ProviderDetailHeaderVisual identity={visualIdentity} /> : null}
              <div className="provider-command-header__identity">
                <div className="provider-command-header__title-row">
                  <h1 className="provider-command-header__name">{displayName}</h1>
                  {onSalesTrackChange ? (
                    <label className="provider-command-header__track">
                      <span className="provider-command-header__track-label">Provider type</span>
                      <select
                        className="provider-command-header__stage provider-command-header__stage--select"
                        value={isSalesCustomer ? "customer" : "sales_pathway"}
                        disabled={salesTrackSaving}
                        aria-label="Provider type"
                        onChange={(e) =>
                          onSalesTrackChange(e.target.value === "customer" ? "customer" : "sales_pathway")
                        }
                      >
                        <option value="sales_pathway">Sales pathway</option>
                        <option value="customer">Customer</option>
                      </select>
                    </label>
                  ) : stageLabel ? (
                    <span className="provider-command-header__stage">{stageLabel}</span>
                  ) : null}
                </div>
                {metaSubtitle ? (
                  <p className="provider-command-header__meta">{metaSubtitle}</p>
                ) : (
                  <p className="provider-command-header__meta">No primary organization</p>
                )}
              </div>
            </div>

            {commandHeader.chips.length > 0 ? (
              <div className="provider-command-header__context" aria-label="Field execution status">
                <div className="provider-command-header__chips" role="list">
                  {commandHeader.chips.map((chip) => (
                    <span
                      key={chip.id}
                      className={`provider-command-chip${providerCommandHeaderChipClassName(chip.tone)}`}
                      role="listitem"
                    >
                      {chip.label}
                    </span>
                  ))}
                  {commandHeader.overflowChipCount > 0 ? (
                    <span className="provider-command-chip provider-command-chip--more" role="listitem">
                      +{commandHeader.overflowChipCount} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="provider-command-header__actions">
              {renderPrimaryCta()}
              {actionsSlot}
            </div>
          </div>
        </div>
      </div>

      {!suppressActivityLine && lastTouch ? (
        <p className="provider-hd-touch">
          {lastTouch.kind === "activity" ? "Last activity" : "Last engagement"}
          {lastTouch.href ? (
            <Link href={lastTouch.href} className="provider-hd-touch-link">
              {lastTouch.label}
            </Link>
          ) : (
            <span className="provider-hd-touch-label">{lastTouch.label}</span>
          )}
          {lastTouch.atLabel ? <span className="provider-hd-touch-at"> · {lastTouch.atLabel}</span> : null}
        </p>
      ) : !suppressActivityLine && engagementsLoading ? (
        <p className="provider-hd-touch provider-hd-touch--empty">Loading engagements…</p>
      ) : !suppressActivityLine ? (
        <p className="provider-hd-touch provider-hd-touch--empty">No logged activity or engagements yet</p>
      ) : null}
    </div>
  );
}

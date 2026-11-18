"use client";

import Link from "next/link";
import type React from "react";
import type { ProductSupportCaseIdentity } from "@/lib/surgical-sales/buildProductSupportCaseIdentity";
import {
  PRODUCT_SUPPORT_WORKSPACE_TABS,
  type ProductSupportWorkspaceTabId,
} from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { caseMissionControlPolishCss } from "./caseMissionControlPolishCss";
import { productSupportCaseDetailShellCss } from "./productSupportCaseDetailShellCss";

export type { ProductSupportWorkspaceTabId };

export function ProductSupportCaseDetailShell({
  identity,
  workspaceTab,
  onTabChange,
  busy,
  onEditCase,
  onCompleteCase,
  onMore,
  banners,
  headerAccentColor,
  providerHref,
  briefing,
  fieldNotes,
  products,
  documents,
  intelligence,
  followUp,
  bottomBar,
}: {
  identity: ProductSupportCaseIdentity;
  workspaceTab: ProductSupportWorkspaceTabId;
  onTabChange: (tab: ProductSupportWorkspaceTabId) => void;
  busy?: boolean;
  onEditCase: () => void;
  onCompleteCase: () => void;
  onMore?: () => void;
  banners?: React.ReactNode;
  headerAccentColor?: string;
  providerHref?: string;
  briefing: React.ReactNode;
  fieldNotes: React.ReactNode;
  products: React.ReactNode;
  documents: React.ReactNode;
  intelligence: React.ReactNode;
  followUp: React.ReactNode;
  bottomBar: React.ReactNode;
}) {
  const dateLabel = identity.dateLineWithTime || identity.dateLine;
  const statusLabel = identity.statusLabel;
  const subtitleParts = [identity.specialty?.trim(), identity.facilityName?.trim()].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : null;

  const panel =
    workspaceTab === "briefing"
      ? briefing
      : workspaceTab === "field_notes"
        ? fieldNotes
        : workspaceTab === "products"
          ? products
          : workspaceTab === "documents"
            ? documents
            : workspaceTab === "intelligence"
              ? intelligence
              : followUp;

  return (
    <div className="product-support-case-detail-shell mc-workspace mc-workspace--product-support" data-mc-stage="support">
      <style dangerouslySetInnerHTML={{ __html: `${productSupportCaseDetailShellCss}\n${caseMissionControlPolishCss}` }} />

      <header
        className="case-ps-detail-header mc-deck"
        style={
          headerAccentColor
            ? ({ "--mc-accent": headerAccentColor } as React.CSSProperties)
            : undefined
        }
      >
        <div className="case-ps-detail-header-main">
          <Link href="/portal/sales/cases" className="case-ps-detail-back">
            ← Back to cases
          </Link>
          <p className="case-ps-detail-kicker">{identity.caseTypeLabel}</p>
          <h1 className="case-ps-detail-title">
            {providerHref && identity.providerName ? (
              <Link href={providerHref} className="case-ps-detail-provider-link" data-surgical-press>
                {identity.providerName}
              </Link>
            ) : (
              identity.providerName
            )}
          </h1>
          {subtitle ? <p className="case-ps-detail-subtitle">{subtitle}</p> : null}
          <p className="case-ps-detail-meta">
            {dateLabel} · {statusLabel}
            {identity.procedureType ? ` · ${identity.procedureType}` : ""}
          </p>
        </div>

        <div className="case-ps-detail-header-actions">
          {providerHref ? (
            <Link href={providerHref} className="case-ps-detail-btn" data-surgical-press>
              Open profile
            </Link>
          ) : null}
          <button type="button" className="case-ps-detail-btn" disabled={busy} onClick={onEditCase}>
            Edit Case
          </button>
          <button type="button" className="case-ps-detail-btn case-ps-detail-btn--primary" disabled={busy} onClick={onCompleteCase}>
            Complete Case
          </button>
          {onMore ? (
            <button
              type="button"
              className="case-ps-detail-btn case-ps-detail-btn--more"
              disabled={busy}
              onClick={onMore}
              aria-label="More actions"
              title="More actions"
            >
              ⋯
            </button>
          ) : null}
        </div>
      </header>

      <div className="case-ps-detail-tabs" role="tablist" aria-label="Case sections">
        {PRODUCT_SUPPORT_WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={workspaceTab === tab.id}
            className="case-ps-detail-tab"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {banners ? <div className="case-ps-detail-banners">{banners}</div> : null}

      <div className="case-ps-detail-panel case-ps-tab-panel" role="tabpanel">
        {panel}
      </div>

      <div className="case-ps-detail-bottom-wrap">{bottomBar}</div>
    </div>
  );
}

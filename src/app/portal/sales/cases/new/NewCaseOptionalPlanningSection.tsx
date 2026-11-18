"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import type { PhiPatternKind } from "@/lib/surgical-sales/phiContentHeuristics";
import type { NewCaseProviderContext } from "./NewCaseProviderPanel";

const sectionCss = `
.new-case-optional-planning{display:grid;gap:0}
.new-case-optional-block{display:grid;gap:5px;padding:6px 0;border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border))}
.new-case-optional-block:first-child{border-top:0;padding-top:0}
.new-case-optional-block-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.new-case-optional-block-title{margin:0;font-size:11px;font-weight:780;color:color-mix(in srgb,var(--foreground) 72%,var(--muted));line-height:1.25}
.new-case-optional-pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 7px;font-size:9px;font-weight:750;letter-spacing:.02em;color:color-mix(in srgb,var(--foreground) 58%,var(--muted));border:1px solid color-mix(in srgb,var(--foreground) 10%,var(--border));background:color-mix(in srgb,var(--surface-2) 40%,var(--surface))}`;

type ProductRow = { id: string; name: string | null };
type SkuRow = { id: string; sku: string };
type OpportunityOption = { id: string; title: string | null; stage?: string | null };

export function NewCaseOptionalPlanningSection({
  variant = "observation",
  showProductsForObservation,
  onEnableProductInterest,
  onClearProductInterest,
  products,
  productId,
  onProductIdChange,
  displaySkus,
  skuId,
  onSkuIdChange,
  expectedQty,
  onExpectedQtyChange,
  expectedRevenue,
  onExpectedRevenueChange,
  opportunityLocked,
  lockedRelatedOpportunityLabel,
  relatedOpportunityId,
  onRelatedOpportunityIdChange,
  opportunityOptions,
  formatRelatedOpportunityLabel,
  loadBusy,
  accountId,
  providerContext,
  notes,
  onNotesChange,
  followUpNeeded,
  onFollowUpNeededChange,
  notePhiKinds,
}: {
  variant?: "observation" | "product_support";
  showProductsForObservation: boolean;
  onEnableProductInterest: () => void;
  onClearProductInterest: () => void;
  products: ProductRow[];
  productId: string;
  onProductIdChange: (value: string) => void;
  displaySkus: SkuRow[];
  skuId: string;
  onSkuIdChange: (value: string) => void;
  expectedQty: string;
  onExpectedQtyChange: (value: string) => void;
  expectedRevenue: string;
  onExpectedRevenueChange: (value: string) => void;
  opportunityLocked: boolean;
  lockedRelatedOpportunityLabel: string;
  relatedOpportunityId: string;
  onRelatedOpportunityIdChange: (value: string) => void;
  opportunityOptions: OpportunityOption[];
  formatRelatedOpportunityLabel: (o: OpportunityOption) => string;
  loadBusy: boolean;
  accountId: string;
  providerContext: NewCaseProviderContext | null;
  notes: string;
  onNotesChange: (value: string) => void;
  followUpNeeded: boolean;
  onFollowUpNeededChange: (checked: boolean) => void;
  notePhiKinds: PhiPatternKind[];
}) {
  return (
    <div className="new-case-optional-planning">
      <style dangerouslySetInnerHTML={{ __html: sectionCss }} />

      {variant === "observation" ? (
      <section className="new-case-optional-block" aria-labelledby="new-case-optional-product-title">
        <div className="new-case-optional-block-head">
          <h4 id="new-case-optional-product-title" className="new-case-optional-block-title">
            Product interest
          </h4>
          <span className="new-case-optional-pill">Early interest only.</span>
        </div>
        {!showProductsForObservation ? (
          <>
            <p className="new-case-product-helper">
              Track early product interest only — not case readiness, credentialing, or access.
            </p>
            <button
              type="button"
              className="new-case-btn-ghost"
              style={{ ...sc.btnGhost, fontSize: 12, fontWeight: 750, justifySelf: "start" }}
              onClick={onEnableProductInterest}
            >
              Add product interest
            </button>
          </>
        ) : (
          <>
            <div className="new-case-btn-row">
              <p className="new-case-product-helper" style={{ flex: 1, minWidth: 0 }}>
                Early interest for debrief context — does not mean the case is ready to schedule.
              </p>
              <button
                type="button"
                className="new-case-btn-ghost"
                style={{ ...sc.btnGhost, fontSize: 11, fontWeight: 750 }}
                onClick={onClearProductInterest}
              >
                Remove
              </button>
            </div>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>Product family</span>
              <select value={productId} onChange={(e) => onProductIdChange(e.target.value)} style={sc.input}>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="new-case-fields-2">
              <label style={{ display: "grid", gap: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>SKU</span>
                <select value={skuId} onChange={(e) => onSkuIdChange(e.target.value)} style={sc.input}>
                  <option value="">Select SKU…</option>
                  {displaySkus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sku}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>Expected quantity</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={expectedQty}
                  onChange={(e) => onExpectedQtyChange(e.target.value)}
                  style={sc.input}
                />
              </label>
            </div>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>Revenue per case (optional)</span>
              <input value={expectedRevenue} onChange={(e) => onExpectedRevenueChange(e.target.value)} style={sc.input} />
            </label>
          </>
        )}
      </section>
      ) : null}

      <section className="new-case-optional-block" aria-labelledby="new-case-optional-initiative-title">
        <h4 id="new-case-optional-initiative-title" className="new-case-optional-block-title">
          Related opportunity
        </h4>
        {opportunityLocked ? (
          <div className="new-case-locked-field">
            <span className="new-case-locked-pill">Locked</span>
            <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.35, color: "var(--foreground)" }}>
              {lockedRelatedOpportunityLabel}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
              {OPPORTUNITY_UI.newCaseLockedInitiativeHint}
            </div>
          </div>
        ) : (
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Opportunity</span>
            <select
              value={relatedOpportunityId}
              onChange={(e) => onRelatedOpportunityIdChange(e.target.value)}
              disabled={loadBusy}
              style={sc.input}
            >
              <option value="">{OPPORTUNITY_UI.newCaseNoLinkedInitiative}</option>
              {opportunityOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {formatRelatedOpportunityLabel(o)}
                </option>
              ))}
            </select>
            {accountId ? (
              <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.35 }}>
                {providerContext?.opportunities.length
                  ? OPPORTUNITY_UI.newCaseIncludesInitiativesForProvider
                  : OPPORTUNITY_UI.newCaseShowingInitiativesForOrg}
              </span>
            ) : null}
          </label>
        )}
      </section>

      <section className="new-case-optional-block" aria-labelledby="new-case-optional-notes-title">
        <h4 id="new-case-optional-notes-title" className="new-case-optional-block-title">
          {variant === "product_support" ? "Notes" : "Notes & follow-up"}
        </h4>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Notes</span>
          <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2} style={{ ...sc.input, resize: "vertical" }} />
          <PhiPatternInlineHint kinds={notePhiKinds} />
        </label>
        {variant === "observation" ? (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={followUpNeeded} onChange={(e) => onFollowUpNeededChange(e.target.checked)} />
            Follow-up needed
          </label>
        ) : null}
      </section>
    </div>
  );
}

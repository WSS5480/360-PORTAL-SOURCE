"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import type { PhiPatternKind } from "@/lib/surgical-sales/phiContentHeuristics";
import { buildProductSupportOptionalPlanningSummary } from "@/lib/surgical-sales/buildProductSupportOptionalPlanningSummary";
import type { NewCaseProviderContext } from "./NewCaseProviderPanel";
import { NewCaseOptionalPlanningSection } from "./NewCaseOptionalPlanningSection";

const workflowCss = `
.new-case-support-mission-workflow .new-case-mission-checklist{grid-template-columns:repeat(4,minmax(0,1fr))}
.new-case-support-doc-callout{margin:0;padding:6px 8px;border-radius:8px;font-size:10px;line-height:1.4;font-weight:600;color:color-mix(in srgb,var(--foreground) 62%,var(--muted));border:1px dashed color-mix(in srgb,var(--foreground) 14%,var(--border));background:color-mix(in srgb,var(--surface-2) 28%,transparent)}`;

type ProductRow = { id: string; name: string | null };
type SkuRow = { id: string; sku: string };
type AccountRow = { id: string; name: string | null };
type ContactRow = { id: string; first_name?: string | null; last_name?: string | null; role_type?: string | null };
type OpportunityOption = { id: string; title: string | null; stage?: string | null };

export type ProductSupportMissionStepProps = {
  step: number;
  title: string;
  isActive: boolean;
  isComplete: boolean;
  isLocked: boolean;
  summary: string;
  tone?: "default" | "optional" | "operations";
  onActivate: () => void;
  sectionRef?: React.RefObject<HTMLElement | null>;
  onFocusWithin?: () => void;
  onBlurWithin?: () => void;
  children: React.ReactNode;
};

export function ProductSupportMissionStep({
  step,
  title,
  isActive,
  isComplete,
  isLocked,
  summary,
  tone = "default",
  onActivate,
  sectionRef,
  onFocusWithin,
  onBlurWithin,
  children,
}: ProductSupportMissionStepProps) {
  const toneClass =
    tone === "optional"
      ? "new-case-mission-step--optional"
      : tone === "operations"
        ? "new-case-mission-step--support-ops"
        : "";
  return (
    <section
      ref={sectionRef}
      className={`new-case-mission-step ${toneClass} ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""} ${isLocked ? "is-locked" : ""}`}
      aria-label={`${step}. ${title}`}
      onFocusCapture={onFocusWithin}
      onBlurCapture={onBlurWithin}
    >
      <button
        type="button"
        className="new-case-mission-step-header"
        onClick={onActivate}
        disabled={isLocked}
        aria-expanded={isActive}
      >
        <span className="new-case-mission-step-index">Step {step}</span>
        <span className="new-case-mission-step-title">{title}</span>
        <span className="new-case-mission-step-state">
          {isLocked ? "Locked" : isActive ? "Active" : isComplete ? "Complete" : "Ready"}
        </span>
      </button>
      {isActive ? (
        <div className="new-case-mission-step-body">{children}</div>
      ) : (
        <div className="new-case-mission-step-summary-row">
          <p className="new-case-mission-step-summary">{summary}</p>
          {isComplete ? (
            <button type="button" className="new-case-mission-step-edit" onClick={onActivate}>
              Edit
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function NewCaseProductSupportMissionWorkflow({
  checklistItems,
  onChecklistClick,
  activeStep,
  onGoToStep,
  stepRefs,
  onStepFocus,
  onStepBlur,
  caseTypeSelector,
  opportunityLocked,
  lockedOrganizationLabel,
  accounts,
  accountId,
  onAccountIdChange,
  mergedSurgeons,
  surgeonId,
  onSurgeonIdChange,
  caseDate,
  onCaseDateChange,
  caseTime,
  onCaseTimeChange,
  setupProcedure,
  onSetupProcedureChange,
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
  supportObjective,
  onSupportObjectiveChange,
  supportRepRole,
  onSupportRepRoleChange,
  supportRequiredMaterials,
  onSupportRequiredMaterialsChange,
  followUpNeeded,
  onFollowUpNeededChange,
  supportSetupComplete,
  productInventoryComplete,
  caseSupportPlanComplete,
  maxUnlockedStep,
  optionalPlanningActive,
  optionalPlanningSummary,
  showProductsForObservation,
  onEnableProductInterest,
  onClearProductInterest,
  opportunityLockedInitiative,
  lockedRelatedOpportunityLabel,
  relatedOpportunityId,
  onRelatedOpportunityIdChange,
  opportunityOptions,
  formatRelatedOpportunityLabel,
  loadBusy,
  providerContext,
  notes,
  onNotesChange,
  notePhiKinds,
  contactDisplayName,
  formatSurgicalContactRole,
}: {
  checklistItems: readonly {
    key: string;
    title: string;
    status: string;
    icon: string;
    summary: string;
    stepIndex: number;
  }[];
  onChecklistClick: (index: number) => void;
  activeStep: number;
  onGoToStep: (index: number) => void;
  stepRefs: React.RefObject<HTMLElement | null>[];
  onStepFocus: (index: number) => void;
  onStepBlur: (index: number) => void;
  caseTypeSelector: React.ReactNode;
  opportunityLocked: boolean;
  lockedOrganizationLabel: string;
  accounts: AccountRow[];
  accountId: string;
  onAccountIdChange: (value: string) => void;
  mergedSurgeons: ContactRow[];
  surgeonId: string;
  onSurgeonIdChange: (value: string) => void;
  caseDate: string;
  onCaseDateChange: (value: string) => void;
  caseTime: string;
  onCaseTimeChange: (value: string) => void;
  setupProcedure: string;
  onSetupProcedureChange: (value: string) => void;
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
  supportObjective: string;
  onSupportObjectiveChange: (value: string) => void;
  supportRepRole: string;
  onSupportRepRoleChange: (value: string) => void;
  supportRequiredMaterials: string;
  onSupportRequiredMaterialsChange: (value: string) => void;
  followUpNeeded: boolean;
  onFollowUpNeededChange: (checked: boolean) => void;
  supportSetupComplete: boolean;
  productInventoryComplete: boolean;
  caseSupportPlanComplete: boolean;
  maxUnlockedStep: number;
  optionalPlanningActive: boolean;
  optionalPlanningSummary: string;
  showProductsForObservation: boolean;
  onEnableProductInterest: () => void;
  onClearProductInterest: () => void;
  opportunityLockedInitiative: boolean;
  lockedRelatedOpportunityLabel: string;
  relatedOpportunityId: string;
  onRelatedOpportunityIdChange: (value: string) => void;
  opportunityOptions: OpportunityOption[];
  formatRelatedOpportunityLabel: (o: OpportunityOption) => string;
  loadBusy: boolean;
  providerContext: NewCaseProviderContext | null;
  notes: string;
  onNotesChange: (value: string) => void;
  notePhiKinds: PhiPatternKind[];
  contactDisplayName: (c: ContactRow) => string;
  formatSurgicalContactRole: (role?: string | null) => string;
}) {
  const supportOptionalSummary = React.useMemo(
    () =>
      buildProductSupportOptionalPlanningSummary({
        initiativeLinked: Boolean(relatedOpportunityId.trim()),
        notesAdded: Boolean(notes.trim() || followUpNeeded),
      }),
    [followUpNeeded, notes, relatedOpportunityId],
  );

  return (
    <div className="new-case-mission-workflow new-case-support-mission-workflow">
      <style dangerouslySetInnerHTML={{ __html: workflowCss }} />
      <section className="new-case-mission-checklist" aria-label="Support mission checklist">
        {checklistItems.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`new-case-mission-checklist-item status-${item.status}`}
            onClick={() => onChecklistClick(item.stepIndex)}
          >
            <div className="new-case-mission-checklist-head">
              <span className="new-case-mission-checklist-title">{item.title}</span>
              <span className="new-case-mission-checklist-icon" aria-hidden>
                {item.icon}
              </span>
            </div>
            <span className="new-case-mission-checklist-summary">{item.summary}</span>
          </button>
        ))}
      </section>

      <ProductSupportMissionStep
        step={1}
        title="Support Setup"
        tone="operations"
        isActive={activeStep === 0}
        isComplete={supportSetupComplete}
        isLocked={false}
        onActivate={() => onGoToStep(0)}
        sectionRef={stepRefs[0]}
        onFocusWithin={() => onStepFocus(0)}
        onBlurWithin={() => onStepBlur(0)}
        summary={checklistItems[0]?.summary ?? ""}
      >
        <section className="new-case-section">{caseTypeSelector}</section>
        <section className="new-case-section">
          <h3 className="new-case-title">Facility & provider</h3>
          {opportunityLocked ? (
            <div className="new-case-locked-field">
              <span className="new-case-locked-pill">Locked</span>
              <div style={{ fontSize: 13, fontWeight: 650 }}>{lockedOrganizationLabel}</div>
            </div>
          ) : (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>
                Organization <span style={{ color: "var(--brand-600)" }}>*</span>
              </span>
              <select required value={accountId} onChange={(e) => onAccountIdChange(e.target.value)} style={sc.input}>
                <option value="">Select organization…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Surgeon/contact (optional)</span>
            <select value={surgeonId} onChange={(e) => onSurgeonIdChange(e.target.value)} disabled={!accountId} style={sc.input}>
              <option value="">None</option>
              {mergedSurgeons.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactDisplayName(c)} · {formatSurgicalContactRole(c.role_type)}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="new-case-section">
          <h3 className="new-case-title">Case schedule</h3>
          <div className="new-case-fields-2">
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>
                Case date <span style={{ color: "var(--brand-600)" }}>*</span>
              </span>
              <input required type="date" value={caseDate} onChange={(e) => onCaseDateChange(e.target.value)} style={sc.input} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>Case time (optional)</span>
              <input type="time" value={caseTime} onChange={(e) => onCaseTimeChange(e.target.value)} style={sc.input} />
            </label>
          </div>
        </section>
        <section className="new-case-section">
          <h3 className="new-case-title">Procedure</h3>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Procedure or case context</span>
            <input
              value={setupProcedure}
              onChange={(e) => onSetupProcedureChange(e.target.value)}
              placeholder="e.g. Lap chole tray support, SKU replenishment"
              style={sc.input}
            />
          </label>
        </section>
      </ProductSupportMissionStep>

      <ProductSupportMissionStep
        step={2}
        title="Product & Inventory"
        tone="operations"
        isActive={activeStep === 1}
        isComplete={productInventoryComplete}
        isLocked={maxUnlockedStep < 1}
        onActivate={() => onGoToStep(1)}
        sectionRef={stepRefs[1]}
        onFocusWithin={() => onStepFocus(1)}
        onBlurWithin={() => onStepBlur(1)}
        summary={checklistItems[1]?.summary ?? ""}
      >
        <section className="new-case-section new-case-section--product-required">
          <h3 className="new-case-title">
            Product & SKU <span style={{ color: "var(--brand-600)" }}>*</span>
          </h3>
          <p className="new-case-product-helper">Required for inventory tracking, documentation, and billing follow-up.</p>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>
              Product family <span style={{ color: "var(--brand-600)" }}>*</span>
            </span>
            <select required value={productId} onChange={(e) => onProductIdChange(e.target.value)} style={sc.input}>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="new-case-fields-2">
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>
                SKU <span style={{ color: "var(--brand-600)" }}>*</span>
              </span>
              <select required value={skuId} onChange={(e) => onSkuIdChange(e.target.value)} style={sc.input}>
                <option value="">Select SKU…</option>
                {displaySkus.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sku}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>Quantity</span>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={expectedQty}
                onChange={(e) => onExpectedQtyChange(e.target.value)}
                style={sc.input}
              />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Revenue per case (optional)</span>
            <input value={expectedRevenue} onChange={(e) => onExpectedRevenueChange(e.target.value)} style={sc.input} />
          </label>
          <p className="new-case-support-doc-callout" role="note">
            PO and invoice uploads are completed on the case detail page after save — not required to create the case.
          </p>
        </section>
      </ProductSupportMissionStep>

      <ProductSupportMissionStep
        step={3}
        title="Case Support Plan"
        tone="operations"
        isActive={activeStep === 2}
        isComplete={caseSupportPlanComplete}
        isLocked={maxUnlockedStep < 2}
        onActivate={() => onGoToStep(2)}
        sectionRef={stepRefs[2]}
        onFocusWithin={() => onStepFocus(2)}
        onBlurWithin={() => onStepBlur(2)}
        summary={checklistItems[2]?.summary ?? ""}
      >
        <section className="new-case-section">
          <h3 className="new-case-title">Support objective</h3>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>What outcome does this support case track?</span>
            <input
              value={supportObjective}
              onChange={(e) => onSupportObjectiveChange(e.target.value)}
              placeholder="e.g. Tray coverage, consignment pull, documentation support"
              style={sc.input}
            />
          </label>
        </section>
        <section className="new-case-section">
          <h3 className="new-case-title">Rep role</h3>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Coverage role for this case</span>
            <select value={supportRepRole} onChange={(e) => onSupportRepRoleChange(e.target.value)} style={sc.input}>
              <option value="">Select role…</option>
              <option value="Rep in room">Rep in room</option>
              <option value="Rep on call / standby">Rep on call / standby</option>
              <option value="Clinical specialist">Clinical specialist</option>
              <option value="Remote support only">Remote support only</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </section>
        <section className="new-case-section">
          <h3 className="new-case-title">Required materials</h3>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12 }}>Sets, disposables, or documents needed</span>
            <textarea
              value={supportRequiredMaterials}
              onChange={(e) => onSupportRequiredMaterialsChange(e.target.value)}
              rows={2}
              placeholder="Trays, loaners, preference cards, packing lists…"
              style={{ ...sc.input, resize: "vertical" }}
            />
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={followUpNeeded} onChange={(e) => onFollowUpNeededChange(e.target.checked)} />
            Follow-up needed after case
          </label>
        </section>
      </ProductSupportMissionStep>

      <ProductSupportMissionStep
        step={4}
        title="Optional Planning"
        tone="optional"
        isActive={activeStep === 3}
        isComplete={optionalPlanningActive}
        isLocked={maxUnlockedStep < 3}
        onActivate={() => onGoToStep(3)}
        sectionRef={stepRefs[3]}
        onFocusWithin={() => onStepFocus(3)}
        onBlurWithin={() => onStepBlur(3)}
        summary={optionalPlanningSummary || supportOptionalSummary}
      >
        <NewCaseOptionalPlanningSection
          variant="product_support"
          showProductsForObservation={showProductsForObservation}
          onEnableProductInterest={onEnableProductInterest}
          onClearProductInterest={onClearProductInterest}
          products={products}
          productId={productId}
          onProductIdChange={onProductIdChange}
          displaySkus={displaySkus}
          skuId={skuId}
          onSkuIdChange={onSkuIdChange}
          expectedQty={expectedQty}
          onExpectedQtyChange={onExpectedQtyChange}
          expectedRevenue={expectedRevenue}
          onExpectedRevenueChange={onExpectedRevenueChange}
          opportunityLocked={opportunityLockedInitiative}
          lockedRelatedOpportunityLabel={lockedRelatedOpportunityLabel}
          relatedOpportunityId={relatedOpportunityId}
          onRelatedOpportunityIdChange={onRelatedOpportunityIdChange}
          opportunityOptions={opportunityOptions}
          formatRelatedOpportunityLabel={formatRelatedOpportunityLabel}
          loadBusy={loadBusy}
          accountId={accountId}
          providerContext={providerContext}
          notes={notes}
          onNotesChange={onNotesChange}
          followUpNeeded={false}
          onFollowUpNeededChange={() => {}}
          notePhiKinds={notePhiKinds}
        />
      </ProductSupportMissionStep>
    </div>
  );
}

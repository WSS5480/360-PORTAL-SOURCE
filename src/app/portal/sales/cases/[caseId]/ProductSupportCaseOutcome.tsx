"use client";

import React from "react";
import {
  buildProductSupportCaseResultPatch,
  buildProductSupportNextStepPatch,
  buildProductSupportProviderReactionPatch,
  parseProductSupportCaseResult,
  parseProductSupportNextStep,
  parseProductSupportProviderReaction,
  PRODUCT_SUPPORT_CASE_RESULT_LABELS,
  PRODUCT_SUPPORT_CASE_RESULTS,
  PRODUCT_SUPPORT_NEXT_STEP_LABELS,
  PRODUCT_SUPPORT_NEXT_STEPS,
  PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS,
  PRODUCT_SUPPORT_PROVIDER_REACTIONS,
  type ProductSupportCaseResultId,
  type ProductSupportNextStepId,
  type ProductSupportProviderReactionId,
} from "@/lib/surgical-sales/productSupportCaseMoments";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { productSupportCaseOverviewCss } from "./productSupportCaseOverviewCss";
import { userFacingError } from "@/lib/errors/userFacingError";

function ChipGroup<T extends string>({
  title,
  options,
  labels,
  selected,
  disabled,
  saving,
  onSelect,
}: {
  title: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T | null;
  disabled?: boolean;
  saving?: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="case-ps-moments-group">
      <p className="case-ps-moments-group-title">{title}</p>
      <div className="case-ps-moments-chip-row">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="case-ps-moments-chip"
            aria-pressed={selected === option}
            disabled={disabled || saving}
            onClick={() => onSelect(option)}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductSupportCaseOutcome({
  caseRow,
  disabled,
  onPatchCase,
}: {
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  onPatchCase?: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [savingField, setSavingField] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const providerReaction = parseProductSupportProviderReaction(
    caseRow.case_support_provider_reaction as string | null | undefined,
  );
  const caseResult = parseProductSupportCaseResult(caseRow.case_support_case_result as string | null | undefined);
  const nextStep = parseProductSupportNextStep(caseRow.case_support_next_step as string | null | undefined);

  async function savePatch(field: string, patch: Record<string, unknown>) {
    if (disabled || !onPatchCase || savingField) return;
    setSavingField(field);
    setError(null);
    try {
      const ok = await onPatchCase(patch);
      if (!ok) throw new Error("Could not save case outcome");
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save case outcome"));
    } finally {
      setSavingField(null);
    }
  }

  return (
    <section className="case-ps-detail-card case-ps-outcome-card" aria-labelledby="case-ps-outcome-title">
      {/* This card also renders on tabs that do not mount the overview, so it carries its own styles. */}
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseOverviewCss }} />
      <h2 id="case-ps-outcome-title" className="case-ps-detail-card-title">
        {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.caseOutcome}
      </h2>

      <ChipGroup<ProductSupportProviderReactionId>
        title="Provider Reaction"
        options={PRODUCT_SUPPORT_PROVIDER_REACTIONS}
        labels={PRODUCT_SUPPORT_PROVIDER_REACTION_LABELS}
        selected={providerReaction}
        disabled={disabled || !onPatchCase}
        saving={savingField === "reaction"}
        onSelect={(value) => void savePatch("reaction", buildProductSupportProviderReactionPatch(value))}
      />

      <ChipGroup<ProductSupportCaseResultId>
        title="Case Result"
        options={PRODUCT_SUPPORT_CASE_RESULTS}
        labels={PRODUCT_SUPPORT_CASE_RESULT_LABELS}
        selected={caseResult}
        disabled={disabled || !onPatchCase}
        saving={savingField === "result"}
        onSelect={(value) => void savePatch("result", buildProductSupportCaseResultPatch(value))}
      />

      <ChipGroup<ProductSupportNextStepId>
        title="Next Step"
        options={PRODUCT_SUPPORT_NEXT_STEPS}
        labels={PRODUCT_SUPPORT_NEXT_STEP_LABELS}
        selected={nextStep}
        disabled={disabled || !onPatchCase}
        saving={savingField === "next_step"}
        onSelect={(value) => void savePatch("next_step", buildProductSupportNextStepPatch(value))}
      />

      {error ? <p className="case-ps-capture-error">{error}</p> : null}
    </section>
  );
}

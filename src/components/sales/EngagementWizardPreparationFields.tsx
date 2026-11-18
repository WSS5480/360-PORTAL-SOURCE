"use client";

import React from "react";
import type { EngagementWizardPrepView } from "@/lib/surgical-sales/engagements/loadEngagementWizardPrepView";
import {
  WIZARD_PREP_FIELD_LABEL_OVERRIDES,
  WIZARD_PREP_FIELD_ROWS,
  WIZARD_PREP_LIGHTWEIGHT_ADVANCED_KEYS,
  WIZARD_PREP_LIGHTWEIGHT_PRIORITY_KEYS,
  WIZARD_PREP_STRATEGIC_ADVANCED_KEYS,
  WIZARD_PREP_STRATEGIC_PRIORITY_KEYS,
  wizardPrepLightPrefill,
  wizardPrepPlaceholder,
  type WizardPrepFieldGuidanceContext,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepFieldGuidance";
import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { resolveContextProductLine } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";

function fieldLabel(field: EngagementWorkflowFieldConfig): string {
  return WIZARD_PREP_FIELD_LABEL_OVERRIDES[field.key] ?? field.label;
}

function fieldRows(field: EngagementWorkflowFieldConfig): number {
  return WIZARD_PREP_FIELD_ROWS[field.key] ?? Math.min(field.rows, 2);
}

function GuidedField({
  field,
  draft,
  disabled,
  placeholder,
  onChange,
}: {
  field: EngagementWorkflowFieldConfig;
  draft: EngagementWorkflowDraft;
  disabled?: boolean;
  placeholder?: string;
  onChange: (key: string, value: string) => void;
}) {
  const value = draft[field.key] ?? "";
  const rows = fieldRows(field);
  return (
    <label className="ew-prep-guided-field">
      <span className="ew-prep-guided-field-label">{fieldLabel(field)}</span>
      <textarea
        rows={rows}
        value={value}
        disabled={disabled}
        data-workflow-key={field.key}
        placeholder={placeholder}
        className={value.trim() ? "ew-prep-guided-field--filled" : undefined}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </label>
  );
}

function GuidedFieldGroup({
  fields,
  draft,
  disabled,
  guidanceCtx,
  onChange,
}: {
  fields: EngagementWorkflowFieldConfig[];
  draft: EngagementWorkflowDraft;
  disabled?: boolean;
  guidanceCtx: WizardPrepFieldGuidanceContext;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {fields.map((field) => (
        <GuidedField
          key={field.key}
          field={field}
          draft={draft}
          disabled={disabled}
          placeholder={wizardPrepPlaceholder(field.key, guidanceCtx)}
          onChange={onChange}
        />
      ))}
    </>
  );
}

export function EngagementWizardPreparationFields({
  mode,
  engagementType,
  draft,
  fieldConfigs,
  disabled,
  suggestContext,
  prep,
  onChange,
}: {
  mode: "strategic" | "lightweight";
  engagementType: string;
  draft: EngagementWorkflowDraft;
  fieldConfigs: EngagementWorkflowFieldConfig[];
  disabled?: boolean;
  suggestContext: TemplateSuggestContext;
  prep?: EngagementWizardPrepView | null;
  onChange: (draft: EngagementWorkflowDraft) => void;
}) {
  const prefilledKeysRef = React.useRef(new Set<string>());
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const advancedHint =
    mode === "strategic" ? "Tools, value, close" : "Next action, follow-up";

  React.useEffect(() => {
    prefilledKeysRef.current.clear();
  }, [engagementType, prep?.provider_snapshot?.provider_id]);

  const guidanceCtx = React.useMemo<WizardPrepFieldGuidanceContext>(
    () => ({
      engagementType,
      productLine: resolveContextProductLine(suggestContext),
      providerSpecialty:
        prep?.provider_snapshot?.specialty ?? suggestContext.providerSpecialty ?? null,
    }),
    [engagementType, suggestContext, prep?.provider_snapshot?.specialty],
  );

  const priorityKeys =
    mode === "strategic" ? WIZARD_PREP_STRATEGIC_PRIORITY_KEYS : WIZARD_PREP_LIGHTWEIGHT_PRIORITY_KEYS;
  const advancedKeys =
    mode === "strategic" ? WIZARD_PREP_STRATEGIC_ADVANCED_KEYS : WIZARD_PREP_LIGHTWEIGHT_ADVANCED_KEYS;

  const configByKey = React.useMemo(() => {
    const map = new Map<string, EngagementWorkflowFieldConfig>();
    for (const f of fieldConfigs) map.set(f.key, f);
    return map;
  }, [fieldConfigs]);

  const priorityFields = priorityKeys
    .map((k) => configByKey.get(k))
    .filter((f): f is EngagementWorkflowFieldConfig => Boolean(f));
  const advancedFields = advancedKeys
    .map((k) => configByKey.get(k))
    .filter((f): f is EngagementWorkflowFieldConfig => Boolean(f));

  const advancedHasContent = advancedFields.some((f) => String(draft[f.key] ?? "").trim().length > 0);

  React.useEffect(() => {
    if (advancedHasContent) setAdvancedOpen(true);
  }, [advancedHasContent]);

  React.useEffect(() => {
    if (!prep) return;
    const patches: EngagementWorkflowDraft = {};
    const suggestionInput = {
      suggestedGoal: prep.suggested_goal?.goal ?? null,
      suggestedOpening: prep.suggested_opening?.statement ?? null,
      suggestedDiscoveryQuestions: prep.suggested_discovery?.questions ?? [],
    };

    for (const field of priorityFields) {
      if (String(draft[field.key] ?? "").trim()) continue;
      if (prefilledKeysRef.current.has(field.key)) continue;

      if (field.key === "pre_observation_probes" && suggestionInput.suggestedDiscoveryQuestions.length > 0) {
        continue;
      }
      if (field.key === "pre_observation_impact_opening_statement" && suggestionInput.suggestedOpening) {
        continue;
      }

      const light = wizardPrepLightPrefill(field.key, suggestionInput);
      if (light) {
        patches[field.key] = light;
        prefilledKeysRef.current.add(field.key);
      }
    }

    if (Object.keys(patches).length > 0) {
      onChange({ ...draft, ...patches });
    }
    // Only run when prep suggestions first become available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep?.suggested_goal?.goal, prep?.suggested_opening?.statement]);

  const handleChange = React.useCallback(
    (key: string, value: string) => {
      onChange({ ...draft, [key]: value });
    },
    [draft, onChange],
  );

  if (priorityFields.length === 0 && advancedFields.length === 0) {
    return null;
  }

  return (
    <div className="ew-prep-guided-fields">
      <div className="ew-prep-guided-priority">
        <GuidedFieldGroup
          fields={priorityFields}
          draft={draft}
          disabled={disabled}
          guidanceCtx={guidanceCtx}
          onChange={handleChange}
        />
      </div>

      {advancedFields.length > 0 ? (
        <details
          className="ew-prep-guided-advanced"
          open={advancedOpen}
          onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="ew-prep-guided-advanced-summary">
            <span>More planning</span>
            <span className="ew-prep-guided-advanced-hint">
              {advancedHasContent ? "Has content" : advancedHint}
            </span>
          </summary>
          <div className="ew-prep-guided-advanced-body">
            <GuidedFieldGroup
              fields={advancedFields}
              draft={draft}
              disabled={disabled}
              guidanceCtx={guidanceCtx}
              onChange={handleChange}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}

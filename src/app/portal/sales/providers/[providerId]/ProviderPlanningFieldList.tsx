"use client";

import type React from "react";
import type { WizardFieldConfig } from "@/lib/surgical-sales/providerWizardFields";
import { isPlanningFieldRequired } from "@/lib/surgical-sales/providerPlanningTabSections";
import { ProviderIntelligenceFieldControl } from "@/components/sales/ProviderIntelligenceFieldControl";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { intelligenceFieldWhyItMatters } from "@/lib/surgical-sales/providerIntelligenceCaptureGuidance";
import { ProviderIntelligenceFieldAttribution } from "./ProviderIntelligenceFieldAttribution";
import { ProviderIntelligenceWhyItMatters } from "./ProviderIntelligenceWhyItMatters";
import {
  CREDENTIALING_PLATFORM_ID_DB_KEY,
  isCredentialingPlatformNameField,
} from "@/app/portal/sales/providers/[providerId]/CredentialingPlatformFieldControl";

export function ProviderPlanningFieldList({
  fields,
  draft,
  setDraft,
  disabled,
  variant = "default",
  layout = "stack",
  showHelpers = true,
  emphasizeKeys,
  fieldMetadata,
  showAttribution = false,
  showFieldGuidance = false,
}: {
  fields: WizardFieldConfig[];
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled?: boolean;
  textareaRows?: number;
  variant?: "default" | "compact";
  layout?: "stack" | "grid";
  showHelpers?: boolean;
  emphasizeKeys?: readonly string[];
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  /** Detailed per-field attribution — expanded / full-form edit only. */
  showAttribution?: boolean;
  /** Operational “Why this matters” under each field label. */
  showFieldGuidance?: boolean;
}) {
  const layoutClass =
    layout === "grid" ? " provider-planning-fields--grid" : "";

  return (
    <div
      className={`provider-planning-fields${variant === "compact" ? " provider-planning-fields--compact" : ""}${layoutClass}`}
    >
      {fields.map((field) => {
        if (field.key === CREDENTIALING_PLATFORM_ID_DB_KEY) return null;
        const required = field.required ?? isPlanningFieldRequired(field.key);
        const id = `pp-${field.key}`;
        const emphasized = emphasizeKeys?.includes(field.key);
        const notesId =
          field.capture?.input === "segmented_plus_notes" || field.capture?.input === "chips_plus_notes"
            ? undefined
            : id;
        const meta = fieldMetadata?.[field.key];
        const fieldWhy = showFieldGuidance ? intelligenceFieldWhyItMatters(field.key) : undefined;
        const hideDefaultHelper = isCredentialingPlatformNameField(field.key);

        return (
          <div
            key={field.key}
            id={emphasized ? `intel-field-${field.key}` : undefined}
            className={`provider-profile-field provider-profile-field--intel${required ? " provider-profile-field--required" : ""}${emphasized ? " provider-profile-field--emphasized" : ""}${field.capture?.input === "chips_plus_notes" || field.capture?.input === "segmented_plus_notes" ? " provider-profile-field--span-grid" : ""}`}
          >
            {!hideDefaultHelper ? (
              <label htmlFor={notesId} title={!showHelpers ? field.helper : undefined}>
                {field.label}
              </label>
            ) : null}
            {fieldWhy ? <ProviderIntelligenceWhyItMatters text={fieldWhy} variant="field" /> : null}
            {showHelpers && field.helper && !hideDefaultHelper ? (
              <span className="hint">{field.helper}</span>
            ) : null}
            <ProviderIntelligenceFieldControl
              id={id}
              field={field}
              value={draft[field.key] || ""}
              onChange={(next) => setDraft((prev) => ({ ...prev, [field.key]: next }))}
              disabled={disabled}
              planningDraft={draft}
              onPlanningPatch={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            />
            {showAttribution ? <ProviderIntelligenceFieldAttribution meta={meta} variant="detail" /> : null}
          </div>
        );
      })}
    </div>
  );
}

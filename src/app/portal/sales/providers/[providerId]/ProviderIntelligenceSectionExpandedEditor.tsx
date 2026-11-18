"use client";

import React from "react";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { splitIntelligenceSectionFields } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { wizardFieldsForSection, type ProviderPlanningTabSectionId } from "@/lib/surgical-sales/providerPlanningTabSections";
import { ProviderPlanningFieldList } from "./ProviderPlanningFieldList";
import { ProviderIntelligenceDeepenUnlock } from "./ProviderIntelligenceIncrementalPanels";
import { ProviderIntelligenceProgressiveCapture } from "./ProviderIntelligenceProgressiveCapture";

export function ProviderIntelligenceSectionExpandedEditor({
  sectionId,
  contact,
  planDraft,
  setPlanDraft,
  saving,
  fieldMetadata,
  sectionConfidence,
  emphasizeKeys,
  deepenExpanded,
  onToggleDeepen,
  onCaptureGap,
  primaryFieldFilter,
  deepenFieldBuilder,
  providerId,
}: {
  sectionId: ProviderPlanningTabSectionId;
  contact: Record<string, unknown>;
  planDraft: Record<string, string>;
  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  fieldMetadata: ProviderIntelligenceFieldMetadataMap;
  sectionConfidence: IntelligenceSectionConfidence;
  emphasizeKeys?: readonly string[];
  deepenExpanded: boolean;
  onToggleDeepen: () => void;
  onCaptureGap?: (dbKey: string) => void;
  primaryFieldFilter?: (fields: ReturnType<typeof wizardFieldsForSection>) => ReturnType<typeof wizardFieldsForSection>;
  deepenFieldBuilder?: (
    split: ReturnType<typeof splitIntelligenceSectionFields>,
  ) => ReturnType<typeof wizardFieldsForSection>;
  providerId?: string;
}) {
  const [showAllFields, setShowAllFields] = React.useState(false);

  React.useEffect(() => {
    if (emphasizeKeys?.length) setShowAllFields(false);
  }, [emphasizeKeys?.join(",")]);

  const mergedContact = React.useMemo(() => ({ ...contact, ...planDraft }), [contact, planDraft]);
  const allFields = wizardFieldsForSection(sectionId);
  const split = splitIntelligenceSectionFields(sectionId, mergedContact, allFields, sectionConfidence);

  const primaryFields = primaryFieldFilter
    ? primaryFieldFilter(split.quickFields)
    : split.quickFields;
  const deepenFields = deepenFieldBuilder
    ? deepenFieldBuilder(split)
    : split.deepFields;

  const showDeep =
    split.deepUnlocked &&
    (deepenExpanded || split.missingDeepCount > 0 || (emphasizeKeys?.length ?? 0) > 0);

  const hasDeepen = deepenFields.length > 0 || (!split.deepUnlocked && split.missingDeepCount > 0);

  if (!showAllFields) {
    return (
      <div className="provider-intel-section-expanded-stack">
        <div className="provider-intel-section-capture-panel">
          <h4 className="provider-intel-section-capture-title">Continue capturing</h4>
          <ProviderIntelligenceProgressiveCapture
            sectionId={sectionId}
            contact={contact}
            planDraft={planDraft}
            setPlanDraft={setPlanDraft}
            saving={saving}
            sectionConfidence={sectionConfidence}
            emphasizeKeys={emphasizeKeys}
            onShowAllFields={() => setShowAllFields(true)}
            providerId={providerId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="provider-intel-section-expanded">
      <div className="provider-intel-area-edit-head">
        <span className="provider-intel-area-edit-label">All fields</span>
        <button
          type="button"
          className="provider-intel-area-edit-done"
          onClick={() => setShowAllFields(false)}
        >
          Full form
        </button>
      </div>

      {primaryFields.length > 0 ? (
        <ProviderPlanningFieldList
          fields={primaryFields}
          draft={planDraft}
          setDraft={setPlanDraft}
          disabled={saving}
          variant="compact"
          layout="grid"
          showHelpers={false}
          showFieldGuidance
          emphasizeKeys={emphasizeKeys}
          fieldMetadata={fieldMetadata}
          showAttribution={false}
        />
      ) : null}

      {hasDeepen ? (
        <>
          <ProviderIntelligenceDeepenUnlock
            unlocked={split.deepUnlocked}
            missingCount={
              deepenFieldBuilder
                ? deepenFields.filter((f) => !String(mergedContact[f.key] ?? "").trim()).length
                : split.missingDeepCount
            }
            expanded={Boolean(showDeep)}
            onToggle={onToggleDeepen}
          />
          {showDeep && deepenFields.length > 0 ? (
            <ProviderPlanningFieldList
              fields={deepenFields}
              draft={planDraft}
              setDraft={setPlanDraft}
              disabled={saving}
              variant="compact"
              layout="grid"
              showHelpers={false}
              showFieldGuidance
              emphasizeKeys={emphasizeKeys}
              fieldMetadata={fieldMetadata}
              showAttribution={false}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

"use client";

import type {
  ObservationReadinessRequirement,
  ProviderObservationFeasibilitySummary,
} from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";
import {
  PROVIDER_OVERVIEW_LINK_INTELLIGENCE,
  PROVIDER_OVERVIEW_OBS_READINESS_BEFORE_BOOKING_LABEL,
  PROVIDER_OVERVIEW_OBS_READINESS_BLOCKING_EMPTY,
  PROVIDER_OVERVIEW_OBS_READINESS_BLOCKING_LABEL,
  PROVIDER_OVERVIEW_OBS_READINESS_KICKER,
  PROVIDER_OVERVIEW_OBS_READINESS_NEXT_EMPTY,
  PROVIDER_OVERVIEW_OBS_READINESS_NEXT_VALIDATIONS_LABEL,
  PROVIDER_OVERVIEW_OBS_READINESS_SAFE_TO_SCHEDULE_LABEL,
  PROVIDER_OVERVIEW_OBS_READINESS_VALIDATED_EMPTY,
  PROVIDER_OVERVIEW_OBS_READINESS_VALIDATED_LABEL,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import { ProviderOverviewSectionHeader } from "./ProviderOverviewSectionHeader";
import { IntelligenceScanOpenRow, IntelligenceScanValidatedRow } from "./ProviderIntelligenceScanSignals";
import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { providerOperationalConsequenceForField } from "@/lib/surgical-sales/providerOperationalImpact";

function RequirementList({
  items,
  emptyLabel,
  variant,
  onOpenIntelligence,
}: {
  items: ObservationReadinessRequirement[];
  emptyLabel: string;
  variant: "validated" | "blocking" | "unknown";
  onOpenIntelligence: () => void;
}) {
  if (items.length === 0) {
    return (
      <p className={`provider-intel-scan-empty provider-intel-scan-empty--${variant === "validated" ? "validated" : "open"}`}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className={`provider-intel-scan-list provider-intel-scan-list--obs provider-intel-scan-list--${variant}`}>
      {items.map((item) => {
        if (variant === "validated" && item.value) {
          return (
            <IntelligenceScanValidatedRow
              key={item.dbKey}
              label={`${item.label} — ${item.value}`}
              onClick={onOpenIntelligence}
            />
          );
        }
        const consequence =
          item.operationalConsequence ?? providerOperationalConsequenceForField(item.dbKey);
        return (
          <IntelligenceScanOpenRow
            key={item.dbKey}
            label={item.label}
            consequence={consequence}
            fieldGuidance={intelligenceGapFieldGuidance(item.dbKey)}
            onClick={onOpenIntelligence}
            showTags={variant === "blocking"}
            showFieldGuidance={variant === "blocking"}
          />
        );
      })}
    </ul>
  );
}

export function ProviderObservationFeasibilitySummarySection({
  summary,
  onOpenIntelligence,
}: {
  summary: ProviderObservationFeasibilitySummary;
  onOpenIntelligence: (sectionId?: string) => void;
}) {
  if (!summary.showPanel) return null;

  const openSection = () => onOpenIntelligence(summary.sectionId);

  return (
    <section
      className={`provider-ops-obs-readiness provider-ops-ops-panel provider-ops-ops-panel--surgical provider-ops-obs-readiness--${summary.tone}`}
      aria-labelledby="provider-ops-obs-readiness-state"
    >
      <ProviderOverviewSectionHeader
        title={summary.title}
        kicker={PROVIDER_OVERVIEW_OBS_READINESS_KICKER}
        linkLabel={PROVIDER_OVERVIEW_LINK_INTELLIGENCE}
        onLink={openSection}
      />

      <div className="provider-ops-obs-readiness-engine">
        <div className="provider-ops-obs-readiness-left">
          <p id="provider-ops-obs-readiness-state" className="provider-ops-obs-readiness-state">
            {summary.verdictLabel}
          </p>
          <p className="provider-ops-obs-readiness-scan">{summary.verdictScan}</p>
        </div>

        <div className="provider-ops-obs-readiness-right">
          <div className="provider-ops-obs-readiness-col">
            <h3 className="provider-ops-obs-readiness-col-title">{PROVIDER_OVERVIEW_OBS_READINESS_VALIDATED_LABEL}</h3>
            <RequirementList
              items={summary.validatedRequirements}
              emptyLabel={PROVIDER_OVERVIEW_OBS_READINESS_VALIDATED_EMPTY}
              variant="validated"
              onOpenIntelligence={openSection}
            />
          </div>

          <div className="provider-ops-obs-readiness-col">
            <h3 className="provider-ops-obs-readiness-col-title">{PROVIDER_OVERVIEW_OBS_READINESS_BLOCKING_LABEL}</h3>
            <RequirementList
              items={summary.blockingUnknowns}
              emptyLabel={PROVIDER_OVERVIEW_OBS_READINESS_BLOCKING_EMPTY}
              variant="blocking"
              onOpenIntelligence={openSection}
            />
          </div>

          <div className="provider-ops-obs-readiness-col">
            <h3 className="provider-ops-obs-readiness-col-title">
              {PROVIDER_OVERVIEW_OBS_READINESS_NEXT_VALIDATIONS_LABEL}
            </h3>
            <RequirementList
              items={summary.nextValidations}
              emptyLabel={PROVIDER_OVERVIEW_OBS_READINESS_NEXT_EMPTY}
              variant="unknown"
              onOpenIntelligence={openSection}
            />
          </div>
        </div>
      </div>

      <footer className="provider-ops-obs-readiness-footer">
        <div
          className={`provider-ops-obs-readiness-schedule provider-ops-obs-readiness-schedule--${summary.safeToSchedule.answer}`}
        >
          <p className="provider-ops-obs-readiness-footer-label">
            {PROVIDER_OVERVIEW_OBS_READINESS_SAFE_TO_SCHEDULE_LABEL}
          </p>
          <p className="provider-ops-obs-readiness-schedule-answer">{summary.safeToSchedule.label}</p>
        </div>

        {summary.beforeBookingConfirm.length > 0 ? (
          <div className="provider-ops-obs-readiness-confirm">
            <p className="provider-ops-obs-readiness-footer-label">
              {PROVIDER_OVERVIEW_OBS_READINESS_BEFORE_BOOKING_LABEL}
            </p>
            <ul className="provider-ops-obs-readiness-confirm-list">
              {summary.beforeBookingConfirm.map((line) => (
                <li key={line}>
                  <button type="button" className="provider-ops-obs-readiness-confirm-item" onClick={openSection}>
                    {line}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </footer>
    </section>
  );
}

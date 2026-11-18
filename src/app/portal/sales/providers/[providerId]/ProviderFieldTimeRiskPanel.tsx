"use client";

import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_KICKER,
  PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_TITLE,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

export function ProviderFieldTimeRiskPanel({
  risk,
  variant = "full",
  onOpenIntelligence,
}: {
  risk: ProviderFieldTimeRisk;
  variant?: "full" | "compact" | "hero";
  onOpenIntelligence?: (sectionId?: string, dbKey?: string) => void;
}) {
  const { narrative, protectFieldTime } = risk;
  const rootClass = [
    "provider-field-time-risk",
    `provider-field-time-risk--${risk.tone}`,
    `provider-field-time-risk--${variant}`,
    "provider-field-time-risk--predictive",
  ].join(" ");

  const showDetails = variant === "full";

  return (
    <div className={rootClass} role="status" aria-label={`${risk.title}: ${narrative.tierLabel}`}>
      <div className="provider-field-time-risk-head">
        <div className="provider-field-time-risk-head-text">
          {variant !== "compact" ? (
            <p className="provider-field-time-risk-kicker">{PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_KICKER}</p>
          ) : null}
          <p className="provider-field-time-risk-title">{PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_TITLE}</p>
          <p className="provider-field-time-risk-posture">{protectFieldTime.postureLabel}</p>
        </div>
        <span className={`provider-field-time-risk-badge provider-field-time-risk-badge--${risk.state}`}>
          {protectFieldTime.protectionScore}% protected
        </span>
      </div>

      <ul className="provider-field-time-risk-dimensions" aria-label="Field time threat checks">
        {protectFieldTime.dimensions.map((dim) => (
          <li
            key={dim.id}
            className={`provider-field-time-risk-dimension provider-field-time-risk-dimension--${dim.level}`}
          >
            {onOpenIntelligence && (dim.level === "high" || dim.level === "critical") ? (
              <button
                type="button"
                className="provider-field-time-risk-dimension-btn"
                onClick={() => onOpenIntelligence(dim.sectionId, dim.dbKey)}
              >
                <span className="provider-field-time-risk-dimension-label">{dim.label}</span>
                <span className="provider-field-time-risk-dimension-level">{dim.levelLabel}</span>
                <span className="provider-field-time-risk-dimension-scan">{dim.scan}</span>
              </button>
            ) : (
              <>
                <span className="provider-field-time-risk-dimension-label">{dim.label}</span>
                <span className="provider-field-time-risk-dimension-level">{dim.levelLabel}</span>
                <span className="provider-field-time-risk-dimension-scan">{dim.scan}</span>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="provider-field-time-risk-predictive">
          <div className="provider-field-time-risk-block provider-field-time-risk-block--fail">
          <span className="provider-field-time-risk-block-label">What could go wrong</span>
          <p className="provider-field-time-risk-block-text">{narrative.whyFieldTimeFails}</p>
        </div>

        <div className="provider-field-time-risk-block provider-field-time-risk-block--assumption">
          <span className="provider-field-time-risk-block-label">Do not assume</span>
          <p className="provider-field-time-risk-block-text">{narrative.dangerousAssumption}</p>
        </div>

        {narrative.reducers.length > 0 ? (
          <div className="provider-field-time-risk-block provider-field-time-risk-block--reduce">
            <span className="provider-field-time-risk-block-label">Reduces risk</span>
            <ul className="provider-field-time-risk-reducers">
              {narrative.reducers.map((reducer) => (
                <li key={reducer.reducerSignal}>
                  {onOpenIntelligence && reducer.dbKey ? (
                    <button
                      type="button"
                      className="provider-field-time-risk-reducer-btn"
                      onClick={() =>
                        onOpenIntelligence(reducer.sectionId as ProviderIntelligenceSectionId, reducer.dbKey)
                      }
                    >
                      {reducer.reducerSignal}
                    </button>
                  ) : (
                    <span className="provider-field-time-risk-reducer-text">{reducer.reducerSignal}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {showDetails ? (
        <details className="provider-field-time-risk-signals-detail">
          <summary className="provider-field-time-risk-signals-summary">Signal checklist</summary>
          <ul className="provider-field-time-risk-signals" aria-label="Underlying signals">
            {risk.inputs.map((row) => (
              <li
                key={row.id}
                className={`provider-field-time-risk-signal provider-field-time-risk-signal--${row.status}`}
              >
                {onOpenIntelligence && row.status !== "strong" && row.dbKey ? (
                  <button
                    type="button"
                    className="provider-field-time-risk-signal-btn"
                    onClick={() => onOpenIntelligence(row.sectionId, row.dbKey)}
                  >
                    <span className="provider-field-time-risk-signal-label">{row.label}</span>
                    <span className="provider-field-time-risk-signal-scan">{row.scan}</span>
                  </button>
                ) : (
                  <>
                    <span className="provider-field-time-risk-signal-label">{row.label}</span>
                    <span className="provider-field-time-risk-signal-scan">{row.scan}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : variant === "compact" ? (
        <p className="provider-field-time-risk-compact-scan">{narrative.whyFieldTimeFails}</p>
      ) : null}
    </div>
  );
}

"use client";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { PROVIDER_INTELLIGENCE_SECTION_LABELS } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildIntelligenceLearningGapsForDisplay } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { ProviderIntelligenceUnlocksNextLine } from "./ProviderIntelligenceUnlocksNextLine";
import { buildProviderOverviewQualitativeReadiness } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";

const SECTION_ID = "observation_readiness" as const;

export function ProviderObservationReadinessOverview({
  contact,
  planning,
  onOpenIntelligence,
  variant = "default",
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  onOpenIntelligence: (sectionId?: string) => void;
  variant?: "default" | "dashboard";
}) {
  const relationshipStage = String(contact.provider_relationship_stage || "early_discovery");
  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
  });
  const observationIndicator = buildProviderOverviewQualitativeReadiness({
    contact,
    relationshipStage,
    commercialStage,
  }).find((i) => i.id === "observation_readiness");

  const gaps = buildIntelligenceLearningGapsForDisplay(contact, planning ?? null, 3).filter(
    (g) => g.sectionId === SECTION_ID,
  );
  const topGaps = gaps.length > 0 ? gaps : buildIntelligenceLearningGapsForDisplay(contact, planning ?? null, 2);

  if (variant === "dashboard") {
    return (
      <section
        className="provider-ops-panel provider-ops-panel--observation"
        aria-labelledby="provider-ops-observation-title"
      >
        <div className="provider-ops-panel-head">
          <h3 id="provider-ops-observation-title" className="provider-ops-panel-title">
            Observation readiness
          </h3>
          <button type="button" className="provider-ops-panel-link" onClick={() => onOpenIntelligence(SECTION_ID)}>
            Capture →
          </button>
        </div>
        <p
          className={`provider-ops-readiness-state provider-ops-readiness-state--${observationIndicator?.state ?? "emerging"}`}
        >
          {observationIndicator?.stateLabel ?? "Emerging"}
        </p>
        {observationIndicator?.context ? (
          <p className="provider-ops-panel-foot">{observationIndicator.context}</p>
        ) : null}
        {topGaps.length > 0 ? (
          <ul className="provider-ops-obs-gaps">
            {topGaps.slice(0, 2).map((gap) => (
              <li key={gap.dbKey}>
                <button
                  type="button"
                  className="provider-ops-obs-gap-btn"
                  onClick={() => onOpenIntelligence(SECTION_ID)}
                >
                  <span className="provider-ops-obs-gap-phrase">{gap.phrase}</span>
                  <ProviderIntelligenceUnlocksNextLine line={gap.unlocksNext} compact />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="provider-ops-panel-foot">Core observation access signals are on file.</p>
        )}
      </section>
    );
  }

  return (
    <section
      className="provider-cc-section provider-cc-section--obs-readiness"
      aria-labelledby="provider-cc-obs-readiness-title"
    >
      <div className="provider-cc-section-head">
        <h2 id="provider-cc-obs-readiness-title" className="provider-cc-section-title">
          {PROVIDER_INTELLIGENCE_SECTION_LABELS[SECTION_ID]}
        </h2>
        <button
          type="button"
          className="provider-cc-text-btn"
          onClick={() => onOpenIntelligence(SECTION_ID)}
        >
          Capture →
        </button>
      </div>

      <div className="provider-obs-readiness-overview">
        <p className="provider-obs-readiness-overview-lead">
          Operational risk, committees, limits, and clearance rules before you schedule field time.
        </p>
        <p className="provider-obs-readiness-overview-meter" aria-live="polite">
          <span
            className={`provider-ops-readiness-state provider-ops-readiness-state--${observationIndicator?.state ?? "emerging"}`}
          >
            {observationIndicator?.stateLabel ?? "Emerging"}
          </span>
        </p>
        {observationIndicator?.context ? (
          <p className="provider-cc-section-meta">{observationIndicator.context}</p>
        ) : null}
        {topGaps.length > 0 ? (
          <ul className="provider-obs-readiness-overview-gaps">
            {topGaps.slice(0, 3).map((gap) => (
              <li key={gap.dbKey}>
                <button
                  type="button"
                  className="provider-obs-readiness-overview-gap-btn"
                  onClick={() => onOpenIntelligence(SECTION_ID)}
                >
                  <span className="provider-ops-obs-gap-phrase">{gap.phrase}</span>
                  <ProviderIntelligenceUnlocksNextLine line={gap.unlocksNext} compact />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="provider-cc-section-meta">Core observation access signals are on file.</p>
        )}
      </div>
    </section>
  );
}

"use client";

import type { ProviderOverviewPathwayStageModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { providerOverviewRequirementsMetCount } from "@/lib/surgical-sales/buildProviderOverviewPathwayRequirements";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import {
  formatRequirementProgress,
  shouldShowAbstractMetrics,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import { ProviderOverviewDiscoveryProgression } from "./ProviderOverviewDiscoveryProgression";
import { ProviderOverviewPathwayRequirements } from "./ProviderOverviewPathwayRequirements";
import { ProviderCommitmentOutcomesPanel } from "../ProviderCommitmentOutcomesPanel";

export function ProviderOverviewPathwayStageHeader({
  model,
  followUpHref,
  onCaptureRequirementField,
  onOpenIntelligence,
  onLogFieldIntel,
}: {
  model: ProviderOverviewPathwayStageModel;
  followUpHref: string;
  onCaptureRequirementField: (sectionId: ProviderIntelligenceSectionId, dbKey: string) => void;
  onOpenIntelligence: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onLogFieldIntel: () => void;
}) {
  const discovery = model.discoveryProgression;
  const observationProgress = model.observationProgress;
  const evaluationPath = model.evaluationPath;
  const commitment = model.commitment;
  const outcomesTracking = model.outcomesTracking;
  const metCount = discovery
    ? discovery.readinessCompleteCount
    : providerOverviewRequirementsMetCount(model.requirements);
  const totalRequirements = discovery ? discovery.readinessTotal : model.requirements.length;
  const progressHeading = observationProgress
    ? PROVIDER_FIELD_OPS_SECTION.observationProgress
    : evaluationPath
      ? PROVIDER_FIELD_OPS_SECTION.evaluationPath
      : discovery
        ? PROVIDER_FIELD_OPS_SECTION.observationReadiness
        : PROVIDER_FIELD_OPS_SECTION.requirementProgress;
  const progressLabel = observationProgress
    ? observationProgress.displayLabel
    : evaluationPath
      ? `${evaluationPath.pathLabel} · ${evaluationPath.statusLabel}`
      : formatRequirementProgress(metCount, totalRequirements, model.hasFieldEvidence) ??
        (discovery
          ? `${discovery.advancementSignal.met ? "Advancement met" : "Advancement open"} · ${metCount}/${totalRequirements}`
          : `${metCount}/${totalRequirements}`);
  const showAbstractMetrics =
    observationProgress !== null ||
    evaluationPath !== null ||
    commitment !== null ||
    outcomesTracking !== null ||
    shouldShowAbstractMetrics({
      hasFieldEvidence: model.hasFieldEvidence,
      confirmedCount: metCount,
    });

  return (
    <section
      className={`pov-pathway-stage pov-pathway-stage--${model.stageId}`}
      aria-label={PROVIDER_FIELD_OPS_SECTION.pathwayStage}
    >
      <div className="pov-pathway-stage-top">
        <div className="pov-pathway-stage-identity">
          <p className="pov-pathway-stage-eyebrow">Sales pathway</p>
          <h2 className="pov-pathway-stage-title">{model.stageLabel}</h2>
          <p className="pov-pathway-stage-objective">{model.stageObjective}</p>
          {model.stageExplanation?.trim() ? (
            <p className="pov-pathway-stage-explanation">{model.stageExplanation.trim()}</p>
          ) : null}
          {model.nextStageLockReason?.trim() ? (
            <p className="pov-pathway-stage-lock-reason">{model.nextStageLockReason.trim()}</p>
          ) : null}
        </div>
        {showAbstractMetrics ? (
          <div className="pov-pathway-stage-metrics" aria-label="Stage metrics">
            <div className="pov-pathway-metric">
              <span className="pov-pathway-metric-value">{progressLabel}</span>
              <span className="pov-pathway-metric-label">{progressHeading}</span>
            </div>
            <div className="pov-pathway-metric">
              <span className="pov-pathway-metric-value">{model.riskLevel}</span>
              <span className="pov-pathway-metric-label">{PROVIDER_FIELD_OPS_SECTION.visibilityRisk}</span>
            </div>
          </div>
        ) : null}
      </div>

      {showAbstractMetrics ? (
        <div className="pov-pathway-progress-wrap">
          <div className="pov-pathway-progress-meta">
            <span className="pov-pathway-progress-label">{progressHeading}</span>
            <span className="pov-pathway-progress-count" aria-hidden>
              {progressLabel}
            </span>
          </div>
        </div>
      ) : null}

      {commitment || outcomesTracking ? (
        <ProviderCommitmentOutcomesPanel
          commitment={commitment}
          outcomes={outcomesTracking}
          className="pov-command-header__evaluation-path"
        />
      ) : null}

      {discovery ? (
        <ProviderOverviewDiscoveryProgression
          model={discovery}
          onCaptureField={onCaptureRequirementField}
          onOpenIntelligence={onOpenIntelligence}
        />
      ) : (
        <ProviderOverviewPathwayRequirements
          requirements={model.requirements}
          onCaptureField={onCaptureRequirementField}
          onOpenIntelligence={onOpenIntelligence}
          onLogFieldIntel={onLogFieldIntel}
          followUpHref={followUpHref}
        />
      )}
    </section>
  );
}

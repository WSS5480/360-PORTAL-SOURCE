"use client";

import React from "react";
import {
  buildProviderOperationalReadinessFramework,
  type OperationalMotionReadiness,
  type OperationalReadinessPillarAssessment,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { PROTECT_FIELD_TIME_TITLE } from "@/lib/surgical-sales/protectFieldTimeVocabulary";

const MOTION_SECTION_HINT: Record<string, ProviderIntelligenceSectionId> = {
  observation: "observation_readiness",
  evaluation: "commercial_signals",
  commercialization: "commercial_signals",
};

function MotionCard({
  motion,
  isPrimary,
  onOpenSection,
}: {
  motion: OperationalMotionReadiness;
  isPrimary: boolean;
  onOpenSection: (sectionId: ProviderIntelligenceSectionId) => void;
}) {
  const sectionId = MOTION_SECTION_HINT[motion.motion] ?? "observation_readiness";

  return (
    <article
      className={`provider-ops-readiness-motion provider-ops-readiness-motion--${motion.verdict} provider-ops-readiness-motion--tone-${motion.tone}${isPrimary ? " provider-ops-readiness-motion--primary" : ""}`}
    >
      <header className="provider-ops-readiness-motion-head">
        <h4 className="provider-ops-readiness-motion-title">{motion.label}</h4>
        <span className={`provider-ops-readiness-motion-verdict provider-ops-readiness-motion-verdict--${motion.verdict}`}>
          {motion.verdictLabel}
        </span>
      </header>
      <p className="provider-ops-readiness-motion-headline">{motion.headline}</p>
      {motion.blockers.length > 0 ? (
        <ul className="provider-ops-readiness-motion-blockers">
          {motion.blockers.slice(0, 2).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="provider-ops-readiness-motion-link"
        onClick={() => onOpenSection(sectionId)}
      >
        {motion.verdict === "ready" ? "Review signals" : "Add context"}
      </button>
    </article>
  );
}

function PillarRow({ pillar }: { pillar: OperationalReadinessPillarAssessment }) {
  return (
    <li className={`provider-ops-readiness-pillar provider-ops-readiness-pillar--${pillar.posture}`}>
      <div className="provider-ops-readiness-pillar-head">
        <span className="provider-ops-readiness-pillar-label">{pillar.label}</span>
        <span className={`provider-ops-readiness-pillar-posture provider-ops-readiness-pillar-posture--${pillar.posture}`}>
          {pillar.postureLabel}
        </span>
      </div>
      <p className="provider-ops-readiness-pillar-scan">{pillar.scanLine}</p>
    </li>
  );
}

export function ProviderOperationalReadinessFrameworkPanel({
  contact,
  planning,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  onOpenSection,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  onOpenSection: (sectionId: ProviderIntelligenceSectionId) => void;
}) {
  const framework = React.useMemo(
    () =>
      buildProviderOperationalReadinessFramework({
        contact,
        relationshipStage,
        engagements,
        opportunities,
        cases,
      }),
    [contact, relationshipStage, engagements, opportunities, cases],
  );

  if (!planning) return null;

  return (
    <section
      className="provider-ops-readiness-framework provider-intel-card-layer--summary-band"
      aria-label={framework.title}
    >
      <header className="provider-ops-readiness-framework-head">
        <div>
          <h3 className="provider-ops-readiness-framework-title">{framework.title}</h3>
          <p className="provider-ops-readiness-framework-kicker">{framework.kicker}</p>
        </div>
        <div
          className={`provider-ops-readiness-verdict provider-ops-readiness-verdict--${framework.verdict.id}`}
          role="status"
        >
          <span className="provider-ops-readiness-verdict-label">{framework.verdict.label}</span>
          <p className="provider-ops-readiness-verdict-scan">{framework.verdict.scan}</p>
          {framework.verdict.nextVerdictLabel ? (
            <p className="provider-ops-readiness-verdict-next">
              Unlocks: {framework.verdict.nextVerdictLabel}
            </p>
          ) : null}
        </div>
        <p className="provider-ops-readiness-framework-guidance">{framework.fieldGuidance}</p>
      </header>

      <div
        className={`provider-ops-readiness-protect provider-ops-readiness-protect--${framework.protectFieldTime.posture}`}
        role="status"
        aria-label={PROTECT_FIELD_TIME_TITLE}
      >
        <div className="provider-ops-readiness-protect-head">
          <span className="provider-ops-readiness-protect-title">{PROTECT_FIELD_TIME_TITLE}</span>
          <span className="provider-ops-readiness-protect-score">
            {framework.protectFieldTime.protectionScore}% protected
          </span>
        </div>
        <p className="provider-ops-readiness-protect-posture">
          {framework.protectFieldTime.postureLabel}
        </p>
        <ul className="provider-ops-readiness-protect-dims" aria-label="Field time threat checks">
          {framework.protectFieldTime.dimensions.map((dim) => (
            <li
              key={dim.id}
              className={`provider-ops-readiness-protect-dim provider-ops-readiness-protect-dim--${dim.level}`}
            >
              <span className="provider-ops-readiness-protect-dim-label">{dim.label}</span>
              <span className="provider-ops-readiness-protect-dim-level">{dim.levelLabel}</span>
            </li>
          ))}
        </ul>
        {framework.protectFieldTime.deploymentRecommendation ? (
          <p className="provider-ops-readiness-protect-deploy">
            {framework.protectFieldTime.deploymentRecommendation}
          </p>
        ) : null}
      </div>

      <div className="provider-ops-readiness-motion-grid">
        {framework.motions.map((motion) => (
          <MotionCard
            key={motion.motion}
            motion={motion}
            isPrimary={motion.motion === framework.primaryFocusMotion}
            onOpenSection={onOpenSection}
          />
        ))}
      </div>

      <details className="provider-ops-readiness-pillars-details">
        <summary className="provider-ops-readiness-pillars-summary">Readiness pillars</summary>
        <ul className="provider-ops-readiness-pillar-list">
          {framework.pillars.map((pillar) => (
            <PillarRow key={pillar.id} pillar={pillar} />
          ))}
        </ul>
      </details>
    </section>
  );
}

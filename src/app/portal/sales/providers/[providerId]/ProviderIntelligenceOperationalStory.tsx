"use client";

import React from "react";
import {
  buildProviderIntelligenceOperationalStory,
  PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS,
  type ProviderIntelligenceOperationalStory,
  type ProviderIntelligenceStoryCta,
  type ProviderIntelligenceStoryTone,
} from "@/lib/surgical-sales/buildProviderIntelligenceOperationalStory";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

function toneClass(prefix: string, tone: ProviderIntelligenceStoryTone): string {
  return `${prefix} ${prefix}--${tone}`;
}

function StoryCtaButton({
  cta,
  onCapture,
}: {
  cta: ProviderIntelligenceStoryCta;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  return (
    <button
      type="button"
      className="provider-intel-story-cta"
      onClick={() => onCapture(cta.sectionId, cta.dbKey)}
    >
      {cta.label}
    </button>
  );
}

function stepUsesEmphasisCard(
  variant: "risk" | "action" | "unlock",
  tone: ProviderIntelligenceStoryTone,
): boolean {
  if (variant === "unlock") return false;
  if (variant === "risk") return tone === "danger" || tone === "warn" || tone === "caution";
  return tone === "danger" || tone === "warn";
}

function StoryStep({
  rank,
  label,
  headline,
  scan,
  tone,
  cta,
  onCapture,
  variant,
}: {
  rank: number;
  label: string;
  headline: string;
  scan: string;
  tone: ProviderIntelligenceStoryTone;
  cta?: ProviderIntelligenceStoryCta | null;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  variant: "risk" | "action" | "unlock";
}) {
  const emphasized = stepUsesEmphasisCard(variant, tone);

  return (
    <li
      className={[
        `provider-intel-story-step provider-intel-story-step--${variant}`,
        toneClass("provider-intel-story-step", tone),
        emphasized ? "provider-intel-story-step--emphasized" : "provider-intel-story-step--quiet",
      ].join(" ")}
    >
      {emphasized ? (
        <div className="provider-intel-story-step-rank" aria-hidden>
          {rank}
        </div>
      ) : null}
      <div className="provider-intel-story-step-body">
        <p className="provider-intel-story-step-label">{label}</p>
        <p className="provider-intel-story-step-headline">{headline}</p>
        <p className="provider-intel-story-step-scan">{scan}</p>
        {cta ? (
          emphasized ? (
            <StoryCtaButton cta={cta} onCapture={onCapture} />
          ) : (
            <button
              type="button"
              className="provider-intel-story-link-cta"
              onClick={() => onCapture(cta.sectionId, cta.dbKey)}
            >
              {cta.label}
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

function OperationalStoryBody({
  story,
  onCapture,
}: {
  story: ProviderIntelligenceOperationalStory;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  const { operationalState, deploymentRisk, leverageAction, unlocksNext } = story;

  return (
    <section className="provider-intel-operational-story" aria-label="Operational story">
      <header className="provider-intel-story-head">
        <span className="provider-intel-story-lane">{story.laneLabel}</span>
      </header>

      <div className={toneClass("provider-intel-story-primary", operationalState.tone)}>
        <p className="provider-intel-story-primary-label">{operationalState.label}</p>
        <h2 className="provider-intel-story-primary-headline">{operationalState.headline}</h2>
        <p className="provider-intel-story-primary-scan">{operationalState.scan}</p>
      </div>

      <ol className="provider-intel-story-ladder" aria-label="Operational priorities">
        <StoryStep
          rank={2}
          label={deploymentRisk.label}
          headline={deploymentRisk.headline}
          scan={deploymentRisk.scan}
          tone={deploymentRisk.tone}
          cta={deploymentRisk.cta}
          onCapture={onCapture}
          variant="risk"
        />
        <StoryStep
          rank={3}
          label={leverageAction.label}
          headline={leverageAction.headline}
          scan={leverageAction.scan}
          tone={leverageAction.tone}
          cta={leverageAction.cta}
          onCapture={onCapture}
          variant="action"
        />
        {unlocksNext ? (
          <StoryStep
            rank={4}
            label={unlocksNext.label}
            headline={unlocksNext.headline}
            scan={unlocksNext.scan}
            tone="neutral"
            onCapture={onCapture}
            variant="unlock"
          />
        ) : null}
      </ol>
    </section>
  );
}

export function ProviderIntelligenceOperationalStory({
  contact,
  planning,
  specialty,
  relationshipStage,
  engagements,
  opportunities,
  cases,
  onCapture,
}: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  onCapture: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
}) {
  const story = React.useMemo(
    () =>
      buildProviderIntelligenceOperationalStory({
        contact,
        planning,
        specialty,
        relationshipStage,
        engagements,
        opportunities,
        cases,
      }),
    [contact, planning, specialty, relationshipStage, engagements, opportunities, cases],
  );

  if (!story) return null;

  return <OperationalStoryBody story={story} onCapture={onCapture} />;
}

export function useProviderIntelligenceOperationalStory(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderIntelligenceOperationalStory | null {
  return React.useMemo(
    () => buildProviderIntelligenceOperationalStory(input),
    [
      input.contact,
      input.planning,
      input.specialty,
      input.relationshipStage,
      input.engagements,
      input.opportunities,
      input.cases,
    ],
  );
}

export { PROVIDER_INTELLIGENCE_STORY_LAYER_LABELS };

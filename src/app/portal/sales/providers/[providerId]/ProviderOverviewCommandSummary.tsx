"use client";

import Link from "next/link";
import type { ProviderOverviewCommandSummary } from "@/lib/surgical-sales/buildProviderOverviewCommandSummary";
import type { FieldDeploymentAnswer } from "@/lib/surgical-sales/buildProviderFieldDeploymentBriefing";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  PROVIDER_DEPLOYMENT_BRIEFING_KICKER,
  PROVIDER_DEPLOYMENT_BRIEFING_TITLE,
  PROVIDER_DEPLOYMENT_DIRECTIVE_LABEL,
  PROVIDER_OVERVIEW_COMMAND_ARIA,
  PROVIDER_OVERVIEW_KNOWN_SO_FAR_TITLE,
  PROVIDER_OVERVIEW_PLATFORM_EYEBROW,
} from "@/lib/surgical-sales/providerOverviewVocabulary";

function DeploymentAnswerCard({
  answer,
  onOpen,
  onOpenDiscoveryPriorities,
}: {
  answer: FieldDeploymentAnswer;
  onOpen: (sectionId: ProviderIntelligenceSectionId, dbKey?: string) => void;
  onOpenDiscoveryPriorities: () => void;
}) {
  return (
    <article
      className={`provider-deploy-answer provider-deploy-answer--${answer.tone}${answer.id === "next_move" ? " provider-deploy-answer--primary" : ""}`}
    >
      <h3 className="provider-deploy-answer-question">{answer.question}</h3>
      <p className="provider-deploy-answer-text">{answer.answer}</p>
      {answer.bullets.length > 0 ? (
        <ul className="provider-deploy-answer-bullets">
          {answer.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {answer.actionLabel ? (
        <button
          type="button"
          className="provider-deploy-answer-action"
          onClick={() => {
            if (answer.openDiscoveryPriorities) {
              onOpenDiscoveryPriorities();
            } else if (answer.sectionId) {
              onOpen(answer.sectionId, answer.dbKey ?? undefined);
            }
          }}
        >
          {answer.actionLabel}
        </button>
      ) : null}
    </article>
  );
}

export function ProviderOverviewCommandSummaryPanel({
  summary,
  primaryActionHref,
  primaryActionLabel,
  onOpenIntelligence,
  onOpenDiscoveryPriorities,
}: {
  summary: ProviderOverviewCommandSummary;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  onOpenIntelligence: (sectionId?: string, dbKey?: string) => void;
  onOpenDiscoveryPriorities: () => void;
}) {
  const deployment = summary.deployment;
  if (!deployment) return null;

  const openSection = (sectionId?: string, dbKey?: string) => {
    if (sectionId) onOpenIntelligence(sectionId, dbKey);
    else onOpenIntelligence();
  };

  return (
    <section
      className={`provider-deploy-briefing provider-ops-ops-panel provider-ops-ops-panel--surgical provider-deploy-briefing--${summary.tone}`}
      aria-label={PROVIDER_OVERVIEW_COMMAND_ARIA}
    >
      <header className="provider-deploy-briefing-head">
        <div className="provider-deploy-briefing-head-main">
          <span className="provider-ops-platform-eyebrow">{PROVIDER_OVERVIEW_PLATFORM_EYEBROW}</span>
          <h2 className="provider-deploy-briefing-title">{PROVIDER_DEPLOYMENT_BRIEFING_TITLE}</h2>
          <p className="provider-deploy-briefing-kicker">{PROVIDER_DEPLOYMENT_BRIEFING_KICKER}</p>
        </div>
        <div className="provider-deploy-briefing-badges">
          <span className="provider-deploy-lane-badge">{deployment.laneLabel}</span>
          <span
            className={`provider-deploy-protect-badge provider-deploy-protect-badge--${deployment.protectFieldTime.posture}`}
          >
            {deployment.protectFieldTime.postureLabel}
          </span>
        </div>
      </header>

      <div className="provider-deploy-directive" role="status">
        <span className="provider-deploy-directive-label">{PROVIDER_DEPLOYMENT_DIRECTIVE_LABEL}</span>
        <p className="provider-deploy-directive-text">{deployment.directive}</p>
      </div>

      {deployment.knownSoFar.length > 0 ? (
        <div className="provider-deploy-known" aria-label={PROVIDER_OVERVIEW_KNOWN_SO_FAR_TITLE}>
          <h3 className="provider-deploy-known-title">{PROVIDER_OVERVIEW_KNOWN_SO_FAR_TITLE}</h3>
          <ul className="provider-deploy-known-list">
            {deployment.knownSoFar.map((line) => (
              <li key={line} className="provider-deploy-known-item">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="provider-deploy-answers">
        {deployment.answers.map((answer) => (
          <DeploymentAnswerCard
            key={answer.id}
            answer={answer}
            onOpen={openSection}
            onOpenDiscoveryPriorities={onOpenDiscoveryPriorities}
          />
        ))}
      </div>

      <footer className="provider-deploy-primary-move">
        <span className="provider-deploy-primary-move-label">{deployment.primaryActionLabel}</span>
        {primaryActionHref ? (
          <Link href={primaryActionHref} className="provider-deploy-primary-move-link">
            {primaryActionLabel ?? deployment.primaryActionScan}
          </Link>
        ) : (
          <p className="provider-deploy-primary-move-text">{deployment.primaryActionScan}</p>
        )}
      </footer>
    </section>
  );
}

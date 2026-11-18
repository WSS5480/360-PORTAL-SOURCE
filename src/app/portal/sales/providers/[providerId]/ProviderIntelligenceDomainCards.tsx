"use client";

import React from "react";
import type { IntelligenceDomainCardView } from "@/lib/surgical-sales/buildProviderIntelligenceDomainView";
import { INTELLIGENCE_DOMAIN_LOCKED_MESSAGE } from "@/lib/surgical-sales/buildProviderIntelligenceDomainView";
import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { DiscoveryDomainIcon } from "./DiscoveryDomainIcon";

function TraceSourceLabel({ source }: { source: IntelligenceDomainCardView["knownFacts"][0]["source"] }) {
  const kindLabel =
    source.kind === "engagement"
      ? "Engagement"
      : source.kind === "observation"
        ? "Observation"
        : source.kind === "debrief"
          ? "Debrief"
          : source.kind === "case"
            ? "Case"
            : "Note";

  return (
    <span className="dig-domain-card__trace">
      {kindLabel}: {source.label}
    </span>
  );
}

function DomainFactList({
  facts,
  title,
}: {
  facts: IntelligenceDomainCardView["knownFacts"];
  title: string;
}) {
  if (facts.length === 0) return null;

  return (
    <section className="dig-domain-card__section" aria-label={title}>
      <h3 className="dig-domain-card__section-title">{title}</h3>
      <ul className="dig-domain-card__fact-list">
        {facts.map((fact) => (
          <li key={fact.id} className="dig-domain-card__fact">
            <span className="dig-domain-card__fact-label">{fact.label}</span>
            <span className="dig-domain-card__fact-value">{fact.value}</span>
            <TraceSourceLabel source={fact.source} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function IntelligenceDomainCard({ domain }: { domain: IntelligenceDomainCardView }) {
  return (
    <article
      className={`dig-domain-card dig-domain-card--${domain.stateId}`}
      data-domain-state={domain.stateId}
      aria-labelledby={`dig-domain-title-${domain.id}`}
    >
      <header className="dig-domain-card__header">
        <div className="dig-domain-card__header-main">
          <DiscoveryDomainIcon groupId={domain.id} />
          <div className="dig-domain-card__titles">
            <h2 id={`dig-domain-title-${domain.id}`} className="dig-domain-title">
              {domain.title}
            </h2>
            <p className="dig-domain-purpose">{domain.purpose}</p>
          </div>
        </div>
      </header>

      <div className="dig-domain-card__body">
        {domain.stateId === "locked" ? (
          <p className="dig-domain-card__locked-message">{INTELLIGENCE_DOMAIN_LOCKED_MESSAGE}</p>
        ) : null}

        {domain.stateId === "building" ? (
          <>
            <DomainFactList facts={domain.knownFacts} title="Known facts" />
            {domain.unknowns.length > 0 ? (
              <section className="dig-domain-card__section" aria-label="Remaining unknowns">
                <h3 className="dig-domain-card__section-title">Remaining unknowns</h3>
                <ul className="dig-domain-card__unknown-list">
                  {domain.unknowns.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {domain.learningObjective ? (
              <section className="dig-domain-card__section" aria-label="Suggested next learning objective">
                <h3 className="dig-domain-card__section-title">Suggested next learning objective</h3>
                <p className="dig-domain-card__objective">{domain.learningObjective}</p>
              </section>
            ) : null}
          </>
        ) : null}

        {domain.stateId === "validated" ? (
          <>
            <DomainFactList facts={domain.confirmedFindings} title="Confirmed findings" />
            {domain.supportingObservations.length > 0 ? (
              <section className="dig-domain-card__section" aria-label="Supporting observations">
                <h3 className="dig-domain-card__section-title">Supporting observations</h3>
                <ul className="dig-domain-card__observation-list">
                  {domain.supportingObservations.map((observation) => (
                    <li key={observation.id} className="dig-domain-card__observation">
                      <p className="dig-domain-card__observation-quote">&ldquo;{observation.quote}&rdquo;</p>
                      <TraceSourceLabel source={observation.source} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

export function ProviderIntelligenceDomainCards({
  domains,
}: {
  domains: IntelligenceDomainCardView[];
}) {
  if (domains.length === 0) return null;

  return (
    <div className="dig-domains-grid" role="list" aria-label={DISCOVERY_INTELLIGENCE_UI.briefingDomainsTitle}>
      {domains.map((domain) => (
        <IntelligenceDomainCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

"use client";

import { PROVIDER_OVERVIEW_CONFIRMED_FACTS_EMPTY } from "@/lib/surgical-sales/buildProviderOverviewConfirmedFacts";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function ProviderOverviewWhatWeKnow({
  facts,
  nested = false,
}: {
  facts: string[];
  nested?: boolean;
}) {
  const body =
    facts.length === 0 ? (
      <p className="pov-bottom-accordion__empty">{PROVIDER_OVERVIEW_CONFIRMED_FACTS_EMPTY}</p>
    ) : (
      <ul className="pov-what-we-know__list">
        {facts.map((fact) => (
          <li key={fact} className="pov-what-we-know__item">
            <span className="pov-what-we-know__mark" aria-hidden>
              ✓
            </span>
            <span className="pov-what-we-know__text">{fact}</span>
          </li>
        ))}
      </ul>
    );

  if (nested) {
    return (
      <section className="pov-supporting-subsection pov-what-we-know" data-testid="pov-what-we-know">
        <h4 className="pov-supporting-subsection__title">{PROVIDER_FIELD_OPS_SECTION.whatWeKnow}</h4>
        {body}
      </section>
    );
  }

  return (
    <details
      className="pov-bottom-accordion pov-what-we-know"
      data-testid="pov-what-we-know"
      aria-label={PROVIDER_FIELD_OPS_SECTION.whatWeKnow}
    >
      <summary className="pov-bottom-accordion__summary">What we know</summary>
      <div className="pov-bottom-accordion__body">{body}</div>
    </details>
  );
}

"use client";

import Link from "next/link";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { PROVIDER_INTELLIGENCE_LAYER_LABEL } from "@/lib/surgical-sales/intelligenceLayerArchitecture";

export function KnownIntelligenceCard({
  intelligence,
  providerHref,
}: {
  intelligence: PrepareKnownIntelligence;
  providerHref: string | null;
}) {
  const { bullets, last_key_insight } = intelligence;
  const hasBullets = bullets.length > 0;

  return (
    <section className="pfm-intel" aria-labelledby="pfm-intel">
      <h2 id="pfm-intel" className="pfm-intel-title">
        {PROVIDER_INTELLIGENCE_LAYER_LABEL}
      </h2>
      <p className="pfm-intel-sub">From the provider profile — not this visit&apos;s tactical prep.</p>

      {hasBullets ? (
        <ul className="pfm-intel-bullets">
          {bullets.map((row) => (
            <li key={row.key}>
              <span className="pfm-intel-bullet-label">{row.label}</span>
              <span className="pfm-intel-bullet-value">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pfm-intel-empty">
          Operational visibility limited — nothing validated for this engagement yet.{" "}
          {providerHref ? (
            <Link href={`${providerHref}?tab=intelligence`} className="pfm-intel-inline-link">
              Add on provider profile
            </Link>
          ) : null}
        </p>
      )}

      {last_key_insight ? (
        <div className="pfm-intel-insight" aria-label="Last key insight">
          <div className="pfm-intel-insight-head">
            <span className="pfm-intel-insight-label">Last key insight</span>
            <span className="pfm-intel-insight-meta">
              {last_key_insight.source_label}
              {last_key_insight.at_label ? ` · ${last_key_insight.at_label}` : ""}
            </span>
          </div>
          <p className="pfm-intel-insight-body">
            {last_key_insight.href ? (
              <Link href={last_key_insight.href}>{last_key_insight.body}</Link>
            ) : (
              last_key_insight.body
            )}
          </p>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { buildProviderWhatMattersNow } from "@/lib/surgical-sales/buildProviderWhatMattersNow";
import { PROVIDER_FIELD_PRIORITIES_TITLE } from "@/lib/surgical-sales/legacyIntelligenceUserCopy";
import type { ProviderProfilePayload } from "./providerProfileTypes";

export function ProviderWhatMattersNow({
  data,
  providerId,
  newEngagementHref,
  intelligenceHref,
  createOpportunityHref,
  showNextAction = true,
  tier = "inline",
}: {
  data: ProviderProfilePayload;
  providerId: string;
  newEngagementHref: string;
  intelligenceHref: string;
  createOpportunityHref?: string;
  /** When false, next step is rendered in the overview primary band. */
  showNextAction?: boolean;
  tier?: "inline" | "primary";
}) {
  const p = data.provider!;
  const allBullets = buildProviderWhatMattersNow({
    providerId,
    relationshipStage: String(p.provider_relationship_stage || "early_discovery"),
    newEngagementHref,
    intelligenceHref,
    createOpportunityHref,
    engagements: data.engagements || [],
    activity_timeline: data.activity_timeline || [],
    planning: data.planning_completion,
    cases: data.cases || [],
    opportunities: data.opportunities || [],
    contact: p,
  });
  const bullets = showNextAction ? allBullets : allBullets.filter((b) => !b.isNextAction);

  if (bullets.length === 0) return null;

  return (
    <section
      className={`provider-wmn${tier === "primary" ? " provider-wmn--primary" : ""}`}
      aria-labelledby="provider-wmn-title"
    >
      <h2 id="provider-wmn-title" className="provider-wmn-title">
        {PROVIDER_FIELD_PRIORITIES_TITLE}
      </h2>
      <ul className="provider-wmn-list">
        {bullets.map((bullet) => (
          <li
            key={bullet.id}
            className={`provider-wmn-item${bullet.isNextAction ? " provider-wmn-item--next" : ""}`}
          >
            {bullet.isNextAction && bullet.href && bullet.actionLabel ? (
              <>
                <span className="provider-wmn-next-label">Next recommended action:</span>{" "}
                <Link href={bullet.href} className="provider-wmn-next-action">
                  {bullet.actionLabel}
                </Link>
              </>
            ) : (
              <span>{bullet.text}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

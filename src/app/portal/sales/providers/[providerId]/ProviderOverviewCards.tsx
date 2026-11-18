"use client";

import Link from "next/link";
import type { ProviderOverviewGuidanceCard } from "@/lib/surgical-sales/buildProviderOverviewGuidanceCards";

const NEXT_MOVE_LABEL = "Next move:";

export function ProviderOverviewGuidanceCardView({ card }: { card: ProviderOverviewGuidanceCard }) {
  const nextMoveBody = card.ctaHref ? (
    <Link href={card.ctaHref} className="pov-guidance-next-link">
      {card.nextMove}
    </Link>
  ) : (
    <span className="pov-guidance-next-text">{card.nextMove}</span>
  );

  return (
    <article
      className={`pov-guidance-card pov-guidance-card--${card.kind}`}
      aria-labelledby={`pov-guidance-${card.id}`}
    >
      <span className="pov-guidance-eyebrow">{card.eyebrow}</span>
      <h3 id={`pov-guidance-${card.id}`} className="pov-guidance-headline">
        {card.headline}
      </h3>
      {card.explanation ? <p className="pov-guidance-explanation">{card.explanation}</p> : null}
      {card.nextMove ? (
        <p className="pov-guidance-next">
          <span className="pov-guidance-next-label">{NEXT_MOVE_LABEL}</span>
          {nextMoveBody}
        </p>
      ) : null}
    </article>
  );
}

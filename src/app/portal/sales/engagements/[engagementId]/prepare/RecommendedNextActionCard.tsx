"use client";

import Link from "next/link";
import type { PrepareRecommendedNextActions } from "@/lib/surgical-sales/engagements/prepareForMeetingRecommendedNextAction";

export function RecommendedNextActionCard({
  recommended,
}: {
  recommended: PrepareRecommendedNextActions;
}) {
  const { actions, primary_cta } = recommended;

  return (
    <section className="pfm-next" aria-labelledby="pfm-next">
      <h2 id="pfm-next" className="pfm-next-title">
        Recommended next action
      </h2>

      {actions.length > 0 ? (
        <ul className="pfm-next-list">
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      ) : (
        <p className="pfm-next-empty">No next actions suggested for this context.</p>
      )}

      <Link href={primary_cta.href} className="pfm-next-cta">
        {primary_cta.label}
      </Link>

      <p className="pfm-next-footnote">Rule-based suggestions — not AI generated.</p>
    </section>
  );
}

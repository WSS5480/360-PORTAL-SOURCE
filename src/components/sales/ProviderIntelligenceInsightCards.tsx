"use client";

import React from "react";
import {
  buildProviderIntelligenceInsightCards,
  type RepIntelligenceInsightCard,
  type RepIntelligencePreviewStatus,
  withRepInsightCategoryTitles,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

const insightCardsCss = `
.provider-intel-insights{display:grid;gap:8px}
.provider-intel-insight-card{
  display:grid;gap:4px;padding:10px 12px;border-radius:10px;
  border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));
  background:color-mix(in srgb,var(--foreground) 2%,var(--surface));
}
.provider-intel-insight-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.provider-intel-insight-title{margin:0;font-size:12px;font-weight:850;line-height:1.3;color:var(--foreground)}
.provider-intel-insight-detail{margin:0;font-size:12px;line-height:1.45;color:color-mix(in srgb,var(--foreground) 78%,var(--muted))}
.provider-intel-insight-status{
  flex-shrink:0;font-size:9px;font-weight:800;padding:2px 7px;border-radius:999px;white-space:nowrap;letter-spacing:.03em;text-transform:uppercase
}
.provider-intel-insight-status--confirmed{color:#166534;border:1px solid color-mix(in srgb,var(--success) 28%,var(--border));background:color-mix(in srgb,var(--success) 8%,var(--surface))}
.provider-intel-insight-status--likely{color:var(--brand-700);border:1px solid color-mix(in srgb,var(--brand-600) 24%,var(--border));background:color-mix(in srgb,var(--brand-600) 8%,var(--surface))}
.provider-intel-insight-status--needs{color:#92400e;border:1px solid color-mix(in srgb,#f59e0b 28%,var(--border));background:color-mix(in srgb,#f59e0b 10%,var(--surface))}
.provider-intel-insight-status--unknown{color:var(--muted);border:1px solid color-mix(in srgb,var(--foreground) 12%,var(--border));background:color-mix(in srgb,var(--foreground) 4%,var(--surface))}
`;

function statusClass(status: RepIntelligencePreviewStatus): string {
  if (status === "Confirmed") return "provider-intel-insight-status--confirmed";
  if (status === "Likely") return "provider-intel-insight-status--likely";
  if (status === "Needs validation") return "provider-intel-insight-status--needs";
  return "provider-intel-insight-status--unknown";
}

function InsightCard({ card }: { card: RepIntelligenceInsightCard }) {
  return (
    <article className="provider-intel-insight-card" aria-label={`${card.title}: ${card.detail}`}>
      <div className="provider-intel-insight-head">
        <h4 className="provider-intel-insight-title">{card.title}</h4>
        <span className={`provider-intel-insight-status ${statusClass(card.status)}`}>{card.status}</span>
      </div>
      <p className="provider-intel-insight-detail">{card.detail}</p>
    </article>
  );
}

export function ProviderIntelligenceInsightCards({
  contact,
  planning,
  cards: cardsOverride,
  maxCards,
  useCategoryTitles = false,
}: {
  contact?: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  cards?: RepIntelligenceInsightCard[];
  maxCards?: number;
  /** When true, card titles use Clinical interest / Fit validation / etc. */
  useCategoryTitles?: boolean;
}) {
  const view = React.useMemo(() => {
    if (cardsOverride?.length) {
      const cards = useCategoryTitles ? withRepInsightCategoryTitles(cardsOverride) : cardsOverride;
      return { cards, hasContent: true };
    }
    if (!contact) return { cards: [], hasContent: false };
    const built = buildProviderIntelligenceInsightCards(contact, { planning, maxCards });
    const cards = useCategoryTitles ? withRepInsightCategoryTitles(built.cards) : built.cards;
    return { cards, hasContent: cards.length > 0 };
  }, [cardsOverride, contact, maxCards, planning, useCategoryTitles]);

  if (!view.hasContent) return null;

  return (
    <div className="provider-intel-insights">
      <style dangerouslySetInnerHTML={{ __html: insightCardsCss }} />
      {view.cards.map((card) => (
        <InsightCard key={card.id} card={card} />
      ))}
    </div>
  );
}

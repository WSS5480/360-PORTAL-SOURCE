/**
 * Cross-engine review card dedupe — prefer UF over DIP when keys match (Phase 1).
 */

import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import {
  isClinicalFocusReviewCard,
  isProductIntelligenceReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import { discoveryIntelligenceDebug } from "@/lib/surgical-sales/discoveryIntelligenceDebug";
import {
  dedupeDebriefActionableReviewCards,
  procedureReviewDedupeKey,
  productReviewDedupeKey,
} from "@/lib/surgical-sales/debriefReviewIntelligenceDedup";

function reviewCardCrossEngineKey(card: DebriefActionableReviewCard): string | null {
  if (card.category === "workflow_participant") {
    const person = card.headline.trim().split(/\s+/)[0]?.toLowerCase() ?? "unknown";
    const role = (card.roleValue ?? "scheduling coordinator").trim().toLowerCase();
    return `workflow_participant:${person}:${role}`;
  }
  if (isProductIntelligenceReviewCard(card)) {
    if (/interest/i.test(card.evidenceStatus)) {
      return "product_interest";
    }
    return productReviewDedupeKey(card.productName);
  }
  if (isClinicalFocusReviewCard(card)) {
    const procedure = card.clinicalProcedureFocus ?? card.headline ?? "";
    const trend = card.clinicalDisplayValue ?? "";
    return `clinical:${procedureReviewDedupeKey(procedure)}:${procedureReviewDedupeKey(trend || procedure)}`;
  }
  return null;
}

function isUfSourcedCard(card: DebriefActionableReviewCard): boolean {
  return card.id.startsWith("uf:");
}

function productCardNameSpecificity(card: DebriefActionableReviewCard): number {
  if (!isProductIntelligenceReviewCard(card)) return 0;
  const blob = `${card.productName} ${card.headline}`.trim();
  if (/\bACSIS\b/i.test(blob)) return 3;
  if (/\b(?:product interest|product feature interest|product setup|learning-curve question|product)\b/i.test(card.productName)) {
    return 0;
  }
  return card.productName.trim().length > 3 ? 2 : 1;
}

export function dedupeReviewDisplayCards(
  cards: DebriefActionableReviewCard[],
  dictation?: string,
): DebriefActionableReviewCard[] {
  const byKey = new Map<string, DebriefActionableReviewCard>();
  let droppedDipDuplicates = 0;

  for (const card of cards) {
    const key = reviewCardCrossEngineKey(card);
    if (!key) {
      byKey.set(`${card.category}|${card.id}`, card);
      continue;
    }

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, card);
      continue;
    }

    if (isProductIntelligenceReviewCard(card) && isProductIntelligenceReviewCard(existing)) {
      const cardSpecificity = productCardNameSpecificity(card);
      const existingSpecificity = productCardNameSpecificity(existing);
      if (cardSpecificity !== existingSpecificity) {
        byKey.set(key, cardSpecificity > existingSpecificity ? card : existing);
        if (isUfSourcedCard(card) !== isUfSourcedCard(existing)) droppedDipDuplicates += 1;
        continue;
      }
    }

    if (isUfSourcedCard(card) && !isUfSourcedCard(existing)) {
      byKey.set(key, card);
      droppedDipDuplicates += 1;
      discoveryIntelligenceDebug("parity:review:dup_drop_dip", {
        dedupeKey: key,
        droppedCardId: existing.id,
        keptCardId: card.id,
      });
      continue;
    }

    if (!isUfSourcedCard(card) && isUfSourcedCard(existing)) {
      droppedDipDuplicates += 1;
      discoveryIntelligenceDebug("parity:review:dup_drop_dip", {
        dedupeKey: key,
        droppedCardId: card.id,
        keptCardId: existing.id,
      });
      continue;
    }

    byKey.set(key, card);
  }

  if (droppedDipDuplicates > 0) {
    discoveryIntelligenceDebug("composeDebriefReviewDisplay:dedupe", {
      droppedDipDuplicateCards: droppedDipDuplicates,
    });
  }

  const merged = [...byKey.values()];
  return dedupeDebriefActionableReviewCards(merged, dictation);
}

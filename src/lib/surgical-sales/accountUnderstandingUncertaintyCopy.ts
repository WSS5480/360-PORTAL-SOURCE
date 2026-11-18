/**

 * Rep-facing copy for Understanding tab uncertainty cards — one unknown per card.

 */



import { discoveryPriorityWhyItMatters } from "@/lib/surgical-sales/providerDiscoveryPriorityNarrative";

import { intelligenceGapBestSource } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";

import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";

import {
  FIELD_SALES_STILL_NEED,
  fieldSalesPrimaryUnknown,
} from "@/lib/surgical-sales/providerFieldSalesCopy";
import {
  ACCOUNT_UNDERSTANDING_AREAS,
  type AccountUnderstandingAreaId,
} from "@/lib/surgical-sales/providerAccountUnderstanding";
import { ACCOUNT_UNDERSTANDING_CARD } from "@/lib/surgical-sales/providerAccountUnderstanding";



const WHY_MAX = 120;

const SOURCE_MAX = 72;



function sanitizeRepCopy(text: string): string {

  return text

    .replace(/\bcaptur(e|ing)\s+intelligence\b/gi, "confirming")

    .replace(/\bsignal(s)?\b/gi, "")

    .replace(/\bframework\b/gi, "")

    .replace(/\bleverage\b/gi, "")

    .replace(/\bunlock(s)?\b/gi, "")

    .replace(/\bapproval authority\b/gi, "who approves evaluations")

    .replace(/\bengagement responsiveness\b/gi, "office response time")

    .replace(/\bprocedural influence\b/gi, "who influences cases")

    .replace(/\binternal advocate\b/gi, "internal vendor support")

    .replace(/\baccess rhythm\b/gi, "follow-up between visits")

    .replace(/\bevaluation posture\b/gi, "trial willingness")

    .replace(/\bcommercialization\b/gi, "trial and adoption")

    .replace(/\s{2,}/g, " ")

    .trim();

}



export function accountUnderstandingPrimaryUnknown(gap: IntelligenceLearningGap): string {
  return fieldSalesPrimaryUnknown(gap.dbKey);
}

const BEST_PERSON_BY_AREA: Record<AccountUnderstandingAreaId, string> = {
  operational: "OR scheduler or materials manager",
  workflow: "Surgeon, fellow, or scrub lead on their cases",
  relationship: "Office manager or the surgeon's coordinator",
  commercial: "Surgeon or supply chain lead on the account",
  field_readiness: "OR scheduler or credentialing contact",
};

export function accountUnderstandingStillNeed(
  gap: IntelligenceLearningGap | null,
  areaId: AccountUnderstandingAreaId,
): string {
  if (gap) {
    const clause =
      FIELD_SALES_STILL_NEED[gap.dbKey] ??
      fieldSalesPrimaryUnknown(gap.dbKey)
        .replace(/\s+(?:is still unknown|still unclear|not confirmed yet)\.?$/i, "")
        .replace(/^Whether\s+/i, "")
        .replace(/^What\s+/i, "what ")
        .replace(/^Who\s+/i, "who ")
        .replace(/^How\s+/i, "how ")
        .replace(/^Which\s+/i, "which ");
    const trimmed = clause.trim().replace(/\.$/, "");
    return `Still need to confirm: ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
  }
  return `Validate on next touch: ${ACCOUNT_UNDERSTANDING_AREAS[areaId].hint}`;
}

export function accountUnderstandingBestPerson(
  gap: IntelligenceLearningGap | null,
  areaId: AccountUnderstandingAreaId,
): string {
  if (gap) {
    const source = accountUnderstandingBestSource(gap).trim();
    if (source.length > 4) return source;
  }
  return BEST_PERSON_BY_AREA[areaId];
}



export function accountUnderstandingWhyItMatters(gap: IntelligenceLearningGap): string {

  const fromGap = sanitizeRepCopy(

    gap.operationalConsequence?.summary?.trim() || gap.operationalImpact?.trim() || "",

  );

  if (fromGap.length >= 18) return fromGap.slice(0, WHY_MAX);



  const fromDiscovery = sanitizeRepCopy(discoveryPriorityWhyItMatters(gap.dbKey));

  if (fromDiscovery.length >= 18) return fromDiscovery.slice(0, WHY_MAX);



  return "You may lose the case day if this is wrong.";

}



export function accountUnderstandingBestSource(gap: IntelligenceLearningGap): string {

  return intelligenceGapBestSource(gap.dbKey, gap.sectionId).slice(0, SOURCE_MAX);

}



export function accountUnderstandingNextMove(gap: IntelligenceLearningGap): string {

  const revalidate = gap.state === "outdated";

  return intelligenceContextualCaptureCta(gap.dbKey, { revalidate });

}

/** Primary line on the capture action row */
import {
  buildSectionOperationalMappingProgress,
  intelligenceMappingCtaLabel,
} from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

export const ACCOUNT_UNDERSTANDING_CAPTURE_LABEL = ACCOUNT_UNDERSTANDING_CARD.captureIntelligence;

export function accountUnderstandingMappingCta(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  confidence?: IntelligenceSectionConfidence,
): string {
  const progress = buildSectionOperationalMappingProgress(sectionId, contact, {
    planning,
    confidence,
  });
  return intelligenceMappingCtaLabel(progress);
}

/** Helper text tied to best source on the card */
export function accountUnderstandingCaptureHelper(bestSource: string, nextMove?: string): string {
  const source = bestSource.trim().toLowerCase();

  if (source.includes("scheduler") || source.includes("coordinator")) {
    return "Log what you learned from the scheduler or office.";
  }
  if (source.includes("credentialing") || source.includes("materials manager")) {
    return "Log what credentialing or materials shared about vendor access.";
  }
  if (source.includes("scrub") || source.includes("nurse") || source.includes("circulating")) {
    return "Log what OR staff told you on the case floor.";
  }
  if (source.includes("surgeon") && !source.includes("office")) {
    return "Log what the surgeon or their office shared on your last touch.";
  }
  if (source.includes("office manager") || source.includes("practice manager")) {
    return "Log what the office shared on response time and next steps.";
  }
  if (source.includes("supply")) {
    return "Log what supply chain shared about who decides in the room.";
  }

  if (source) {
    const phrase = bestSource.trim().charAt(0).toLowerCase() + bestSource.trim().slice(1);
    return `Log what you learned from ${phrase}.`;
  }

  if (nextMove?.trim()) {
    return `Quick note from your last touch — supports “${nextMove.trim()}”.`;
  }

  return "Log what you picked up before your next case day or office call.";
}


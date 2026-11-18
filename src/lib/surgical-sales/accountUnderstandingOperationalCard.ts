/**
 * Operational intelligence card copy — synthesized per understanding area.
 */

import { accountUnderstandingNextMove, accountUnderstandingStillNeed } from "@/lib/surgical-sales/accountUnderstandingUncertaintyCopy";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  formatIntelligenceFieldAttributionDisplay,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { intelligenceUnlocksNextLine } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import {
  deriveOperationalIntelligenceAreaStatus,
  OPERATIONAL_INTELLIGENCE_STATUS_LABELS,
  type OperationalIntelligenceAreaStatus,
  type OperationalIntelligenceUncertaintyKind,
} from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { intelligenceSectionEmptyConfirmed } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import type { AccountUnderstandingAreaId } from "@/lib/surgical-sales/providerAccountUnderstanding";
import { ACCOUNT_UNDERSTANDING_AREAS } from "@/lib/surgical-sales/providerAccountUnderstanding";

/** CSS token on intelligence cards — maps to mission readiness colors. */
export type AccountUnderstandingConfidenceLevel = OperationalIntelligenceAreaStatus;

export const ACCOUNT_UNDERSTANDING_CONFIDENCE_LABELS = OPERATIONAL_INTELLIGENCE_STATUS_LABELS;

export function accountUnderstandingConfidenceFromSection(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  gap: IntelligenceLearningGap | null,
  options?: {
    sectionConfidence?: IntelligenceSectionConfidence;
    fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
    planning?: ProviderPlanningCompletion | null;
  },
): {
  level: AccountUnderstandingConfidenceLevel;
  label: string;
  missionLabel: string;
  readinessScore: number;
  uncertaintyKind: OperationalIntelligenceUncertaintyKind | null;
} {
  const derived = deriveOperationalIntelligenceAreaStatus({
    sectionId,
    contact,
    gap,
    sectionConfidence: options?.sectionConfidence,
    fieldMetadata: options?.fieldMetadata,
    planning: options?.planning,
  });
  if (gap?.state === "outdated" && derived.status === "confirmed") {
    return {
      level: "partial",
      label: "Partial — revalidate",
      missionLabel: "Stale read — confirm on next touch",
      readinessScore: 40,
      uncertaintyKind: derived.uncertaintyKind,
    };
  }
  return {
    level: derived.status,
    label: OPERATIONAL_INTELLIGENCE_STATUS_LABELS[derived.status],
    missionLabel: derived.missionLabel,
    readinessScore: derived.readinessScore,
    uncertaintyKind: derived.uncertaintyKind,
  };
}

export function accountUnderstandingOperationalRisk(
  gap: IntelligenceLearningGap | null,
  areaId: AccountUnderstandingAreaId,
  uncertaintyKind?: OperationalIntelligenceUncertaintyKind | null,
): string {
  if (uncertaintyKind === "unexplored") {
    return scanLine(
      "Early discovery — no operational judgment yet. Capture what you learn on the next touch.",
      140,
    );
  }
  if (uncertaintyKind === "opaque") {
    return scanLine(
      "Account may be politically opaque or locked — treat OR access and evaluation as high-risk until validated.",
      140,
    );
  }
  if (gap) {
    const summary = gap.operationalConsequence?.summary?.trim() || gap.operationalImpact?.trim();
    if (summary) return scanLine(summary, 140);
  }
  const defaults: Record<AccountUnderstandingAreaId, string> = {
    operational:
      "Without a read on OR access workflow, case days and credentialing spend may hit approval walls you could have mapped earlier.",
    workflow: "Case mix and technique assumptions may misposition trials until validated live.",
    relationship: "Influence path may be wrong — evaluations can stall without the real approver.",
    commercial: "Evaluation appetite or vendor landscape may slow trial motion.",
    field_readiness: "Observation may be denied on case day until allowance and clearance are clear.",
  };
  return scanLine(defaults[areaId], 140);
}

export function accountUnderstandingTacticalImplication(
  gap: IntelligenceLearningGap | null,
  areaId: AccountUnderstandingAreaId,
): string {
  if (gap) {
    const unlock = intelligenceUnlocksNextLine(gap.dbKey, 100);
    return scanLine(`Enables ${unlock} on the next touch.`, 140);
  }
  const defaults: Record<AccountUnderstandingAreaId, string> = {
    operational: "Confirms whether OR time is worth booking this month.",
    workflow: "Shapes which cases to watch and what to position in-room.",
    relationship: "Determines who must be in the room vs reached remotely.",
    commercial: "Frames evaluation design once operational access is mapped.",
    field_readiness: "Locks first-case observation profile before travel.",
  };
  return scanLine(defaults[areaId], 140);
}

export function accountUnderstandingUnknownLine(
  gap: IntelligenceLearningGap | null,
  areaId: AccountUnderstandingAreaId,
): string {
  const raw = accountUnderstandingStillNeed(gap, areaId);
  return scanLine(raw.replace(/^Still need to confirm:\s*/i, ""), 140);
}

export function accountUnderstandingKnownLine(
  knownSummary: string | null,
  areaId: AccountUnderstandingAreaId,
): string {
  if (knownSummary?.trim()) return scanLine(knownSummary, 140);
  return scanLine(
    intelligenceSectionEmptyConfirmed(ACCOUNT_UNDERSTANDING_AREAS[areaId].sectionId),
    140,
  );
}

export function accountUnderstandingSourceAttribution(
  dbKey: string,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): string | null {
  const meta = fieldMetadata?.[dbKey];
  const display = formatIntelligenceFieldAttributionDisplay(meta);
  const line = display.briefLine ?? display.sourceLine ?? display.validatedLine;
  return line ? scanLine(line, 100) : null;
}

export function accountUnderstandingBestNextAction(
  gap: IntelligenceLearningGap | null,
  areaId: AccountUnderstandingAreaId,
): string {
  if (gap) {
    return scanLine(accountUnderstandingNextMove(gap), 100);
  }
  return scanLine(`Capture ${ACCOUNT_UNDERSTANDING_AREAS[areaId].title.toLowerCase()} on the next visit.`, 100);
}

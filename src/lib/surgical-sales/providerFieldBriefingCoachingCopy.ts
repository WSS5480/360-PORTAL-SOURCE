/**
 * Field Briefing coaching copy — guide reps without judging the account.
 */

import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderFieldTimeRiskState } from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";
import { isEarlyDiscoveryRelationshipStage } from "@/lib/surgical-sales/providerRelationshipStage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export const EARLY_DISCOVERY_READINESS_COACHING =
  "Early discovery — keep this touch focused on workflow and next-step clarity.";

export function isEarlyDiscoveryBriefing(
  relationshipStage: string,
  commercialStage: ProviderCommercialWorkflowStage,
): boolean {
  return (
    isEarlyDiscoveryRelationshipStage(relationshipStage) || commercialStage === "early_discovery"
  );
}

/** Rep-facing coaching line — never "Risk: …" judgment framing. */
export function softenBriefingRiskToCoaching(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;

  const withoutRiskPrefix = t.replace(/^risk:\s*/i, "").trim();

  if (/or access not confirmed|or access.*not.*confirm|observation access not/i.test(withoutRiskPrefix)) {
    return "Do not request OR time until access path is clearer.";
  }
  if (/not yet viable|not viable for field|field deployment/i.test(withoutRiskPrefix)) {
    return "Keep this touch focused on workflow and next-step clarity.";
  }
  if (/access path|vendor clearance|clearance path/i.test(withoutRiskPrefix) && /not|unclear|unknown|open/i.test(withoutRiskPrefix)) {
    return "Do not request OR time until access path is clearer.";
  }
  if (/scheduling owner|coordinator/i.test(withoutRiskPrefix) && /not|unclear|missing|unknown/i.test(withoutRiskPrefix)) {
    return "Confirm who owns scheduling before committing field days.";
  }
  if (/not confirmed|not validated|not mapped|not yet/i.test(withoutRiskPrefix)) {
    return "Validate this on the call before leaning into heavier field moves.";
  }

  return scanLine(withoutRiskPrefix.replace(/\s*—\s*/g, " — "), 96);
}

export function buildBriefingReadinessCoaching(input: {
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  fieldTimeState: ProviderFieldTimeRiskState;
}): string {
  if (isEarlyDiscoveryBriefing(input.relationshipStage, input.commercialStage)) {
    return EARLY_DISCOVERY_READINESS_COACHING;
  }

  switch (input.fieldTimeState) {
    case "efficient_field_target":
      return "Clear for the next field touch";
    case "worth_exploratory_visit":
      return "Light touch — build context before heavier field days";
    case "requires_remote_validation_first":
      return "Confirm gates remotely before booking heavy field days";
    default:
      return "Map access and scheduling before booking field time";
  }
}

export function buildBriefingCoachingNote(input: {
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  fieldTimeState: ProviderFieldTimeRiskState;
  primaryRiskScan: string | null;
  primaryRiskHeadline: string | null;
}): string | null {
  const early = isEarlyDiscoveryBriefing(input.relationshipStage, input.commercialStage);
  const raw = input.primaryRiskScan?.trim() || input.primaryRiskHeadline?.trim() || null;
  const softened = softenBriefingRiskToCoaching(raw);

  if (early) {
    if (softened) return softened;
    if (
      input.fieldTimeState === "high_wasted_field_risk" ||
      input.fieldTimeState === "worth_exploratory_visit" ||
      input.fieldTimeState === "requires_remote_validation_first"
    ) {
      return "Do not request OR time until access path is clearer.";
    }
    return "Keep the touch light — learn workflow before heavier field days.";
  }

  if (softened) return softened;

  if (input.fieldTimeState === "high_wasted_field_risk") {
    return "Do not request OR time until access path is clearer.";
  }

  return null;
}

export function earlyDiscoveryVisibilityClause(): string {
  return "workflow and next-step clarity still forming";
}

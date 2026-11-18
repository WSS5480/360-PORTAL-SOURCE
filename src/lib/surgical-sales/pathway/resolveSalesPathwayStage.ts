/**
 * Unified pathway stage resolver — always evidence-gated.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  deriveGatedPathwayStage,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import {
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export type ResolveSalesPathwayStageInput = PathwayGateInput & {
  /** Precomputed stage from list API — used only when gate input is incomplete. */
  relationship_pathway_stage_id?: SalesPathwayStageId | string | null;
};

/** Canonical resolver — full gate evaluation when cases/engagements are present; otherwise API-precomputed stage. */
export function resolveSalesPathwayStage(input: ResolveSalesPathwayStageInput): SalesPathwayStageId {
  const hasRichPathwayEvidence =
    (input.cases?.length ?? 0) > 0 || (input.engagements?.length ?? 0) > 0;

  if (hasRichPathwayEvidence) {
    return deriveGatedPathwayStage({
      contact: input.contact ?? {},
      cases: input.cases,
      engagements: input.engagements,
    });
  }

  const precomputed = normalizeSalesPathwayStageId(input.relationship_pathway_stage_id);
  if (precomputed) return precomputed;

  return deriveGatedPathwayStage({
    contact: input.contact ?? {},
    cases: input.cases,
    engagements: input.engagements,
  });
}

export function resolveSalesPathwayStageFromProviderRow(
  provider: ProviderDirectoryRow,
  options?: {
    engagements?: ProviderEngagementSummary[];
    cases?: Array<Record<string, unknown>>;
  },
): SalesPathwayStageId {
  return resolveSalesPathwayStage({
    contact: provider as Record<string, unknown>,
    relationship_pathway_stage_id: provider.relationship_pathway_stage_id,
    engagements: options?.engagements,
    cases: options?.cases,
  });
}

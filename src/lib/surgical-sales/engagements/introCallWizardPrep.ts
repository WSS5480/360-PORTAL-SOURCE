import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import {
  buildEngagementPrepModeView,
  type EngagementPrepGenerationFlags,
  type EngagementPrepMode,
} from "@/lib/surgical-sales/engagements/engagementPrepMode";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

/** Intro Call wizard prep — product line only; no separate prep mode selection. */
export function resolveIntroCallWizardPrepMode(productLine?: string | null): EngagementPrepMode {
  return resolveExplicitPrepProductLine(productLine) ? "product_exploration" : "general_discovery";
}

export function buildIntroCallWizardPrepGeneration(input: {
  engagementType: string;
  productLine?: string | null;
  opportunityId?: string | null;
  opportunityStage?: string | null;
  caseId?: string | null;
  providerSpecialty?: string | null;
  providerRelationshipStage?: string | null;
  knownIntelligence?: PrepareKnownIntelligence;
}): EngagementPrepGenerationFlags {
  const prepMode = resolveIntroCallWizardPrepMode(input.productLine);
  return buildEngagementPrepModeView({
    engagementType: input.engagementType,
    prepMode,
    productLine: input.productLine,
    opportunityId: input.opportunityId,
    opportunityStage: input.opportunityStage,
    caseId: input.caseId,
    providerSpecialty: input.providerSpecialty,
    providerRelationshipStage: input.providerRelationshipStage,
    knownIntelligence: input.knownIntelligence ?? { bullets: [], last_key_insight: null },
  }).generation;
}

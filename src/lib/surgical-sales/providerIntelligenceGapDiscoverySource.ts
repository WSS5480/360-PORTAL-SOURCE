/**

 * Field guidance — where reps should learn each intelligence gap (active field guidance).

 */



import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import {

  intelligenceGapBestSource,

  intelligenceGapFieldGuidance,

  type IntelligenceGapFieldGuidance,

} from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";



/** @deprecated Prefer INTELLIGENCE_GAP_FIELD_GUIDANCE_LABELS.bestSource */

export const INTELLIGENCE_GAP_DISCOVERY_SOURCE_LABEL = "Best source";



export type { IntelligenceGapFieldGuidance };



export { INTELLIGENCE_GAP_FIELD_GUIDANCE } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";



/**

 * Best source for this gap — backward-compatible alias used by missions and CTAs.

 */

export function intelligenceGapBestLearnedFrom(

  dbKey: string,

  sectionId?: ProviderIntelligenceSectionId,

): string {

  return intelligenceGapBestSource(dbKey, sectionId);

}



export function formatIntelligenceGapDiscoverySourceLine(

  dbKey: string,

  sectionId?: ProviderIntelligenceSectionId,

): string {

  return `${INTELLIGENCE_GAP_DISCOVERY_SOURCE_LABEL}: ${intelligenceGapBestLearnedFrom(dbKey, sectionId)}`;

}



export function intelligenceGapFieldGuidanceForKey(

  dbKey: string,

  sectionId?: ProviderIntelligenceSectionId,

): IntelligenceGapFieldGuidance {

  return intelligenceGapFieldGuidance(dbKey, sectionId);

}



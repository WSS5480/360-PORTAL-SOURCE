import type { ObservationIntelligenceCategoryId } from "@/lib/surgical-sales/buildObservationIntelligenceView";

import type { ObservationNoteEntityType, ObservationNoteExtraction } from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isUsableObservationEntity,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";
import { appendObservationLiveFieldLine } from "@/lib/surgical-sales/appendObservationLiveFieldLine";



export function observationEntityIntelligenceCategory(

  type: ObservationNoteEntityType,

  value: string,

): ObservationIntelligenceCategoryId | null {

  switch (type) {

    case "clinical_pain_signal":

      return "clinical_pain_points";

    case "workflow_friction_signal":

      return "workflow_friction";

    case "competitor_signal":

      return "competitor_products";

    case "product_signal":

      return "product_fit_signals";

    case "staff_signal":

      return "staff_observations";

    case "provider_behavior_signal":

    case "procedure_focus":

      return "provider_behavior";

    case "growth_signal":

    case "follow_up_signal":

      return "growth_opportunities";

    case "scheduling_contact":

      return null;

    case "workflow_signal":

      if (/\b(pain|fixation|visuali|difficult|clinical|consisten)\b/i.test(value)) {

        return "clinical_pain_points";

      }

      if (/\b(surgeon|provider|doctor|said|prefer|openness)\b/i.test(value)) {

        return "provider_behavior";

      }

      if (/\b(opportunit|trial|demo|growth|expand)\b/i.test(value)) {

        return "growth_opportunities";

      }

      if (/\b(friction|delay|setup|turnover|step|workaround|inefficien)\b/i.test(value)) {

        return "workflow_friction";

      }

      return "workflow_friction";

    default:

      return "workflow_friction";

  }

}



export function observationEntityLiveField(

  type: ObservationNoteEntityType,

  value: string,

): string | null {

  const category = observationEntityIntelligenceCategory(type, value);

  switch (category) {

    case "clinical_pain_points":

      return "live_observation_clinical_pain_points";

    case "workflow_friction":

      return "live_observation_workflow";

    case "competitor_products":

      return "live_observation_competitors";

    case "product_fit_signals":

      return "live_observation_product_fit";

    case "staff_observations":

      return "live_observation_staff_process";

    case "provider_behavior":

      return "live_observation_surgeon_reactions";

    case "growth_opportunities":

      return "live_observation_follow_up_items";

    default:

      return null;

  }

}



export function buildLiveObservationPatchesFromExtraction(

  extraction: ObservationNoteExtraction,

  caseRow: Record<string, unknown>,

): Record<string, string> {

  const patches: Record<string, string> = {};



  for (const entity of extraction.entities) {
    if (!isUsableObservationEntity(entity)) continue;

    const finding = observationEntityFinding(entity);
    const field = observationEntityLiveField(entity.type, finding);

    if (!field) continue;

    const line = finding.trim();

    const current = patches[field] ?? caseRow[field];

    patches[field] = appendObservationLiveFieldLine(current, line);

  }



  return patches;

}



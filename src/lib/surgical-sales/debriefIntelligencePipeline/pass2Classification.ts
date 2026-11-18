/**
 * PASS 2 — Classify structured facts into platform entities (immutable fact_key).
 */

import type { DebriefFactKey } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import {
  debriefExplicitProductFitConnection,
  type DebriefIntelligenceCategory,
} from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type {
  DebriefClassifiedFact,
  DebriefFactClassification,
  DebriefRawFact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

const CLASSIFICATION_BY_KEY: Record<DebriefFactKey, DebriefFactClassification> = {
  observation_approved_explicit: "observation_access",
  observation_interest_without_approval: "observation_access",
  observation_denied: "observation_access",
  observation_mentioned: "observation_access",
  credentialing_required_platform_unknown: "credentialing",
  credentialing_platform_mentioned_unconfirmed: "credentialing",
  credentialing_platform_confirmed: "credentialing",
  credentialing_discussed: "credentialing",
  scheduling_person_named: "scheduling",
  scheduling_discussed: "scheduling",
  workflow_person_named: "workflow_participant",
  workflow_person_with_contact_info: "workflow_participant",
  workflow_coordination_mentioned: "workflow_participant",
  clinical_robotic_ventral_hernia_increasing: "clinical_focus",
  clinical_abdominal_wall_reconstruction_increasing: "clinical_focus",
  clinical_robotic_ventral_hernia: "clinical_focus",
  clinical_abdominal_wall_reconstruction: "clinical_focus",
  clinical_procedure_discussed: "clinical_focus",
  product_fit_discussed: "product_fit",
  product_acsis_discussed: "product_fit",
  current_product_needs_confirmation: "current_product",
  current_product_validated: "current_product",
  relationship_mentioned: "relationship",
  follow_up_stated: "next_step",
  facility_access_partial: "observation_access",
  facility_credentialing_partial: "credentialing",
};

const CATEGORY_BY_CLASSIFICATION: Record<DebriefFactClassification, DebriefIntelligenceCategory> = {
  observation_access: "access_intelligence",
  credentialing: "access_intelligence",
  scheduling: "access_intelligence",
  workflow_participant: "people_contacts",
  clinical_focus: "clinical_focus",
  relationship: "relationship_intelligence",
  product_fit: "product_fit_signals",
  current_product: "competitive_intelligence",
  next_step: "next_steps",
};

function classifyFactLegacy(fact: DebriefRawFact): DebriefFactClassification {
  const blob = `${fact.fact_text} ${fact.evidence_quote}`.toLowerCase();
  if (/\bobserv/i.test(blob)) return "observation_access";
  if (/\bcredential|vendor approv|platform\b/i.test(blob)) return "credentialing";
  if (/\bschedul/i.test(blob)) return "scheduling";
  if (fact.named_people.length > 0) return "workflow_participant";
  if (debriefExplicitProductFitConnection(blob)) return "product_fit";
  if (/\bcurrent_product|bard mesh|using\b/i.test(blob) && /\b(?:mesh|product|tray)\b/i.test(blob)) {
    return "current_product";
  }
  if (/\bclinical|hernia|abdominal|robotic|procedure\b/i.test(blob)) return "clinical_focus";
  if (/\btrust|receptive|relationship\b/i.test(blob)) return "relationship";
  if (/\bfollow-up|follow up|next step\b/i.test(blob)) return "next_step";
  return "observation_access";
}

function classifyFact(fact: DebriefRawFact): {
  classification: DebriefFactClassification;
  intelligenceCategory: DebriefIntelligenceCategory;
} {
  const key = fact.fact_key as DebriefFactKey;
  const classification =
    CLASSIFICATION_BY_KEY[key] ?? classifyFactLegacy(fact);
  return {
    classification,
    intelligenceCategory: CATEGORY_BY_CLASSIFICATION[classification],
  };
}

export function runPass2Classification(facts: DebriefRawFact[]): DebriefClassifiedFact[] {
  return facts.map((fact) => {
    const { classification, intelligenceCategory } = classifyFact(fact);
    return {
      ...fact,
      classification,
      intelligenceCategory,
    };
  });
}

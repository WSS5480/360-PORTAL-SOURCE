import { procedureTag, specialtyTag, stageTag, TEMPLATE_TAG_GENERIC } from "@/lib/surgical-sales/preCallPlanTemplateTags";

export type PreCallPlanTemplateSeedMeta = {
  procedureSlug: string;
  specialties: string[];
  stages: string[];
  generic?: boolean;
};

const M = (
  procedureSlug: string,
  specialties: string[],
  stages: string[],
  generic?: boolean,
): PreCallPlanTemplateSeedMeta => ({ procedureSlug, specialties, stages, generic });

/** Metadata keyed by stable seed `name` (upsert key). */
export const PRE_CALL_PLAN_TEMPLATE_SEED_METADATA: Record<string, PreCallPlanTemplateSeedMeta> = {
  "ACSIS — Observation request": M("hernia", ["general_surgery"], ["clinical_validation", "evaluation_planned"]),
  "ACSIS — Evaluation planning": M("hernia", ["general_surgery"], ["evaluation_planned", "evaluation_active"]),
  "ACSIS — Follow-up (preference card)": M("hernia", ["general_surgery"], ["preference_card_progress", "adoption_expanding"]),

  "BioTissue — Biologic evaluation": M("chronic_wound", ["wound_care", "vascular"], ["evaluation_planned", "evaluation_active"]),
  "BioTissue — Follow-up expansion": M("chronic_wound", ["wound_care"], ["outcome_review", "adoption_expanding"]),

  "Skeletal Dynamics — Extremity fixation evaluation": M("extremity_fixation", ["orthopedic"], ["evaluation_planned", "evaluation_active"]),
  "Skeletal Dynamics — Active evaluation support": M("extremity_fixation", ["orthopedic"], ["evaluation_active", "outcome_review"]),

  "TelaBio — Competitive conversion": M("soft_tissue_reconstruction", ["plastic_surgery"], ["evaluation_active", "preference_card_progress"]),
  "TelaBio — Observation request": M("soft_tissue_reconstruction", ["plastic_surgery", "general_surgery"], ["clinical_validation", "evaluation_planned"]),

  "Endolumik — Product demo": M("bariatric_calibration", ["bariatric"], ["evaluation_planned", "evaluation_active"]),
  "Endolumik — Clinical validation": M("bariatric_calibration", ["bariatric"], ["evaluation_active", "outcome_review"]),

  "Intro Call — All products": M("intro_call_pathway", ["general_surgery", "wound_care", "orthopedic", "bariatric", "plastic_surgery"], ["discovery"], true),
  "Intro Call — ACSIS": M("intro_call_pathway", ["general_surgery"], ["discovery"]),
  "Intro Call — BioTissue": M("intro_call_pathway", ["wound_care", "general_surgery"], ["discovery"]),
  "Intro Call — TelaBio": M("intro_call_pathway", ["plastic_surgery", "general_surgery"], ["discovery"]),
  "Intro Call — Skeletal Dynamics": M("intro_call_pathway", ["orthopedic"], ["discovery"]),
  "Intro Call — Endolumik": M("intro_call_pathway", ["bariatric", "general_surgery"], ["discovery"]),

  "360 Experience — All products": M(
    "hands_on_evaluation",
    ["general_surgery", "wound_care", "orthopedic", "bariatric", "plastic_surgery"],
    ["evaluation_planned", "evaluation_active"],
    true,
  ),
};

export function buildTagsFromSeedMeta(meta: PreCallPlanTemplateSeedMeta): string[] {
  const tags: string[] = [
    procedureTag(meta.procedureSlug),
    ...meta.specialties.map(specialtyTag),
    ...meta.stages.map(stageTag),
  ];
  if (meta.generic) tags.push(TEMPLATE_TAG_GENERIC);
  return tags;
}

export function seedMetaForName(name: string): PreCallPlanTemplateSeedMeta {
  return (
    PRE_CALL_PLAN_TEMPLATE_SEED_METADATA[name.trim()] ?? {
      procedureSlug: "general",
      specialties: [],
      stages: ["discovery"],
    }
  );
}

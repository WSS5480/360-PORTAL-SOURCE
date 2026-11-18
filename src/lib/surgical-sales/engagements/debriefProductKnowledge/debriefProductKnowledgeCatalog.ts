/**
 * Static product knowledge catalog for Observation Debrief strategy.
 * Conservative, editable copy — refine with clinical/marketing stakeholders over time.
 */

import type {
  DebriefProductKnowledge,
  DebriefProductKnowledgeId,
} from "./debriefProductKnowledgeTypes";

export const DEBRIEF_PRODUCT_KNOWLEDGE: Record<
  DebriefProductKnowledgeId,
  DebriefProductKnowledge
> = {
  ACSIS: {
    id: "ACSIS",
    name: "ACSIS",
    shortDescription:
      "Abdominal wall fixation workflow support for ventral and incisional hernia cases.",
    bestFitProcedures: [
      "Laparoscopic ventral hernia repair",
      "Incisional hernia repair",
      "Robotic ventral hernia cases where closure steps are observable",
    ],
    problemsSolved: [
      "Fixation steps that add time or bleeding risk during fascial closure",
      "Inconsistent tack or suture sequence during abdominal wall closure",
      "Workflow friction when mesh handling and closure compete for OR time",
    ],
    workflowTriggers: [
      "Surgeon or staff mention extra time during closure or fixation",
      "Competitive mesh or tack trays dominate the field",
      "Robotic versus lap closure habits differ and create coordination friction",
    ],
    clinicalTriggers: [
      "Recurrence or mesh-related concerns influence closure decisions",
      "Surgeon expresses dissatisfaction with current fixation approach",
      "Visualization before fixation affects decision confidence",
    ],
    idealProviderSignals: [
      "Meaningful ventral or incisional hernia volume",
      "Openness to observe closure workflow before changing trays",
      "Willingness to discuss evaluation on real hernia cases",
    ],
    commonObjections: [
      "Current mesh and fixation standard works well enough",
      "Committee or purchasing path is too long for a tray change",
      "Not enough lap ventral volume to justify evaluation",
      "[Placeholder — add region-specific objection]",
    ],
    discoveryQuestions: [
      "Which fixation workflow do you standardize on for ventral closure today?",
      "Where do closure or tack steps add the most time or bleeding risk?",
      "Which hernia subtypes would you consider for a focused workflow conversation?",
    ],
    experience360Positioning:
      "Use a 360 Experience when the surgeon sees possible closure workflow value but is not ready to commit cases — hands-on review of fixation steps outside a live OR commitment.",
    evaluationCaseTriggers: [
      "Surgeon confirms closure workflow friction is worth addressing",
      "Observation notes align with surgeon-stated fixation priorities",
      "Purchasing or committee path is understood and not blocked",
      "Agreed hernia subtype for a limited evaluation case profile",
    ],
    avoidWhen: [
      "Provider has minimal ventral or incisional hernia volume",
      "Surgeon states current fixation approach is not a priority to change",
      "No observation access or case visibility on closure steps",
    ],
  },

  Endolumik: {
    id: "Endolumik",
    name: "Endolumik",
    shortDescription:
      "Foregut and bariatric workflow support focused on sizing confirmation and leak-prevention habits.",
    bestFitProcedures: [
      "Sleeve gastrectomy",
      "Gastric bypass and other foregut cases",
      "Robotic foregut cases with visible confirmation steps",
    ],
    problemsSolved: [
      "Uncertainty or extra steps around sizing confirmation",
      "Leak-prevention workflow that adds OR delay or staff coordination",
      "Robotic foregut cases where dock or visualization extends case time",
    ],
    workflowTriggers: [
      "Staff coordination around bougie or sizing confirmation",
      "Surgeon or team mentions visualization or confirmation friction",
      "Case types where standard sizing practice may not fit robotic flow",
    ],
    clinicalTriggers: [
      "Surgeon discusses leak prevention or staple-line integrity habits",
      "Foregut volume supports repeat observation patterns",
      "[Placeholder — refine with approved clinical trigger language]",
    ],
    idealProviderSignals: [
      "Regular bariatric or foregut case volume",
      "Openness to review confirmation workflow after observation",
      "Bariatric coordinator or block access is identifiable",
    ],
    commonObjections: [
      "Current bougie or confirmation practice is entrenched",
      "Not enough foregut volume for evaluation",
      "Robotic program priorities do not include workflow change",
      "[Placeholder — add region-specific objection]",
    ],
    discoveryQuestions: [
      "How do you confirm sizing and staple-line integrity today?",
      "Where does leak prevention or confirmation add the most delay?",
      "Which foregut cases best represent your standard practice?",
    ],
    experience360Positioning:
      "Use a 360 Experience when foregut workflow interest is present but the surgeon wants to review confirmation steps in a lower-commitment setting before scheduling evaluation cases.",
    evaluationCaseTriggers: [
      "Surgeon agrees confirmation workflow is worth improving",
      "Observation aligns with stated leak-prevention priorities",
      "Case types identified for a limited evaluation profile",
    ],
    avoidWhen: [
      "Minimal bariatric or foregut volume",
      "Surgeon states confirmation workflow is not a current priority",
      "No visibility on sizing or confirmation steps during observation",
    ],
  },

  TelaBio: {
    id: "TelaBio",
    name: "TelaBio",
    shortDescription:
      "Soft tissue reinforcement and fascial closure support for complex abdominal wall and reconstruction cases.",
    bestFitProcedures: [
      "Complex abdominal wall reconstruction",
      "Robotic ventral cases with fascial reinforcement steps",
      "Soft tissue reconstruction where reinforcement choice is visible",
    ],
    problemsSolved: [
      "Reinforcement steps that differ between open and robotic closure",
      "Friction when biologic versus synthetic preference slows decisions",
      "Abdominal wall preservation goals that add closure complexity",
    ],
    workflowTriggers: [
      "Surgeon discusses fascial reinforcement or preservation during closure",
      "Robotic reconstruction steps feel redundant versus open routine",
      "Biologic committee or formulary gates delay reinforcement choices",
    ],
    clinicalTriggers: [
      "Stated preference for biologic or hybrid reinforcement",
      "Complex ventral or reconstruction volume worth discussing",
      "[Placeholder — refine with approved clinical trigger language]",
    ],
    idealProviderSignals: [
      "Reconstruction or complex ventral case mix",
      "Openness to compare reinforcement workflow after observation",
      "Path to committee or value analysis is understood",
    ],
    commonObjections: [
      "Current mesh or biologic standard is entrenched",
      "Biologic cost or committee bar is too high",
      "Robotic reinforcement workflow is not ready to change",
      "[Placeholder — add region-specific objection]",
    ],
    discoveryQuestions: [
      "How do you reinforce fascial closure today — biologic, synthetic, or hybrid?",
      "Where does reinforcement add time compared with your open routine?",
      "What outcomes would justify evaluating a different reinforcement approach?",
    ],
    experience360Positioning:
      "Use a 360 Experience when reinforcement workflow may fit but the surgeon wants to review fascial closure concepts before committing OR evaluation cases.",
    evaluationCaseTriggers: [
      "Surgeon confirms reinforcement workflow is a meaningful priority",
      "Observation notes match stated preservation or closure goals",
      "Committee or documentation path for biologic evaluation is clear",
    ],
    avoidWhen: [
      "Low reconstruction or complex ventral volume",
      "Surgeon states reinforcement approach is not open to change",
      "No observation visibility on fascial closure steps",
    ],
  },

  BioTissue: {
    id: "BioTissue",
    name: "BioTissue",
    shortDescription:
      "Advanced wound and soft tissue graft workflow support in clinic and procedure settings.",
    bestFitProcedures: [
      "Advanced wound clinic visits with graft application",
      "Reconstruction cases where graft selection is visible",
      "Chronic wound pathways where escalation to biologics is discussed",
    ],
    problemsSolved: [
      "Graft selection and application steps that slow clinic throughput",
      "Soft tissue handling or preservation friction during application",
      "Unclear escalation path from dressings to grafts",
    ],
    workflowTriggers: [
      "Wound team mentions formulary, NPWT, or dressing rules affecting graft use",
      "Clinic staffing or throughput limits advanced wound decisions",
      "Surgeon or NP describes graft handling steps that add time",
    ],
    clinicalTriggers: [
      "Chronic wound or limb-salvage volume supports graft conversations",
      "Stated dissatisfaction with current graft or dressing pathway",
      "[Placeholder — refine with approved clinical trigger language]",
    ],
    idealProviderSignals: [
      "Advanced wound volume with visible graft workflow",
      "Wound coordinator or NP engaged in product decisions",
      "Openness to observe clinic or procedure-room application steps",
    ],
    commonObjections: [
      "Formulary or payer rules block new graft trials",
      "Current biologic vendor is entrenched",
      "Clinic throughput cannot support evaluation workflow",
      "[Placeholder — add region-specific objection]",
    ],
    discoveryQuestions: [
      "When do you escalate from standard dressings to grafts — and who decides?",
      "Where does graft application or handling add the most clinic time?",
      "What documentation does your committee need before a graft evaluation?",
    ],
    experience360Positioning:
      "Use a 360 Experience when graft workflow interest exists but the team wants education or case review before committing to an evaluation pathway.",
    evaluationCaseTriggers: [
      "Surgeon or wound lead confirms graft workflow is worth improving",
      "Observation aligns with chronic wound mix and application steps",
      "Committee or formulary path for trial is understood",
    ],
    avoidWhen: [
      "Minimal advanced wound or graft-eligible volume",
      "Team states graft pathway is not a near-term priority",
      "No visibility on application workflow in clinic or OR",
    ],
  },

  Merakris: {
    id: "Merakris",
    name: "Merakris",
    shortDescription:
      "Skin-substitute and advanced wound graft workflow support in clinic and procedure settings.",
    bestFitProcedures: [
      "Advanced wound clinic visits with skin-substitute application",
      "Chronic wound pathways where escalation from dressings or NPWT is discussed",
      "Procedure-room cases where graft handling and application are visible",
    ],
    problemsSolved: [
      "Skin-substitute selection steps that slow clinic throughput",
      "Graft handling or application friction during placement",
      "Unclear escalation path from dressings to a skin substitute",
    ],
    workflowTriggers: [
      "Wound team mentions formulary, NPWT, or dressing rules affecting graft use",
      "Clinic staffing or throughput limits advanced wound decisions",
      "Surgeon or NP describes graft handling steps that add time",
    ],
    clinicalTriggers: [
      "Chronic wound or limb-salvage volume supports graft conversations",
      "Stated dissatisfaction with current skin-substitute or dressing pathway",
      "[Placeholder — refine with approved clinical trigger language]",
    ],
    idealProviderSignals: [
      "Advanced wound volume with visible graft workflow",
      "Wound coordinator or NP engaged in product decisions",
      "Openness to observe clinic or procedure-room application steps",
    ],
    commonObjections: [
      "Formulary or payer rules block new graft trials",
      "Current biologic vendor is entrenched",
      "Clinic throughput cannot support evaluation workflow",
      "[Placeholder — add region-specific objection]",
    ],
    discoveryQuestions: [
      "When do you escalate from dressings or NPWT to a skin substitute — and who decides?",
      "Where does graft application or handling add the most clinic time?",
      "What documentation does your committee need before a Merakris evaluation?",
    ],
    experience360Positioning:
      "Use a 360 Experience when graft workflow interest exists but the team wants education or case review before committing to a Merakris evaluation pathway.",
    evaluationCaseTriggers: [
      "Surgeon or wound lead confirms graft workflow is worth improving",
      "Observation aligns with chronic wound mix and application steps",
      "Committee or formulary path for trial is understood",
    ],
    avoidWhen: [
      "Minimal advanced wound or graft-eligible volume",
      "Team states graft pathway is not a near-term priority",
      "No visibility on application workflow in clinic or OR",
    ],
  },

  "Skeletal Dynamics": {
    id: "Skeletal Dynamics",
    name: "Skeletal Dynamics",
    shortDescription:
      "Distal extremity fixation workflow support for hand, ankle, and trauma plating cases.",
    bestFitProcedures: [
      "Hand and wrist fracture fixation",
      "Ankle and distal extremity trauma cases",
      "Elective extremity cases with visible plating workflow",
    ],
    problemsSolved: [
      "Tray turnover or instrument friction during extremity fixation",
      "Preference-card constraints that limit plating options",
      "Trauma-call workflow where setup adds delay",
    ],
    workflowTriggers: [
      "Surgeon mentions plating system or tray friction",
      "After-hours trauma cases create setup or turnover pain",
      "Purchasing or value analysis gates tray comparisons",
    ],
    clinicalTriggers: [
      "Extremity fracture patterns that repeat on the schedule",
      "Stated interest in comparing implant or tray workflow",
      "[Placeholder — refine with approved clinical trigger language]",
    ],
    idealProviderSignals: [
      "Meaningful hand, ankle, or distal extremity volume",
      "Openness to observe fixation cases before preference-card change",
      "Purchasing path for tray comparison is mappable",
    ],
    commonObjections: [
      "Incumbent plating system is standard across the service",
      "Trauma call makes evaluation scheduling difficult",
      "Value analysis requires data not yet available",
      "[Placeholder — add region-specific objection]",
    ],
    discoveryQuestions: [
      "Which plating systems and trays do you use for extremity fixation today?",
      "Where does fracture workflow create the most turnover friction?",
      "What would purchasing need before a limited tray evaluation?",
    ],
    experience360Positioning:
      "Use a 360 Experience when extremity workflow interest is present but the surgeon wants implant or tray review before committing evaluation cases.",
    evaluationCaseTriggers: [
      "Surgeon confirms fixation workflow friction is worth addressing",
      "Observation captured plating steps on representative fracture types",
      "Preference-card or purchasing path for comparison is agreed",
    ],
    avoidWhen: [
      "Low extremity fixation volume",
      "Surgeon states current plating standard is not open to change",
      "No sterile-field observation access on fixation cases",
    ],
  },
};

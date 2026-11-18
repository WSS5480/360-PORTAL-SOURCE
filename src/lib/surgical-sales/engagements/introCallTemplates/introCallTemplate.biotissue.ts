import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** BioTissue — wound healing / graft / soft tissue preservation commercial motion. */
export const INTRO_CALL_TEMPLATE_BIOTISSUE: IntroCallPrepTemplate = {
  id: "biotissue",
  productLabel: "BioTissue",
  smartObjective:
    "Within 45 days, qualify advanced wound and soft tissue case volume, map graft selection and dressing workflow, and earn permission to observe in the wound clinic or reconstruction workflow before a BioTissue evaluation.",
  impactOpeningStatement:
    "I wanted to understand how your team manages wound healing today — graft utilization, soft tissue preservation, and where clinic or procedure-room workflow slows decisions on chronic wounds or limb salvage.",
  probesInformationToGather: [
    "Would you be open to allowing us to observe a wound care visit or procedure?",
    "What wound types (chronic, diabetic, traumatic, surgical dehiscence) drive most of your advanced care volume?",
    "How are biologics and grafts selected today — formulary, surgeon preference, or wound-team protocol?",
    "Where does soft tissue preservation or graft handling add steps in clinic or the procedure room?",
    "Which cases or clinic visits would allow observation of graft application workflow?",
    "What would you want us to pay attention to during an observed case?",
    "When do you escalate from standard dressings to grafts — and what triggers that step?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If wound volume and graft workflow are clear, BioTissue observation can focus on real application steps and preservation outcomes — not a generic graft conversation disconnected from their pathway.",
  plannedCloseNextStep:
    "Agree on observation or case review for up to five advanced wound cases and confirm documentation needed before graft evaluation.",
  observationGoals: [
    "Observe wound clinic or reconstruction workflow where graft selection and application are visible",
    "Document chronic wound and limb-salvage case types where BioTissue would be considered",
    "Capture dressing changes and soft tissue handling steps that affect graft use",
    "Align observation timing with graft application — not only initial consult visits",
    "Record what the surgeon wants noticed during observation",
  ],
  suggestedFollowUp: [
    "Send BioTissue graft workflow summary within 24 hours",
    "Schedule clinic or procedure-room observation within 14 days",
    "Request de-identified case list for chronic wound mix if observation timing is still forming",
    "Book follow-up with surgeon and wound NP to review observation findings before trial",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
};

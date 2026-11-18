import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** Merakris — wound / skin-substitute commercial motion (Dermacyte and related grafts). */
export const INTRO_CALL_TEMPLATE_MERAKRIS: IntroCallPrepTemplate = {
  id: "merakris",
  productLabel: "Merakris",
  smartObjective:
    "Within 45 days, qualify advanced wound volume, map skin-substitute selection and application workflow, and earn permission to observe in clinic or the procedure room before a Merakris evaluation.",
  impactOpeningStatement:
    "I wanted to understand how your team manages chronic wounds today — when you escalate to a skin substitute, how that product is chosen, and where application workflow slows clinic or procedure-room time.",
  probesInformationToGather: [
    "Would you be open to allowing us to observe a wound visit or graft application?",
    "What wound types drive most of your advanced care volume?",
    "How are skin substitutes selected today — formulary, surgeon preference, or wound-team protocol?",
    "Where does graft handling or application add steps in clinic or the procedure room?",
    "Which visits would allow observation of application workflow?",
    "What would you want us to pay attention to during an observed case?",
    "When do you escalate from dressings or NPWT to a skin substitute — and who triggers that step?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If wound volume and application workflow are clear, Merakris observation can focus on real graft steps and clinic throughput — not a generic skin-substitute conversation.",
  plannedCloseNextStep:
    "Agree on observation or case review for up to five advanced wound cases and confirm documentation needed before a Merakris evaluation.",
  observationGoals: [
    "Observe wound clinic or procedure-room workflow where skin-substitute selection and application are visible",
    "Document chronic wound types where Merakris would be considered",
    "Capture dressing, NPWT, and handling steps that affect graft use",
    "Align observation timing with application — not only initial consult visits",
    "Record what the surgeon or wound lead wants noticed during observation",
  ],
  suggestedFollowUp: [
    "Send Merakris graft workflow summary within 24 hours",
    "Schedule clinic or procedure-room observation within 14 days",
    "Request de-identified case mix for chronic wounds if observation timing is still forming",
    "Book follow-up with surgeon and wound NP to review observation findings before trial",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
};

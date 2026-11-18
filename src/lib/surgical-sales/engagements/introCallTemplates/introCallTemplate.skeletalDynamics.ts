import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** Skeletal Dynamics — hand / extremity fixation commercial motion. */
export const INTRO_CALL_TEMPLATE_SKELETAL_DYNAMICS: IntroCallPrepTemplate = {
  id: "skeletalDynamics",
  productLabel: "Skeletal Dynamics",
  smartObjective:
    "Within 45 days, qualify hand and extremity fixation volume, map plating systems and fracture workflow, and earn permission to observe extremity fixation cases before a Skeletal Dynamics evaluation.",
  impactOpeningStatement:
    "I wanted to understand how your team handles hand and extremity fixation — plating systems, fracture workflow, tray turnover, and where preference cards or implant profile create friction in trauma and elective cases.",
  probesInformationToGather: [
    "Would you be open to allowing me to observe one of your extremity fixation cases?",
    "What ankle, hand, and distal extremity fracture patterns drive most of your operative volume?",
    "Which plating systems and tray setups do you use today for extremity fixation?",
    "Where does fracture workflow create the most turnover or instrument friction?",
    "Which trauma-call or elective cases would allow observation of fixation steps?",
    "What would you want us to pay attention to during an observed fixation case?",
    "What would need to improve versus your current fixation standard to justify a workflow change?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If extremity volume and plating workflow are mapped, Skeletal Dynamics observation can target real fixation cases where tray steps and implant choice are visible — before asking for a preference card change.",
  plannedCloseNextStep:
    "Request observation on up to five extremity fixation cases and agree on fracture subtypes to debrief after observation.",
  observationGoals: [
    "Observe extremity fixation cases (hand, ankle, distal) where plating steps are visible",
    "Document tray setup, implant profile, and turnover friction on trauma and elective lists",
    "Note fracture patterns where Skeletal Dynamics would displace incumbent plates",
    "Capture what the surgeon wants noticed during observation",
    "Identify operational friction that would block adoption even with clinical interest",
  ],
  suggestedFollowUp: [
    "Send Skeletal Dynamics extremity portfolio overview within 24 hours",
    "Book trauma-call or elective extremity observation within 14 days",
    "Schedule surgeon debrief on fixation workflow after first observed case",
    "Align on documentation required before tray comparison if evaluation moves forward",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
};

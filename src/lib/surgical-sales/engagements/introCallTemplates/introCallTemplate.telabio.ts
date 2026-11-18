import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** TelaBio — soft tissue reinforcement / abdominal wall preservation commercial motion. */
export const INTRO_CALL_TEMPLATE_TELABIO: IntroCallPrepTemplate = {
  id: "telabio",
  productLabel: "TelaBio",
  smartObjective:
    "Within 45 days, qualify soft tissue reconstruction and abdominal wall preservation volume, map fascial reinforcement workflow, and earn permission to observe reconstruction cases before a TelaBio evaluation.",
  impactOpeningStatement:
    "I wanted to understand how you approach soft tissue reinforcement and abdominal wall preservation — where reconstruction support adds time versus your open routine, and how biologic preference shapes fascial closure today.",
  probesInformationToGather: [
    "Would you be open to allowing me to observe one of your reconstruction or hernia cases?",
    "Which ventral, complex abdominal wall, or soft tissue reconstruction cases do you run most?",
    "How do you reinforce fascial closure today — biologic, synthetic, hybrid — and who drives preference?",
    "Where does abdominal wall preservation matter most in your closure algorithm?",
    "Which cases would allow observation of fascial reinforcement and soft tissue support steps?",
    "What would you want us to notice about your reinforcement workflow?",
    "What clinical outcomes would justify evaluating a different reinforcement approach?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If reconstruction volume and reinforcement habits align, TelaBio can be judged on real fascial reinforcement steps where abdominal wall preservation is the decision driver — not a generic mesh conversation.",
  plannedCloseNextStep:
    "Agree to observe up to five soft tissue reconstruction or complex abdominal wall cases and define what to debrief after observation.",
  observationGoals: [
    "Observe soft tissue reconstruction or complex abdominal wall cases with visible fascial reinforcement",
    "Document biologic versus synthetic preference and stated preservation goals",
    "Note robotic reconstruction steps where reinforcement differs from open technique",
    "Capture time added or removed during fascial closure and soft tissue support",
    "Record what the surgeon wants noticed during observation",
  ],
  suggestedFollowUp: [
    "Send TelaBio reinforcement workflow summary within 24 hours",
    "Schedule reconstruction-case observation within 14 days",
    "Request case list for ventral/complex abdominal wall mix if timing is still forming",
    "Book follow-up to review reinforcement observations before evaluation packet",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
};

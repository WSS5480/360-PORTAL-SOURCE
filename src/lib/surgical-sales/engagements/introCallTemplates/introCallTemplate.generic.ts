import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_GENERIC,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** Neutral portfolio discovery — no product-specific clinical positioning. */
export const INTRO_CALL_TEMPLATE_GENERIC: IntroCallPrepTemplate = {
  id: "generic",
  productLabel: "Generic discovery",
  smartObjective:
    "Within 45 days, earn permission to observe representative cases, learn their operative workflow, and assess whether any product line in our portfolio could fit their case mix — before product-specific evaluation.",
  impactOpeningStatement:
    "I wanted to understand how you run your cases — which procedures dominate your volume, where workflow creates friction, and whether observation would help us learn before we talk about any specific product line.",
  probesInformationToGather: [
    "Which procedures make up the majority of your operative volume today?",
    "Would you be open to allowing us to observe one of your upcoming cases?",
    "Which case types would you be most comfortable having us observe?",
    "What would you want us to pay attention to if we watched one of your cases?",
    "Where does workflow friction show up most in the procedures you run every week?",
    "What would make a future product discussion or limited evaluation worth your time?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If we understand procedure fit and workflow friction through observation, we can decide whether deeper product conversations are warranted — without pushing a line that does not match their case mix.",
  plannedCloseNextStep:
    "Gain agreement on one or two case types worth observing, confirm what they want us to watch for, and book a dated follow-up to align on observation timing.",
  observationGoals: [
    "Observe cases where procedure steps and team workflow are visible without disrupting care",
    "Capture what the surgeon wants us to notice during observation",
    "Document workflow friction that would block adoption even with clinical interest",
    "Identify whether observation should precede any formal product evaluation",
  ],
  suggestedFollowUp: [
    "Send neutral portfolio overview only if they asked for materials — no product line push",
    "Schedule 20-minute follow-up in 10–14 days to confirm observation dates",
    "Log procedure mix and observation focus in provider intelligence after the call",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_GENERIC,
};

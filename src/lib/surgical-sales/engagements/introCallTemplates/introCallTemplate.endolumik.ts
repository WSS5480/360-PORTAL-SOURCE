import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** Endolumik — bariatric / foregut / leak prevention commercial motion. */
export const INTRO_CALL_TEMPLATE_ENDOLUMIK: IntroCallPrepTemplate = {
  id: "endolumik",
  productLabel: "Endolumik",
  smartObjective:
    "Within 45 days, qualify bariatric and foregut procedure volume, map sizing/visualization and leak-prevention workflow, and earn permission to observe cases where confirmation steps are visible before an Endolumik evaluation.",
  impactOpeningStatement:
    "I wanted to understand how bariatric and foregut cases run today — especially sizing confirmation, visualization workflow, leak-prevention habits, and where robotic foregut utilization adds coordination friction.",
  probesInformationToGather: [
    "Would you be open to allowing me to observe one of your bariatric or foregut cases?",
    "What is your monthly mix of bariatric sleeves, bypasses, and other foregut cases?",
    "How do you confirm sizing and staple-line integrity today — bougie, imaging, staff roles?",
    "Where does leak prevention or visualization workflow create the most OR delay?",
    "Which cases are best suited for observation of sizing and confirmation steps?",
    "What would you want us to notice about calibration and team communication?",
    "What would a meaningful leak-prevention or confirmation change need to prove clinically?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If foregut volume and confirmation workflow align, Endolumik can be evaluated on cases where sizing and leak-prevention steps are observable — reducing risk of a trial disconnected from real bariatric practice.",
  plannedCloseNextStep:
    "Request observation on up to five bariatric or foregut cases with visible confirmation steps and agree on leak-prevention metrics to debrief after observation.",
  observationGoals: [
    "Observe bariatric or foregut cases where sizing, bougie use, or confirmation steps are visible",
    "Document robotic versus lap foregut utilization and staff coordination around visualization",
    "Note leak-prevention workflow and where additional confirmation adds or removes time",
    "Capture case types where Endolumik would change standard sizing practice",
    "Record what the surgeon wants noticed during observation",
  ],
  suggestedFollowUp: [
    "Send Endolumik foregut workflow overview within 24 hours",
    "Book robotic or lap bariatric observation within 14 days",
    "Debrief confirmation and leak-prevention friction after first observed case",
    "Schedule surgeon follow-up to align on evaluation criteria before in-service",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
};

import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.types";
import {
  INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
  INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

/** ACSIS — abdominal wall / hernia fixation commercial motion. */
export const INTRO_CALL_TEMPLATE_ACSIS: IntroCallPrepTemplate = {
  id: "acsis",
  productLabel: "ACSIS",
  smartObjective:
    "Within 45 days, qualify laparoscopic and robotic ventral/incisional hernia volume, map abdominal wall fixation workflow, and earn permission to observe hernia repair cases before an ACSIS workflow evaluation.",
  impactOpeningStatement:
    "I wanted to understand how you run ventral and incisional hernia today — especially abdominal wall fixation, where mesh handling or closure adds time or bleeding risk, and whether lap or robotic cases are realistic for observation.",
  probesInformationToGather: [
    "Would you be open to allowing me to observe one of your upcoming hernia cases?",
    "What is your monthly mix of lap ventral, incisional, and complex abdominal wall cases?",
    "Which fixation workflow do you use today for fascial closure (tacks, transfascial sutures, other)?",
    "Where do recurrence concerns or prior mesh issues influence how you close the abdominal wall?",
    "Which hernia subtypes would you put forward for a first observation (lap ventral priority)?",
    "What would you want us to notice about your closure workflow if we watched a case?",
    "What would need to improve versus your current mesh/fixation standard to justify a workflow change?",
  ],
  toolsResources: INTRO_CALL_TEMPLATE_TOOLS_RESOURCES,
  valueHypothesis:
    "If ventral/incisional volume and fixation habits align, ACSIS can be evaluated on real hernia cases where closure steps are visible — before asking for a tray change or limited trial.",
  plannedCloseNextStep:
    "Ask permission to observe up to five lap ventral or incisional hernia repairs and agree on one hernia subtype to debrief after observation.",
  observationGoals: [
    "Target lap ventral and incisional hernia repair cases with clear abdominal wall fixation steps",
    "Document tack versus suture sequence, bleeding, and closure time on observed cases",
    "Note robotic versus lap utilization and whether observation can cover both pathways",
    "Capture mesh brand/type in use and stated dissatisfaction or recurrence triggers",
    "Identify what the surgeon wants noticed during observation before any trial discussion",
  ],
  suggestedFollowUp: [
    "Send ACSIS workflow one-pager within 24 hours",
    "Book follow-up within 14 days to align on first observation case",
    "Debrief fixation friction after first observed case; update provider intelligence with hernia mix",
    "Schedule surgeon follow-up to review observation notes before evaluation request",
  ],
  additionalNotesPlaceholder: INTRO_CALL_TEMPLATE_NOTES_PLACEHOLDER_PRODUCT,
};

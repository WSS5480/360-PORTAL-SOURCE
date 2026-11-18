import type { PrepareWhatMattersMostLineId } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import { ENGAGEMENT_DEBRIEF_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";

/** Operational labels for Field Briefing (not CRM/admin copy). */
/** Single contextual banner on engagement workspace (not multi-chip lifecycle). */
export const OPERATIONAL_STATUS_LABEL = "Field status";
/** @deprecated Use OPERATIONAL_STATUS_LABEL */
export const MEETING_STATE_LABEL = OPERATIONAL_STATUS_LABEL;
export const FIELD_BRIEFING_LEAD =
  "What you need before you walk into this interaction.";
export const KEY_UNKNOWNS_KICKER = "Answers to leave with.";
export const TACTICAL_NOTES_LABEL = "Tactical notes";

export const TACTICAL_PRIORITIES_TITLE = "Tactical Priorities";
export const TOP_ASKS_LABEL = "Top Asks";
/** Field briefing — live question queue */
export const PRIORITY_QUESTIONS_LABEL = "Priority questions";
export const PRIORITY_QUESTIONS_KICKER =
  "Questions to prioritize live during the conversation.";
export const MISSION_OBJECTIVE_LABEL = "Mission objective";
/** Field briefing — primary objective (mission mode + edit brief). */
export const FIELD_BRIEFING_MISSION_GOAL_LABEL = "Mission goal";
export const FIELD_BRIEFING_QUESTION_QUEUE_LABEL = "Question queue";
export const FIELD_BRIEFING_EDIT_BRIEF_LABEL = "Edit Briefing";
/** @deprecated Use FIELD_BRIEFING_EDIT_BRIEF_LABEL */
export const FIELD_BRIEFING_EDIT_BRIEF_LEGACY_LABEL = "Edit Brief";
export const FIELD_BRIEFING_SAVE_BRIEF_LABEL = "Save Briefing";
export const FIELD_BRIEFING_CANCEL_EDIT_LABEL = "Done";
export const FIELD_BRIEFING_ADD_QUESTION_LABEL = "+ Add question";
export const FIELD_BRIEFING_PRIMARY_QUESTION_BADGE = "Primary";
export const FIELD_BRIEFING_SET_PRIMARY_LABEL = "Set as primary";
export const FIELD_BRIEFING_EDIT_MODE_KICKER = "Building mode";
export const FIELD_BRIEFING_PREPARE_MODE_KICKER = "Prepare mode";
/** Planned engagement prepare route — detailed pre-call plan (not field briefing). */
export const PREPARE_PRE_CALL_PLAN_KICKER = "Pre-Call Plan";
export const PREPARE_PRE_CALL_PLAN_LEAD =
  "Build a detailed plan with company-approved inputs. Apply a playbook template or edit each field manually.";
/** Intro call prepare — pathway gate before observation scheduling. */
export const INTRO_CALL_PREPARE_KICKER = "Intro call prep";
export const INTRO_CALL_PREPARE_PLAN_TITLE = "Your game plan";
export const INTRO_CALL_PREPARE_PLAN_LEAD =
  "Frame the call, learn the observation pathway, and land the scheduling ask — use a playbook or draft each section.";
export const INTRO_CALL_PREPARE_READY_LABEL = "Game plan saved — ready for the intro call";
export const INTRO_CALL_PREPARE_START_LABEL = "Start intro call";
/** 360 Experience prepare — hands-on evaluation visit plan. */
export const OFFICE_VISIT_360_PREPARE_KICKER = "360 Experience prep";
export const OFFICE_VISIT_360_PREPARE_PLAN_TITLE = "Your visit plan";
export const OFFICE_VISIT_360_PREPARE_PLAN_LEAD =
  "Set your visit objective and sim lab focus — apply the playbook or answer both questions yourself.";
export const OFFICE_VISIT_360_PREPARE_READY_LABEL = "Visit plan saved — ready for the 360 Experience";
export const OFFICE_VISIT_360_PREPARE_START_LABEL = "Start 360 Experience";
/** @deprecated Manual mark-prepared control removed from planned prepare footer */
export const PREPARE_MARK_PREPARED_LABEL = "Mark prepared";
export const PREPARE_SAVE_PLAN_LABEL = "Save Plan";
export const PREPARE_BACK_TO_ENGAGEMENT_LABEL = "Back to Engagement";
export const PREPARE_START_WITHOUT_PLAN_TITLE = "Start without a plan?";
export const PREPARE_START_WITHOUT_PLAN_MESSAGE =
  "You have not entered a pre-call plan yet. You can start the engagement anyway or keep planning.";
export const PREPARE_START_ANYWAY_LABEL = "Start anyway";
export const PREPARE_CONTINUE_PLANNING_LABEL = "Continue planning";
export const PREPARE_GAME_PLAN_SECTION_TITLE = "Game plan";
/** Active engagement execution workspace — distinct from prepare mode. */
export const ACTIVE_ENGAGEMENT_EXECUTION_KICKER = "Active Engagement";
export const ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL = "Primary question";
export const ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL = "Secondary questions";
export const ACTIVE_ENGAGEMENT_QUICK_NOTES_LABEL = "Quick notes";
export const ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL = "Outcome";
export const ACTIVE_ENGAGEMENT_END_LABEL = "End Engagement";

export const PROVIDER_DEBRIEF_END_LABEL = "End Debrief";
export const PROVIDER_DEBRIEF_ACTIVE_DEBRIEF_NEXT_HINT =
  "Capture what happened in debrief next — we'll classify the result from your notes.";
export const PROVIDER_DEBRIEF_CONVERSATION_RESULT_TITLE = "Debrief Result";
export const PROVIDER_DEBRIEF_CONVERSATION_RESULT_LEAD =
  "Based on your debrief notes, this is how the conversation is classified.";
export const PROVIDER_DEBRIEF_CONTINUE_TO_RESULT_LABEL = "Continue to result";
export const PROVIDER_DEBRIEF_FINISH_LABEL = "Finish debrief";
export const PROVIDER_DEBRIEF_FINISH_SCHEDULE_EVALUATION_LABEL = "Finish & schedule evaluation";
export const ACTIVE_DEBRIEF_OBJECTIVE_LABEL = "Meeting objective";
export const ACTIVE_DEBRIEF_HYPOTHESIS_LABEL = "Your read going in";
export const ACTIVE_DEBRIEF_OBSERVED_LABEL = "What we noticed";
export const ACTIVE_DEBRIEF_VALIDATE_LABEL = "What to validate";
export const ACTIVE_DEBRIEF_QUESTIONS_LABEL = "Questions to ask";
export const ACTIVE_DEBRIEF_RECOMMENDED_OUTCOME_LABEL = "Possible next step";

/** @deprecated Use ACTIVE_ENGAGEMENT_* */
export const LIVE_CALL_EXECUTION_KICKER = ACTIVE_ENGAGEMENT_EXECUTION_KICKER;
/** @deprecated Use ACTIVE_ENGAGEMENT_EXECUTION_KICKER */
export const LIVE_ENGAGEMENT_CHEAT_SHEET_KICKER = ACTIVE_ENGAGEMENT_EXECUTION_KICKER;
/** @deprecated Use ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL */
export const LIVE_CALL_PRIMARY_QUESTION_LABEL = ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL */
export const LIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL = ACTIVE_ENGAGEMENT_PRIMARY_QUESTION_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL */
export const LIVE_CALL_SECONDARY_QUESTIONS_LABEL = ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL */
export const LIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL = ACTIVE_ENGAGEMENT_SECONDARY_QUESTIONS_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_QUICK_NOTES_LABEL */
export const LIVE_CALL_QUICK_NOTES_LABEL = ACTIVE_ENGAGEMENT_QUICK_NOTES_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_QUICK_NOTES_LABEL */
export const LIVE_ENGAGEMENT_QUICK_NOTES_LABEL = ACTIVE_ENGAGEMENT_QUICK_NOTES_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL */
export const LIVE_CALL_OUTCOME_SECTION_LABEL = ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL */
export const LIVE_ENGAGEMENT_OUTCOMES_LABEL = ACTIVE_ENGAGEMENT_OUTCOME_SECTION_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_END_LABEL */
export const LIVE_CALL_END_ENGAGEMENT_LABEL = ACTIVE_ENGAGEMENT_END_LABEL;
/** @deprecated Use ACTIVE_ENGAGEMENT_END_LABEL */
export const LIVE_CALL_COMPLETE_LABEL = ACTIVE_ENGAGEMENT_END_LABEL;
export const INTRO_CALL_BRIEFING_MISSION_GOAL_LABEL = FIELD_BRIEFING_MISSION_GOAL_LABEL;
export const INTRO_CALL_BRIEFING_PRIORITY_QUESTION_LABEL = "Priority question";
export const INTRO_CALL_BRIEFING_FOLLOW_UP_QUESTIONS_LABEL = "Follow-up questions";
export const INTRO_CALL_BRIEFING_NEXT_ACTION_LABEL = "Start Engagement";
export const INTRO_CALL_END_LABEL = "End Intro Call";
export const INTRO_CALL_ACTIVE_DEBRIEF_NEXT_HINT =
  "Capture what happened in debrief next — we'll determine the conversation result from your notes.";
export const INTRO_CALL_CONVERSATION_RESULT_TITLE = "Conversation Result";
export const INTRO_CALL_CONVERSATION_RESULT_LEAD =
  "Based on your debrief, this is how the intro call is classified.";
export const INTRO_CALL_CONTINUE_TO_RESULT_LABEL = "Continue to result";
export const INTRO_CALL_FINISH_LABEL = "Finish intro call";
export const KEY_UNKNOWNS_LABEL = "Key unknowns";
export const OPERATIONAL_UNKNOWNS_LABEL = "Operational unknowns";
export const DEPLOYMENT_RISK_LABEL = "Deployment Risk";
export const OPERATIONAL_CAUTION_LABEL = "Operational caution";
export const NEXT_STEP_OPPORTUNITY_LABEL = "Next-Step Opportunity";
export const FOLLOW_UP_OPPORTUNITY_LABEL = "Follow-up opportunity";
export const REFINE_BRIEFING_LABEL = "Refine briefing";

export const REFINE_PREP_LINK_LABEL = "Open Field Briefing";
export const ENGAGEMENT_WORKSPACE_LINK_LABEL = "← Workspace";
export const FIELD_INTEL_SECTION_LABEL = "Field intel";
export const VISIT_OUTCOME_LABEL = "Visit outcome";
/** @deprecated Use ENGAGEMENT_DEBRIEF_LABEL */
export const RECORD_OUTCOME_LABEL = ENGAGEMENT_DEBRIEF_LABEL;
export const TACTICAL_DEBRIEF_TITLE = ENGAGEMENT_DEBRIEF_LABEL;
/** @deprecated Use conversational prompts in prepareTacticalDebriefUx */
export const TACTICAL_DEBRIEF_PROMPT = "What happened?";

export const PREPARE_TODAY_LINE_LABELS: Record<PrepareWhatMattersMostLineId, string> = {
  discovery_goal: "Discovery focus",
  important_unknown: "Operational unknown",
  relationship_risk: DEPLOYMENT_RISK_LABEL,
  next_step_opportunity: NEXT_STEP_OPPORTUNITY_LABEL,
};

/** Labels for generated prep content — not confirmed outcome evidence. */
export const PREPARE_SUGGESTED_LABEL = "Suggested";
export const PREPARE_PREFILLED_LABEL = "Pre-filled";

export const REFINE_PREP_TACTICAL_DESCRIPTION =
  "Sharpen tactical priorities, top asks, and deployment risk for this visit — saved to the engagement record.";

export const REFINE_PREP_EMPTY_DISCOVERY_HINT =
  "Add provider intelligence or set discovery focus in the cards above.";

/** Compact Refine Prep playbook actions (not template management). */
export const PLAYBOOK_APPLY_LABEL = "Apply playbook";
export const PLAYBOOK_SAVE_LABEL = "Save playbook";

import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";

import { formatIntroCallProbesForField } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";

import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

import { formatIntroCallTemplateAdditionalNotes } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";



/** Pre-call fields populated from intro call templates (excludes contextual hospital/surgeon). */

export const INTRO_CALL_TEMPLATE_CONTENT_KEYS = [

  "observation_goal",

  "pre_observation_impact_opening_statement",

  "pre_observation_probes",

  "pre_observation_tools_resources",

  "pre_observation_value_hypothesis",

  "pre_observation_planned_close",

  "pre_observation_additional_notes",

] as const satisfies readonly PreCallPlanFieldKey[];



export type IntroCallTemplateContentKey = (typeof INTRO_CALL_TEMPLATE_CONTENT_KEYS)[number];



export function introCallTemplateToWorkflowFields(

  template: IntroCallPrepTemplate,

): Pick<EngagementWorkflowDraft, IntroCallTemplateContentKey> {

  return {

    observation_goal: template.smartObjective,

    pre_observation_impact_opening_statement: template.impactOpeningStatement,

    pre_observation_probes: formatIntroCallProbesForField(template.probesInformationToGather),

    pre_observation_tools_resources: template.toolsResources,

    pre_observation_value_hypothesis: template.valueHypothesis,

    pre_observation_planned_close: template.plannedCloseNextStep,

    pre_observation_additional_notes: formatIntroCallTemplateAdditionalNotes({

      observationGoals: template.observationGoals,

      suggestedFollowUp: template.suggestedFollowUp,

    }),

  };

}



export function introCallPrepFieldsHaveContent(draft: EngagementWorkflowDraft): boolean {

  return INTRO_CALL_TEMPLATE_CONTENT_KEYS.some((key) => String(draft[key] ?? "").trim().length > 0);

}



/** True when the rep must confirm before replacing fields with a new template. */

export function shouldPromptBeforeIntroCallTemplateReplace(draft: EngagementWorkflowDraft): boolean {

  return introCallPrepFieldsHaveContent(draft);

}



export function applyIntroCallTemplateToDraft(

  draft: EngagementWorkflowDraft,

  template: IntroCallPrepTemplate,

  options: { replace: boolean },

): EngagementWorkflowDraft {

  const mapped = introCallTemplateToWorkflowFields(template);

  const next = { ...draft };

  for (const key of INTRO_CALL_TEMPLATE_CONTENT_KEYS) {

    const value = mapped[key]?.trim() ?? "";

    if (!value) continue;

    if (options.replace || !String(next[key] ?? "").trim()) {

      next[key] = value;

    }

  }

  return next;

}



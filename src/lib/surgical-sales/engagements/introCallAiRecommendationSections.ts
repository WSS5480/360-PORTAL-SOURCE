import {
  applyConversationFocusToTemplatePreview,
  type IntroCallConversationFocusId,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import type { IntroCallPrepTemplate } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { formatIntroCallProbesForField } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import {
  INTRO_CALL_TEMPLATE_CONTENT_KEYS,
  introCallTemplateToWorkflowFields,
  type IntroCallTemplateContentKey,
} from "@/lib/surgical-sales/engagements/introCallTemplateApply";
import type { IntroCallTemplateSnapshot } from "@/lib/surgical-sales/engagements/introCallTemplateState";
import {
  formatIntroCallBulletList,
  formatIntroCallTemplateAdditionalNotes,
} from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";

export type IntroCallAiRecommendationSectionId =
  | "smart_objective"
  | "opening_angle"
  | "priority_probes"
  | "operational_unknowns"
  | "next_step_goal";

export type IntroCallAiRecommendationSection = {
  id: IntroCallAiRecommendationSectionId;
  label: string;
  previewText: string;
  fieldKeys: readonly IntroCallTemplateContentKey[];
};

const SECTION_FIELD_KEYS: Record<
  IntroCallAiRecommendationSectionId,
  readonly IntroCallTemplateContentKey[]
> = {
  smart_objective: ["observation_goal"],
  opening_angle: ["pre_observation_impact_opening_statement"],
  priority_probes: ["pre_observation_probes"],
  operational_unknowns: ["pre_observation_tools_resources", "pre_observation_value_hypothesis"],
  next_step_goal: ["pre_observation_planned_close", "pre_observation_additional_notes"],
};

function trimField(v: unknown): string {
  return String(v ?? "").trim();
}

function joinBlocks(blocks: string[]): string {
  return blocks.filter((b) => b.trim()).join("\n\n");
}

export function buildOperationalUnknownsPreview(template: IntroCallPrepTemplate): string {
  return joinBlocks([
    template.toolsResources.trim() ? `Tools & resources\n${template.toolsResources.trim()}` : "",
    template.valueHypothesis.trim() ? `Value hypothesis\n${template.valueHypothesis.trim()}` : "",
  ]);
}

export function buildNextStepGoalPreview(template: IntroCallPrepTemplate): string {
  const parts: string[] = [];
  if (template.plannedCloseNextStep.trim()) {
    parts.push(template.plannedCloseNextStep.trim());
  }
  if (template.suggestedFollowUp.length > 0) {
    parts.push(`Follow-up\n${formatIntroCallBulletList(template.suggestedFollowUp)}`);
  }
  return joinBlocks(parts);
}

export function mergeFollowUpIntoAdditionalNotes(
  currentNotes: string,
  suggestedFollowUp: readonly string[],
): string {
  const followBlock = formatIntroCallTemplateAdditionalNotes({
    observationGoals: [],
    suggestedFollowUp,
  }).trim();
  if (!followBlock) return trimField(currentNotes);

  const existing = trimField(currentNotes);
  if (!existing) return followBlock;

  if (/Suggested follow-up:/i.test(existing)) {
    return existing.replace(/Suggested follow-up:[\s\S]*/i, followBlock).trim();
  }
  return `${existing}\n\n${followBlock}`;
}

export function buildIntroCallAiRecommendationSections(
  template: IntroCallPrepTemplate,
  conversationFocus: readonly IntroCallConversationFocusId[] = [],
): IntroCallAiRecommendationSection[] {
  const displayTemplate = applyConversationFocusToTemplatePreview(template, conversationFocus);

  return [
    {
      id: "smart_objective",
      label: "Objective (SMART)",
      previewText: displayTemplate.smartObjective.trim(),
      fieldKeys: SECTION_FIELD_KEYS.smart_objective,
    },
    {
      id: "opening_angle",
      label: "Opening Angle",
      previewText: displayTemplate.impactOpeningStatement.trim(),
      fieldKeys: SECTION_FIELD_KEYS.opening_angle,
    },
    {
      id: "priority_probes",
      label: "Priority Questions",
      previewText: formatIntroCallProbesForField(displayTemplate.probesInformationToGather).trim(),
      fieldKeys: SECTION_FIELD_KEYS.priority_probes,
    },
    {
      id: "operational_unknowns",
      label: "Operational Unknowns",
      previewText: buildOperationalUnknownsPreview(displayTemplate),
      fieldKeys: SECTION_FIELD_KEYS.operational_unknowns,
    },
    {
      id: "next_step_goal",
      label: "Next-Step Goal",
      previewText: buildNextStepGoalPreview(displayTemplate),
      fieldKeys: SECTION_FIELD_KEYS.next_step_goal,
    },
  ];
}

export function introCallAiRecommendationSectionFieldKeys(
  sectionId: IntroCallAiRecommendationSectionId,
): readonly IntroCallTemplateContentKey[] {
  return SECTION_FIELD_KEYS[sectionId];
}

export function introCallAiRecommendationSectionHasContent(
  draft: EngagementWorkflowDraft,
  sectionId: IntroCallAiRecommendationSectionId,
): boolean {
  return introCallAiRecommendationSectionFieldKeys(sectionId).some((key) =>
    Boolean(trimField(draft[key])),
  );
}

export function shouldPromptBeforeIntroCallSectionReplace(
  draft: EngagementWorkflowDraft,
  sectionId: IntroCallAiRecommendationSectionId,
): boolean {
  return introCallAiRecommendationSectionHasContent(draft, sectionId);
}

export function sectionInsertActionLabel(
  draft: EngagementWorkflowDraft,
  sectionId: IntroCallAiRecommendationSectionId,
): "Insert" | "Replace section" {
  return introCallAiRecommendationSectionHasContent(draft, sectionId)
    ? "Replace section"
    : "Insert";
}

/** Tracks which field values came from AI insert (for clear-inserted). */
export function mergeIntroCallAppliedSnapshotForSection(
  existing: IntroCallTemplateSnapshot | null,
  template: IntroCallPrepTemplate,
  sectionId: IntroCallAiRecommendationSectionId,
): IntroCallTemplateSnapshot {
  const mapped = introCallTemplateToWorkflowFields(template) as IntroCallTemplateSnapshot;
  const keys = introCallAiRecommendationSectionFieldKeys(sectionId);
  const next = {} as IntroCallTemplateSnapshot;
  for (const key of INTRO_CALL_TEMPLATE_CONTENT_KEYS) {
    next[key] = existing?.[key] ?? "";
  }
  for (const key of keys) {
    next[key] = mapped[key] ?? "";
  }
  return next;
}

export function applyIntroCallAiRecommendationSectionToDraft(
  draft: EngagementWorkflowDraft,
  template: IntroCallPrepTemplate,
  sectionId: IntroCallAiRecommendationSectionId,
  options: { replace: boolean },
): EngagementWorkflowDraft {
  const next = { ...draft };

  const setField = (key: IntroCallTemplateContentKey, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (options.replace || !trimField(next[key])) {
      next[key] = trimmed;
    }
  };

  switch (sectionId) {
    case "smart_objective":
      setField("observation_goal", template.smartObjective);
      break;
    case "opening_angle":
      setField("pre_observation_impact_opening_statement", template.impactOpeningStatement);
      break;
    case "priority_probes":
      setField(
        "pre_observation_probes",
        formatIntroCallProbesForField(template.probesInformationToGather),
      );
      break;
    case "operational_unknowns":
      setField("pre_observation_tools_resources", template.toolsResources);
      setField("pre_observation_value_hypothesis", template.valueHypothesis);
      break;
    case "next_step_goal": {
      setField("pre_observation_planned_close", template.plannedCloseNextStep);
      const followNotes = mergeFollowUpIntoAdditionalNotes(
        String(next.pre_observation_additional_notes ?? ""),
        template.suggestedFollowUp,
      );
      if (followNotes) {
        if (options.replace || !trimField(next.pre_observation_additional_notes)) {
          next.pre_observation_additional_notes = followNotes;
        }
      }
      break;
    }
    default: {
      const _exhaustive: never = sectionId;
      return _exhaustive;
    }
  }

  return next;
}

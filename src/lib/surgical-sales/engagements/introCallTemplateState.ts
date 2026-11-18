import {
  applyConversationFocusToTemplatePreview,
  type IntroCallConversationFocusId,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import {
  buildIntroCallPrepTemplate,
  resolveIntroCallProductFocus,
  type IntroCallPrepTemplate,
  type IntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import {
  INTRO_CALL_TEMPLATE_CONTENT_KEYS,
  introCallTemplateToWorkflowFields,
  type IntroCallTemplateContentKey,
} from "@/lib/surgical-sales/engagements/introCallTemplateApply";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { formatIntroCallProbesForField } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { formatIntroCallBulletList } from "@/lib/surgical-sales/engagements/introCallTemplates/introCallTemplate.shared";

export type IntroCallTemplateSnapshot = Record<IntroCallTemplateContentKey, string>;

export type IntroCallTemplateStatusBadge =
  | "generic_discovery"
  | "acsis_applied"
  | "biotissue_applied"
  | "merakris_applied"
  | "endolumik_applied"
  | "telabio_applied"
  | "skeletal_dynamics_applied"
  | "acsis_preview"
  | "biotissue_preview"
  | "merakris_preview"
  | "endolumik_preview"
  | "telabio_preview"
  | "skeletal_dynamics_preview"
  | "custom_edited";

export type IntroCallTemplateState = {
  selectedProductFocus: IntroCallProductFocus;
  appliedTemplateId: IntroCallProductFocus | null;
  hasManualEdits: boolean;
  generatedSuggestions: IntroCallPrepTemplate;
  /** Fields mapped from generatedSuggestions for diffing */
  generatedFields: IntroCallTemplateSnapshot;
  statusBadge: IntroCallTemplateStatusBadge;
  statusLabel: string;
  previewDiffersFromApplied: boolean;
  canApplyTemplate: boolean;
  canRemoveTemplate: boolean;
};

export type IntroCallTemplatePersistedMeta = {
  appliedTemplateId: IntroCallProductFocus | null;
  appliedSnapshot: IntroCallTemplateSnapshot | null;
};

function trimField(v: unknown): string {
  return String(v ?? "").trim();
}

export function snapshotFromTemplate(template: IntroCallPrepTemplate): IntroCallTemplateSnapshot {
  return introCallTemplateToWorkflowFields(template) as IntroCallTemplateSnapshot;
}

export function resolveSelectedProductFocus(productLine: string): IntroCallProductFocus {
  return resolveIntroCallProductFocus({
    productLine,
    intentionalProductFocus: Boolean(resolveExplicitPrepProductLine(productLine)),
  });
}

export function buildGeneratedSuggestions(input: {
  productLine: string;
  providerSpecialty?: string | null;
}): IntroCallPrepTemplate {
  const focus = resolveSelectedProductFocus(input.productLine);
  return buildIntroCallPrepTemplate({
    productFocus: focus,
    providerSpecialty: input.providerSpecialty,
  });
}

export function computeHasManualEdits(
  draft: EngagementWorkflowDraft,
  appliedSnapshot: IntroCallTemplateSnapshot | null,
  generatedFields: IntroCallTemplateSnapshot,
): boolean {
  for (const key of INTRO_CALL_TEMPLATE_CONTENT_KEYS) {
    const current = trimField(draft[key]);
    if (!current) continue;
    if (appliedSnapshot) {
      if (current !== trimField(appliedSnapshot[key])) return true;
    } else if (current !== trimField(generatedFields[key])) {
      return true;
    }
  }
  return false;
}

const APPLIED_BADGE_BY_FOCUS: Record<
  Exclude<IntroCallProductFocus, "generic">,
  IntroCallTemplateStatusBadge
> = {
  acsis: "acsis_applied",
  biotissue: "biotissue_applied",
  merakris: "merakris_applied",
  endolumik: "endolumik_applied",
  telabio: "telabio_applied",
  skeletalDynamics: "skeletal_dynamics_applied",
};

const PREVIEW_BADGE_BY_FOCUS: Record<
  Exclude<IntroCallProductFocus, "generic">,
  IntroCallTemplateStatusBadge
> = {
  acsis: "acsis_preview",
  biotissue: "biotissue_preview",
  merakris: "merakris_preview",
  endolumik: "endolumik_preview",
  telabio: "telabio_preview",
  skeletalDynamics: "skeletal_dynamics_preview",
};

const BADGE_LABELS: Record<IntroCallTemplateStatusBadge, string> = {
  generic_discovery: "Generic discovery",
  acsis_applied: "ACSIS in your plan",
  biotissue_applied: "BioTissue in your plan",
  merakris_applied: "Merakris in your plan",
  endolumik_applied: "Endolumik in your plan",
  telabio_applied: "TelaBio in your plan",
  skeletal_dynamics_applied: "Skeletal Dynamics in your plan",
  acsis_preview: "ACSIS suggestions",
  biotissue_preview: "BioTissue suggestions",
  merakris_preview: "Merakris suggestions",
  endolumik_preview: "Endolumik suggestions",
  telabio_preview: "TelaBio suggestions",
  skeletal_dynamics_preview: "Skeletal Dynamics suggestions",
  custom_edited: "Custom edited",
};

export function resolveIntroCallTemplateStatusBadge(input: {
  selectedProductFocus: IntroCallProductFocus;
  appliedTemplateId: IntroCallProductFocus | null;
  hasManualEdits: boolean;
}): IntroCallTemplateStatusBadge {
  if (input.hasManualEdits) return "custom_edited";
  if (input.appliedTemplateId) {
    if (input.appliedTemplateId === "generic") return "generic_discovery";
    return APPLIED_BADGE_BY_FOCUS[input.appliedTemplateId];
  }
  if (input.selectedProductFocus === "generic") return "generic_discovery";
  return PREVIEW_BADGE_BY_FOCUS[input.selectedProductFocus];
}

export function buildIntroCallTemplateState(input: {
  productLine: string;
  providerSpecialty?: string | null;
  draft: EngagementWorkflowDraft;
  appliedTemplateId: IntroCallProductFocus | null;
  appliedSnapshot: IntroCallTemplateSnapshot | null;
}): IntroCallTemplateState {
  const selectedProductFocus = resolveSelectedProductFocus(input.productLine);
  const generatedSuggestions = buildIntroCallPrepTemplate({
    productFocus: selectedProductFocus,
    providerSpecialty: input.providerSpecialty,
  });
  const generatedFields = snapshotFromTemplate(generatedSuggestions);
  const hasManualEdits = computeHasManualEdits(
    input.draft,
    input.appliedSnapshot,
    generatedFields,
  );
  const statusBadge = resolveIntroCallTemplateStatusBadge({
    selectedProductFocus,
    appliedTemplateId: input.appliedTemplateId,
    hasManualEdits,
  });

  const previewDiffersFromApplied =
    input.appliedTemplateId !== null && input.appliedTemplateId !== selectedProductFocus;

  return {
    selectedProductFocus,
    appliedTemplateId: input.appliedTemplateId,
    hasManualEdits,
    generatedSuggestions,
    generatedFields,
    statusBadge,
    statusLabel: BADGE_LABELS[statusBadge],
    previewDiffersFromApplied,
    canApplyTemplate: true,
    canRemoveTemplate: input.appliedTemplateId !== null && input.appliedSnapshot !== null,
  };
}

export function removeAppliedTemplateFromDraft(
  draft: EngagementWorkflowDraft,
  appliedSnapshot: IntroCallTemplateSnapshot | null,
): EngagementWorkflowDraft {
  if (!appliedSnapshot) return { ...draft };
  const next = { ...draft };
  for (const key of INTRO_CALL_TEMPLATE_CONTENT_KEYS) {
    const applied = trimField(appliedSnapshot[key]);
    const current = trimField(next[key]);
    if (applied && current === applied) {
      next[key] = "";
    }
  }
  return next;
}

/** Primary CTA — copies suggested discovery prep into Call Plan fields. */
export const INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL = "Apply to Mission Prep";

/** @deprecated Use INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL */
export const INTRO_CALL_INSERT_INTO_PLAN_LABEL = INTRO_CALL_APPLY_TO_MISSION_PREP_LABEL;

export const INTRO_CALL_REVIEW_PREP_LABEL = "Review Prep";

export const INTRO_CALL_SUGGESTED_DISCOVERY_PREP_TITLE = "Suggested Discovery Prep";

export const INTRO_CALL_APPLY_TO_MISSION_PREP_CONFIRM_TITLE = "Apply to mission prep?";

/** @deprecated Use INTRO_CALL_APPLY_TO_MISSION_PREP_CONFIRM_TITLE */
export const INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_TITLE = INTRO_CALL_APPLY_TO_MISSION_PREP_CONFIRM_TITLE;

export const INTRO_CALL_APPLY_TO_MISSION_PREP_CONFIRM_MESSAGE =
  "This copies the full suggested discovery prep into your Call Plan. Fields you already filled may be updated. You can edit any field or clear applied prep afterward.";

/** @deprecated Use INTRO_CALL_APPLY_TO_MISSION_PREP_CONFIRM_MESSAGE */
export const INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_MESSAGE = INTRO_CALL_APPLY_TO_MISSION_PREP_CONFIRM_MESSAGE;

export const INTRO_CALL_AI_RECOMMENDATIONS_HINT =
  "Preview only — your Call Plan is not updated until you apply prep. You can edit fields or clear applied prep anytime.";

export const INTRO_CALL_REMOVE_INSERTED_LABEL = "Clear applied prep";

/** @deprecated Use INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_MESSAGE */
export const INTRO_CALL_APPLY_TEMPLATE_CONFIRM_MESSAGE = INTRO_CALL_INSERT_INTO_PLAN_CONFIRM_MESSAGE;

export type IntroCallTemplatePreviewSection = {
  key: string;
  label: string;
  value: string;
};

export function buildTemplatePreviewSections(
  template: IntroCallPrepTemplate,
  conversationFocus: readonly IntroCallConversationFocusId[] = [],
): IntroCallTemplatePreviewSection[] {
  const displayTemplate = applyConversationFocusToTemplatePreview(template, conversationFocus);
  return [
    { key: "objective", label: "SMART objective", value: displayTemplate.smartObjective },
    {
      key: "opening",
      label: "Impact opening",
      value: displayTemplate.impactOpeningStatement,
    },
    {
      key: "probes",
      label: conversationFocus.length > 0 ? "Probes (focus prioritized)" : "Probes",
      value: formatIntroCallProbesForField(displayTemplate.probesInformationToGather),
    },
    { key: "tools", label: "Tools & resources", value: displayTemplate.toolsResources },
    { key: "value", label: "Value hypothesis", value: displayTemplate.valueHypothesis },
    { key: "close", label: "Planned close", value: displayTemplate.plannedCloseNextStep },
    {
      key: "observation_goals",
      label: "Observation goals",
      value: formatIntroCallBulletList(displayTemplate.observationGoals),
    },
    {
      key: "follow_up",
      label: "Suggested follow-up",
      value: formatIntroCallBulletList(displayTemplate.suggestedFollowUp),
    },
  ];
}

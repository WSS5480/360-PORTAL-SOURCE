"use client";

import React from "react";
import {
  PREP_CONTEXT_OBSERVATION_LEAD,
  type IntroCallDiscoveryFocusView,
  type PreparationContextView,
  type WorkflowFocusedPrepHint,
} from "@/lib/surgical-sales/engagements/engagementPreparationContextContent";
import { StrategicCompactPrepPlan } from "./EngagementWizardPrepCompact";
import { IntroCallPreCallPlanPanel } from "./IntroCallPreCallPlanPanel";
import type { PreparationSpecializationView } from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { IntroCallDiscoveryFocusArea } from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";
import type { EngagementPrepModeView } from "@/lib/surgical-sales/engagements/engagementPrepMode";
import type { EngagementWizardPrepView } from "@/lib/surgical-sales/engagements/loadEngagementWizardPrepView";
import {
  discoveryQuestionsWorkflowFieldKey,
  formatDiscoveryQuestionsForField,
} from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import { formatFutureObservationGoalsForField } from "@/lib/surgical-sales/engagements/buildIntroCallFutureObservationGoals";
import { openingStatementWorkflowFieldKey } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedOpening";
import {
  applyConversationFocusToTemplatePreview,
  parseIntroCallConversationFocus,
} from "@/lib/surgical-sales/engagements/introCallConversationFocus";
import {
  buildIntroCallPrepTemplate,
  resolveIntroCallProductFocus,
} from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import { resolveExplicitPrepProductLine } from "@/lib/surgical-sales/engagements/introCallProductAlignment";
import { applyIntroCallTemplateToDraft } from "@/lib/surgical-sales/engagements/introCallTemplateApply";
import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { TemplateSuggestContext } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";

const MAX_TALKING_POINTS = 5;

export function PrepHierarchySection({
  step,
  title,
  description,
  variant = "primary",
  children,
  hidden,
}: {
  step: number;
  title: string;
  description?: string;
  variant?: "primary" | "secondary" | "tertiary";
  children: React.ReactNode;
  /** Omit entire section when nothing to show */
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <section
      className={`ew-prep-hierarchy-tier ew-prep-hierarchy-tier--${variant}`}
      aria-labelledby={`ew-prep-tier-title-${step}`}
    >
      <header className="ew-prep-hierarchy-tier-head">
        <span className="ew-prep-hierarchy-step" aria-hidden>
          {step}
        </span>
        <div className="ew-prep-hierarchy-tier-titles">
          <h2 id={`ew-prep-tier-title-${step}`} className="ew-prep-hierarchy-title">
            {title}
          </h2>
          {description ? <p className="ew-prep-hierarchy-desc">{description}</p> : null}
        </div>
      </header>
      <div className="ew-prep-hierarchy-tier-body">{children}</div>
    </section>
  );
}

function PrepSuggestionCard({
  title,
  actionLabel,
  onAction,
  disabled,
  children,
  contextNote,
  subdued,
  priority,
  observationPathway,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  contextNote?: string | null;
  /** Lighter card for lower-priority items in the stack */
  subdued?: boolean;
  /** Goal and talking points — stay prominent on mobile */
  priority?: boolean;
  /** Intro Call observation pathway card */
  observationPathway?: boolean;
}) {
  return (
    <section
      className={`ew-prep-suggestion-card${subdued ? " ew-prep-suggestion-card--subdued" : ""}${
        priority ? " ew-prep-suggestion-card--priority" : ""
      }${observationPathway ? " ew-prep-suggestion-card--observation-pathway" : ""}`}
      aria-label={title}
    >
      <div className="ew-prep-card-head">
        <h3 className="ew-prep-suggestion-title">{title}</h3>
        {actionLabel && onAction ? (
          <button type="button" className="ew-prep-card-action" disabled={disabled} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
      {contextNote ? <p className="ew-prep-muted ew-prep-suggestion-meta">{contextNote}</p> : null}
    </section>
  );
}

export function WorkflowFocusedPreparationBanner({
  hint,
  placement = "intro",
}: {
  hint: WorkflowFocusedPrepHint;
  /** intro = desktop header; guidance = mobile guidance stack (intro hidden ≤480px) */
  placement?: "intro" | "guidance";
}) {
  return (
    <section
      className={`ew-prep-workflow-hint ew-prep-workflow-hint--${placement}`}
      aria-label="Preparation scope"
    >
      <p className="ew-prep-workflow-hint-lead">{hint.lead}</p>
      <p className="ew-prep-workflow-hint-sub">{hint.sub}</p>
    </section>
  );
}

const SPECIALIZATION_STEPS = [
  { tier: "low" as const, short: "Discovery" },
  { tier: "medium" as const, short: "Specialty" },
  { tier: "high" as const, short: "Product" },
];

export function EngagementPrepModeBanner({
  prepMode,
  placement = "guidance",
}: {
  prepMode: EngagementPrepModeView;
  placement?: "intro" | "guidance";
}) {
  return (
    <section
      className={`ew-prep-dominant-mode ew-prep-dominant-mode--${prepMode.mode} ew-prep-dominant-mode--${placement}`}
      aria-label="Preparation mode"
    >
      <p className="ew-prep-dominant-mode-label">{prepMode.label}</p>
      <p className="ew-prep-dominant-mode-summary">{prepMode.summary}</p>
    </section>
  );
}

/** @deprecated Use EngagementPrepModeBanner */
export const DominantPrepModeBanner = EngagementPrepModeBanner;

export function PreparationSpecializationProgress({
  specialization,
  placement = "intro",
}: {
  specialization: PreparationSpecializationView;
  placement?: "intro" | "guidance";
}) {
  return (
    <section
      className={`ew-prep-specialization ew-prep-specialization--${specialization.tier} ew-prep-specialization--${placement}`}
      aria-label="Preparation specificity"
    >
      <div className="ew-prep-specialization-track" aria-hidden>
        {SPECIALIZATION_STEPS.map((step, index) => (
          <React.Fragment key={step.tier}>
            <span
              className={`ew-prep-specialization-step${
                specialization.tier_index >= index ? " ew-prep-specialization-step--active" : ""
              }${specialization.tier === step.tier ? " ew-prep-specialization-step--current" : ""}`}
            >
              {step.short}
            </span>
            {index < SPECIALIZATION_STEPS.length - 1 ? (
              <span
                className={`ew-prep-specialization-connector${
                  specialization.tier_index > index ? " ew-prep-specialization-connector--active" : ""
                }`}
              />
            ) : null}
          </React.Fragment>
        ))}
      </div>
      <p className="ew-prep-specialization-label">{specialization.tier_label}</p>
      <p className="ew-prep-specialization-summary">{specialization.summary}</p>
    </section>
  );
}

export function PreparationSpecialtyGuidancePanel({
  specialization,
  placement = "guidance",
}: {
  specialization: PreparationSpecializationView;
  placement?: "intro" | "guidance";
}) {
  if (!specialization.show_specialty_guidance || specialization.tier === "low") {
    return null;
  }
  return (
    <section
      className={`ew-prep-specialty-focus ew-prep-specialty-focus--${specialization.tier} ew-prep-specialty-focus--${placement}`}
      aria-label="Specialty and procedure guidance"
    >
      <header className="ew-prep-specialty-focus-header">
        <h3 className="ew-prep-specialty-focus-title">
          {specialization.tier === "high" ? "Specialty context" : "Specialty & procedure guidance"}
        </h3>
        <p className="ew-prep-specialty-focus-lead">{specialization.headline}</p>
      </header>
      <ul className="ew-prep-specialty-focus-list">
        {specialization.focus_areas.map((area) => (
          <li key={area}>{area}</li>
        ))}
      </ul>
    </section>
  );
}

export function IntroCallDiscoveryFocusPanel({
  focus,
  placement = "intro",
}: {
  focus: IntroCallDiscoveryFocusView;
  placement?: "intro" | "guidance";
}) {
  return (
    <section
      className={`ew-prep-discovery-focus ew-prep-discovery-focus--${placement}`}
      aria-labelledby={`ew-prep-discovery-focus-title-${placement}`}
    >
      <header className="ew-prep-discovery-focus-header">
        <h3 id={`ew-prep-discovery-focus-title-${placement}`} className="ew-prep-discovery-focus-title">
          {focus.title}
        </h3>
        <p className="ew-prep-discovery-focus-lead">{focus.lead}</p>
        <p className="ew-prep-discovery-focus-sub">{focus.sub}</p>
      </header>
      <ol className="ew-prep-discovery-focus-list">
        {focus.areas.map((area, index) => (
          <li key={area.id} className="ew-prep-discovery-focus-item">
            <span className="ew-prep-discovery-focus-index" aria-hidden>
              {index + 1}
            </span>
            <div className="ew-prep-discovery-focus-body">
              <span className="ew-prep-discovery-focus-item-title">{area.title}</span>
              <p className="ew-prep-discovery-focus-item-desc">{area.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PreparationContextBanner({
  context,
}: {
  context: PreparationContextView;
}) {
  return (
    <section
      className={`ew-prep-context ew-prep-context--${context.state}`}
      aria-label={`Preparation context: ${context.label}`}
    >
      <div className="ew-prep-context-head">
        <span className="ew-prep-context-badge">{context.label}</span>
        <p className="ew-prep-context-summary">{context.summary}</p>
      </div>
      {context.discovery_focus ? null : (
        <ul className="ew-prep-context-focus">
          {context.focus_areas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ObservationQualificationFallback({
  observationArea,
}: {
  observationArea: IntroCallDiscoveryFocusArea | null;
}) {
  if (!observationArea) return null;
  return (
    <div className="ew-prep-observation-qualify ew-prep-observation-qualify--discovery">
      <p className="ew-prep-observation-qualify-lead">{observationArea.description}</p>
      <p className="ew-prep-muted ew-prep-observation-qualify-question">
        <span className="ew-prep-observation-qualify-label">Probe:</span> {observationArea.discovery_question}
      </p>
    </div>
  );
}

export function IntroCallWhatSuccessLooksLike({
  context,
  discoveryFocus,
}: {
  context: PreparationContextView | null;
  discoveryFocus?: IntroCallDiscoveryFocusView | null;
}) {
  if (discoveryFocus) return null;
  if (!context) return null;
  return (
    <section className="ew-prep-success-panel" aria-label="What success looks like">
      <h3 className="ew-prep-success-title">What success looks like</h3>
      <p className="ew-prep-success-lead">{context.success_outcomes_lead}</p>
      <ul className="ew-prep-success-list">
        {context.success_outcomes.map((outcome) => (
          <li key={outcome}>{outcome}</li>
        ))}
      </ul>
    </section>
  );
}

export function EngagementWizardPrepIntro({
  variant,
  engagementType,
  preparationContext,
  discoveryFocus,
}: {
  variant: "strategic" | "lightweight";
  engagementType?: string;
  preparationContext?: PreparationContextView | null;
  discoveryFocus?: IntroCallDiscoveryFocusView | null;
}) {
  const isIntroCall = normalizeEngagementType(engagementType) === "intro_call";
  const strategicLead = isIntroCall
    ? (discoveryFocus?.lead ??
      preparationContext?.intro_lead ??
      "This preparation is designed to help you understand procedural workflow and commercialization fit.")
    : "Here is how to prepare for this interaction.";
  const strategicSub = isIntroCall
    ? (discoveryFocus?.sub ??
      preparationContext?.intro_sub ??
      "Use suggested goals, questions, and talking points as starting points — customize only what matters.")
    : "Use the suggestions that fit. Open Customize prep manually only when you need your own wording.";
  return (
    <div className="ew-prep-intro">
      <p className="ew-prep-intro-lead">
        {variant === "strategic" ? strategicLead : "A quick plan for this touchpoint — use Customize prep manually when needed."}
      </p>
      <p className="ew-prep-intro-sub">
        {variant === "strategic"
          ? strategicSub
          : "Capture purpose and next steps. Full intelligence briefing unlocks after you save."}
      </p>
    </div>
  );
}

export function EngagementWizardStrategicGuidance({
  prep,
  prepLoading,
  prepRefreshing = false,
  disabled,
  isOfficeVisit,
  engagementType,
  workflowDraft,
  onWorkflowDraftChange,
  canApplySuggestedPlan,
  onApplySuggestedPlan,
  productLine,
  onProductLineChange,
  conversationFocusRaw,
  onConversationFocusChange,
  providerLabel,
  organizationLabel,
  providerSpecialty,
  opportunityProductLine,
  productFitContent,
  manualCustomizeSlot,
  suggestContext,
}: {
  prep: EngagementWizardPrepView | null;
  prepLoading: boolean;
  prepRefreshing?: boolean;
  disabled?: boolean;
  isOfficeVisit: boolean;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  onWorkflowDraftChange: (draft: EngagementWorkflowDraft) => void;
  canApplySuggestedPlan?: boolean;
  onApplySuggestedPlan?: () => void;
  productLine?: string;
  onProductLineChange?: (productLine: string) => void;
  conversationFocusRaw?: string;
  onConversationFocusChange?: (serialized: string) => void;
  providerLabel: string;
  organizationLabel: string;
  providerSpecialty?: string | null;
  opportunityProductLine?: string | null;
  productFitContent?: React.ReactNode;
  manualCustomizeSlot?: React.ReactNode;
  suggestContext?: TemplateSuggestContext;
}) {
  const goal = prep?.suggested_goal;
  const opening = prep?.suggested_opening;
  const discovery = prep?.suggested_discovery;
  const isIntroCall = normalizeEngagementType(engagementType) === "intro_call";

  const hasAnySuggestion =
    Boolean(goal?.goal) ||
    (prep?.suggested_talking_points.points.length ?? 0) > 0 ||
    (prep?.future_observation_goals?.items.length ?? 0) > 0 ||
    (prep?.commercialization_signals?.signals.length ?? 0) > 0 ||
    (discovery?.questions.length ?? 0) > 0 ||
    Boolean(opening?.statement);

  if (prepLoading && !prep) {
    return (
      <div className="ew-prep-guidance ew-prep-guidance--compact" aria-busy="true">
        <p className="ew-prep-compact-status">Building your prep plan…</p>
      </div>
    );
  }

  if (!prep) {
    return null;
  }

  const prepContext = isIntroCall ? (prep.preparation_context ?? null) : null;
  const specializationClass = "";

  if (!isIntroCall) {
    return (
      <div className={`ew-prep-guidance ew-prep-guidance--compact${specializationClass}`} aria-label="Preparation guidance">
        <StrategicCompactPrepPlan
          prep={prep}
          disabled={disabled}
          isOfficeVisit={isOfficeVisit}
          engagementType={engagementType}
          workflowDraft={workflowDraft}
          onWorkflowDraftChange={onWorkflowDraftChange}
          manualCustomizeSlot={manualCustomizeSlot}
        />
        {!hasAnySuggestion ? (
          <p className="ew-prep-muted ew-prep-guidance-empty">
            Suggestions will appear when provider context is available.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`ew-prep-guidance ew-prep-guidance--compact${specializationClass}`}
      aria-label="Preparation guidance"
    >
      <IntroCallPreCallPlanPanel
        prep={prep}
        prepRefreshing={prepRefreshing}
        disabled={disabled}
        workflowDraft={workflowDraft}
        onWorkflowDraftChange={onWorkflowDraftChange}
        productLine={productLine ?? ""}
        onProductLineChange={onProductLineChange}
        providerLabel={providerLabel}
        organizationLabel={organizationLabel}
        providerSpecialty={providerSpecialty}
        opportunityProductLine={opportunityProductLine}
        conversationFocusRaw={conversationFocusRaw ?? ""}
        onConversationFocusChange={onConversationFocusChange}
        suggestContext={
          suggestContext ??
          ({
            productLine: (productLine ?? "") as TemplateSuggestContext["productLine"],
            opportunityProductLine: opportunityProductLine ?? null,
            providerSpecialty: providerSpecialty ?? null,
            opportunityStage: null,
            crmEngagementType: engagementType,
            organizationName: null,
            organizationType: null,
          } satisfies TemplateSuggestContext)
        }
        productFitContent={productFitContent}
        manualCustomizeSlot={manualCustomizeSlot}
      />
    </div>
  );
}

function notesLackSection(notes: string, header: string): boolean {
  const n = notes.toLowerCase();
  return !n.includes(header.toLowerCase());
}

export function canApplySuggestedStrategicPlan(
  prep: EngagementWizardPrepView | null,
  draft: EngagementWorkflowDraft,
  isOfficeVisit: boolean,
  engagementType?: string,
): boolean {
  if (!prep) return false;
  const isIntroCall = normalizeEngagementType(engagementType ?? "") === "intro_call";
  const probesKey = discoveryQuestionsWorkflowFieldKey(isOfficeVisit);
  const notes = String(draft.pre_observation_additional_notes ?? "").trim();
  const hasGoal = Boolean(prep.suggested_goal?.goal?.trim()) && !String(draft.observation_goal ?? "").trim();
  const hasTalking =
    prep.suggested_talking_points.points.length > 0 && notesLackSection(notes, "talking points");
  const hasObservationGoals =
    (prep.future_observation_goals?.items.length ?? 0) > 0 &&
    notesLackSection(notes, "future observation goals");
  const hasDiscovery =
    (prep.suggested_discovery?.questions.length ?? 0) > 0 && !String(draft[probesKey] ?? "").trim();
  const hasOpening =
    Boolean(prep.suggested_opening?.statement?.trim()) &&
    !String(draft.pre_observation_impact_opening_statement ?? "").trim();
  const hasOfficialFields =
    !String(draft.pre_observation_tools_resources ?? "").trim() ||
    !String(draft.pre_observation_value_hypothesis ?? "").trim() ||
    !String(draft.pre_observation_planned_close ?? "").trim();
  if (isIntroCall) {
    return hasGoal || hasDiscovery || hasOpening || hasOfficialFields;
  }
  return hasGoal || hasTalking || hasObservationGoals || hasDiscovery || hasOpening;
}

export function AdvancedPlanningSuggestions({
  prep,
  engagementType,
  workflowDraft,
  disabled,
  onWorkflowDraftChange,
}: {
  prep: EngagementWizardPrepView | null;
  engagementType: string;
  workflowDraft: EngagementWorkflowDraft;
  disabled?: boolean;
  onWorkflowDraftChange: (draft: EngagementWorkflowDraft) => void;
}) {
  const opening = prep?.suggested_opening;
  const applyOpening = React.useCallback(() => {
    const statement = opening?.statement?.trim();
    if (!statement) return;
    const key = openingStatementWorkflowFieldKey(engagementType, false);
    onWorkflowDraftChange({ ...workflowDraft, [key]: statement });
  }, [opening, engagementType, workflowDraft, onWorkflowDraftChange]);

  if (!opening?.statement) return null;

  return (
    <PrepSuggestionCard
      title="Suggested opening statement"
      actionLabel="Use suggestion"
      onAction={applyOpening}
      disabled={disabled}
      contextNote={opening.context_note}
      subdued
    >
      <p className="ew-prep-opening-text">&ldquo;{opening.statement}&rdquo;</p>
      {opening.alternate ? (
        <p className="ew-prep-opening-alt">
          <span className="ew-prep-opening-alt-label">Alternate:</span> &ldquo;{opening.alternate}&rdquo;
        </p>
      ) : null}
    </PrepSuggestionCard>
  );
}

export function buildSuggestedStrategicPlanPatch(
  prep: EngagementWizardPrepView,
  draft: EngagementWorkflowDraft,
  isOfficeVisit: boolean,
  engagementType?: string,
  options?: { productLine?: string; conversationFocusRaw?: string },
): EngagementWorkflowDraft {
  const next = { ...draft };
  const probesKey = discoveryQuestionsWorkflowFieldKey(isOfficeVisit);
  const isIntroCall = normalizeEngagementType(engagementType ?? "") === "intro_call";
  const introProductLine = String(options?.productLine ?? "").trim();
  const introFocus = parseIntroCallConversationFocus(options?.conversationFocusRaw);
  const introTemplateBase = isIntroCall
    ? buildIntroCallPrepTemplate({
        productFocus: resolveIntroCallProductFocus({
          productLine: introProductLine,
          intentionalProductFocus: Boolean(resolveExplicitPrepProductLine(introProductLine)),
        }),
        providerSpecialty: prep.provider_snapshot?.specialty ?? null,
      })
    : null;
  const introTemplate = introTemplateBase
    ? applyConversationFocusToTemplatePreview(introTemplateBase, introFocus)
    : null;

  if (prep.suggested_goal?.goal?.trim() && !String(next.observation_goal ?? "").trim()) {
    next.observation_goal = (introTemplate?.smartObjective ?? prep.suggested_goal.goal).trim();
  }
  const notesParts: string[] = [];
  const existingNotes = String(next.pre_observation_additional_notes ?? "").trim();

  if (
    prep.suggested_talking_points.points.length > 0 &&
    notesLackSection(existingNotes, "talking points")
  ) {
    const block = prep.suggested_talking_points.points
      .slice(0, MAX_TALKING_POINTS)
      .map((p) => `• ${p}`)
      .join("\n");
    notesParts.push(`Talking points:\n${block}`);
  }
  if (
    (prep.future_observation_goals?.items.length ?? 0) > 0 &&
    notesLackSection(existingNotes, "future observation goals")
  ) {
    const block = formatFutureObservationGoalsForField(prep.future_observation_goals!.items);
    notesParts.push(`Future observation goals:\n${block}`);
  }
  if (notesParts.length > 0) {
    next.pre_observation_additional_notes = existingNotes
      ? `${existingNotes}\n\n${notesParts.join("\n\n")}`
      : notesParts.join("\n\n");
  }
  if (
    ((introTemplate?.probesInformationToGather.length ?? 0) > 0 ||
      (prep.suggested_discovery?.questions.length ?? 0) > 0) &&
    !String(next[probesKey] ?? "").trim()
  ) {
    if (introTemplate) {
      const applied = applyIntroCallTemplateToDraft(next, introTemplate, { replace: false });
      Object.assign(next, applied);
    } else {
      next[probesKey] = formatDiscoveryQuestionsForField(prep.suggested_discovery!.questions);
    }
  }
  if (
    prep.suggested_opening?.statement?.trim() &&
    !String(next.pre_observation_impact_opening_statement ?? "").trim()
  ) {
    next.pre_observation_impact_opening_statement = (
      introTemplate?.impactOpeningStatement ?? prep.suggested_opening.statement
    ).trim();
  }
  if (introTemplate) {
    const applied = applyIntroCallTemplateToDraft(next, introTemplate, { replace: false });
    Object.assign(next, applied);
  }
  return next;
}

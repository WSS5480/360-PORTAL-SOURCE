/**
 * Discovery provider overview — obvious primary/secondary next actions.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderEngagementWorkflowAction,
  isDebriefWorkflowPhase,
  type ProviderEngagementWorkflowAction,
} from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import {
  buildRecordOutcomeAction,
  buildViewBriefingAction,
  ensureIncompleteEngagementTouchActions,
  hasIncompleteProviderEngagement,
  pickIncompleteProviderEngagement,
  PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
  PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL,
} from "@/lib/surgical-sales/buildProviderOverviewIncompleteEngagementActions";
import type { ProviderOverviewTacticalAction } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { hasCompletedIntroTouch } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { resolveObservationReadinessLevelForPlanning } from "@/lib/surgical-sales/deriveProviderObservationReadiness";
import {
  PROVIDER_ACCESS_FOLLOW_UP_CTA,
  providerPostIntroAccessWorkRemaining,
} from "@/lib/surgical-sales/providerObservationReadiness";
import { SCHEDULE_FIRST_OBSERVATION_LABEL } from "@/lib/surgical-sales/providerObservationProgress";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";

export const DISCOVERY_OVERVIEW_PRIMARY_LABEL = {
  openBriefing: PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL,
  continuePrep: "Continue Prep",
  logOutcome: PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
  startIntroCall: DISCOVERY_INTELLIGENCE_UI.startIntroCall,
  scheduleFirstObservation: SCHEDULE_FIRST_OBSERVATION_LABEL,
} as const;

import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";

export const ADD_OPTIONAL_INTELLIGENCE_LABEL = BRIEF.addFieldContext;

function resolveActiveEngagementPrimaryAction(input: {
  workflow: ProviderEngagementWorkflowAction | null;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewTacticalAction | null {
  const workflow = input.workflow;
  const engagement = pickIncompleteProviderEngagement({
    engagements: input.engagements,
    workflow,
  });
  if (!engagement) return null;

  if (workflow?.engagementId && workflow.ctaHref) {
    if (isDebriefWorkflowPhase(workflow.phase)) {
      return buildRecordOutcomeAction({
        engagement,
        label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.logOutcome,
        emphasis: "primary",
      });
    }

    if (workflow.phase === "prepare") {
      return {
        id: "continue-prep",
        label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.continuePrep,
        href: workflow.ctaHref,
        kind: "link",
        emphasis: "primary",
      };
    }

    const label =
      workflow.phase === "run_touch" ||
      /briefing|prepare|open|view/i.test(workflow.ctaLabel)
        ? DISCOVERY_OVERVIEW_PRIMARY_LABEL.openBriefing
        : workflow.ctaLabel.trim() || DISCOVERY_OVERVIEW_PRIMARY_LABEL.openBriefing;

    return {
      id: "view-briefing",
      label,
      href: workflow.ctaHref,
      kind: "link",
      emphasis: "primary",
    };
  }

  return buildViewBriefingAction({
    engagement,
    label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.openBriefing,
    emphasis: "primary",
  });
}

function buildIncompleteEngagementDiscoveryActions(input: {
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
  briefingHref: string;
}): ProviderOverviewTacticalAction[] {
  const engagement = pickIncompleteProviderEngagement({
    engagements: input.engagements,
    workflow: input.workflow,
  });
  if (!engagement) return [];

  const actions: ProviderOverviewTacticalAction[] = [];
  const primary =
    resolveActiveEngagementPrimaryAction({
      workflow: input.workflow,
      engagements: input.engagements,
    }) ??
    buildViewBriefingAction({
      engagement,
      label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.openBriefing,
      emphasis: "primary",
    });

  actions.push(primary);

  return ensureIncompleteEngagementTouchActions(actions, {
    engagements: input.engagements,
    workflow: input.workflow,
    briefingLabel: DISCOVERY_OVERVIEW_PRIMARY_LABEL.openBriefing,
    outcomeLabel: DISCOVERY_OVERVIEW_PRIMARY_LABEL.logOutcome,
  });
}

function resolveContactProviderId(
  contact: Record<string, unknown>,
  newEngagementHref: string,
): string {
  const fromContact = String(contact.id ?? "").trim();
  if (fromContact) return fromContact;
  try {
    return new URL(newEngagementHref, "http://local").searchParams.get("provider_id") ?? "";
  } catch {
    return "";
  }
}

function resolveContactAccountId(contact: Record<string, unknown>): string {
  return String(
    contact.primary_organization_id ?? contact.organization_id ?? contact.account_id ?? "",
  ).trim();
}


export function buildDiscoveryProviderOverviewActions(input: {
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
  briefingHref: string;
  newEngagementHref: string;
  contact: Record<string, unknown>;
}): ProviderOverviewTacticalAction[] {
  const contact = input.contact ?? {};
  const readinessLevel = resolveObservationReadinessLevelForPlanning(contact);
  const actions: ProviderOverviewTacticalAction[] = [];

  if (hasIncompleteProviderEngagement(input)) {
    return buildIncompleteEngagementDiscoveryActions(input);
  }

  if (readinessLevel === "ready") {
    // "Add First Observation Case" must create an observation case — not an
    // or_visit engagement (label/behavior mismatch fixed per creation audit).
    actions.push({
      id: "schedule-first-observation",
      label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.scheduleFirstObservation,
      href: buildProviderObservationCaseHref({
        providerId: resolveContactProviderId(contact, input.newEngagementHref),
        accountId: resolveContactAccountId(contact),
      }),
      kind: "link",
      emphasis: "primary",
    });
    return actions;
  }

  if (
    hasCompletedIntroTouch(input.engagements) &&
    providerPostIntroAccessWorkRemaining(contact)
  ) {
    actions.push({
      id: "start-access-follow-up",
      label: PROVIDER_ACCESS_FOLLOW_UP_CTA,
      href: buildProviderEngagementTypeHref(input.newEngagementHref, "follow_up"),
      kind: "link",
      emphasis: "primary",
    });
    return actions;
  }

  actions.push({
    id: "start-intro-call",
    label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.startIntroCall,
    href: buildProviderEngagementTypeHref(input.newEngagementHref, "intro_call"),
    kind: "link",
    emphasis: "primary",
  });
  return actions;
}

export function resolveDiscoveryProviderOverviewWorkflow(input: {
  engagements?: ProviderEngagementSummary[];
  briefingHref: string;
  newEngagementHref: string;
  contact: Record<string, unknown>;
}): ProviderEngagementWorkflowAction | null {
  return buildProviderEngagementWorkflowAction({
    engagements: input.engagements,
    briefingHref: input.briefingHref,
    fallbackAction: {
      label: DISCOVERY_OVERVIEW_PRIMARY_LABEL.startIntroCall,
      href: buildProviderEngagementTypeHref(input.newEngagementHref, "intro_call"),
      reason: "",
    },
  });
}

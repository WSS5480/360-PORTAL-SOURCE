/**
 * Mission Mode — mobile-first field execution brief (pathway + touch aware).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  resolveProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  buildProviderFieldBriefingAsks,
  buildFieldBriefingLearnChips,
  fieldBriefingLogResponseHref,
  type ProviderFieldBriefingAsk,
} from "@/lib/surgical-sales/buildProviderFieldBriefingAsks";
import {
  fieldBriefingAvoidForTouch,
  fieldBriefingObjectiveForTouch,
  type FieldBriefingActiveTouch,
} from "@/lib/surgical-sales/providerFieldBriefingTouch";
import { buildProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import { softenBriefingRiskToCoaching } from "@/lib/surgical-sales/providerFieldBriefingCoachingCopy";
import { sanitizeIntelligenceTabUserCopy } from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { buildProviderOverviewLatestFieldIntelligence } from "@/lib/surgical-sales/buildProviderOverviewLatestFieldIntelligence";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { buildProviderOverviewBody } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { buildProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import {
  buildSalesPathwayRequirements,
  resolveSalesPathwayStage,
  SALES_PATHWAY_STAGE_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/providerSalesPathwayExecution";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export const PROVIDER_MISSION_MODE_TITLE = "Mission Mode";

export const PROVIDER_MISSION_MODE_SECTION = {
  todaysObjective: "Today's objective",
  questionsToAsk: "Questions to ask",
  thingsToAvoid: "Things to avoid",
  mustLearn: "What must be learned",
  quickActions: "Quick actions",
} as const;

export type MissionModeQuickActionKind =
  | "dictation"
  | "log_update"
  | "follow_up"
  | "confirm_requirement";

export type MissionModeQuickAction = {
  id: string;
  kind: MissionModeQuickActionKind;
  label: string;
  primary?: boolean;
};

export type ProviderMissionMode = {
  pathwayStageId: SalesPathwayStageId;
  pathwayStageLabel: string;
  touchLabel: string | null;
  touchWhen: string | null;
  todaysObjective: string;
  questions: ProviderFieldBriefingAsk[];
  avoid: string[];
  mustLearn: string[];
  quickActions: MissionModeQuickAction[];
  confirmRequirementHref: string | null;
  confirmRequirementLabel: string | null;
  followUpHref: string;
};

const PATHWAY_OBJECTIVE_CANDIDATES: Record<SalesPathwayStageId, string[]> = {
  discovery: [
    "Identify scheduler",
    "Understand procedure mix",
    "Map OR access rules",
    "Validate workflow fit",
  ],
  observe: [
    "Gain OR observation approval",
    "Confirm credentialing path",
    "Lock observation window",
    "Validate OR workflow on case day",
  ],
  debrief: [
    "Capture observation learning",
    "Confirm workflow fit",
    "Book debrief touch",
    "Name next pathway owner",
  ],
  evaluation: [
    "Validate product fit in live cases",
    "Map evaluation logistics",
    "Confirm trial willingness",
    "Identify decision path",
  ],
  commitment: [
    "Secure preference-card path",
    "Identify champion",
    "Schedule supported case",
    "Confirm repeat-use rhythm",
  ],
  outcomes: [
    "Sustain supported case volume",
    "Capture expansion signal",
    "Maintain validated intelligence",
  ],
};

const PATHWAY_AVOID: Record<SalesPathwayStageId, readonly string[]> = {
  discovery: [
    "Do not discuss pricing yet",
    "Do not ask for commitment",
    "Avoid deep product demos before access is mapped",
  ],
  observe: [
    "Do not promise a case day before access is approved",
    "Avoid product pitch before observation is cleared",
    "Do not skip who owns scheduling",
  ],
  debrief: [
    "Do not re-pitch product before capturing what you learned",
    "Avoid scheduling OR time without a dated next step",
    "Do not leave without naming the pathway owner",
  ],
  evaluation: [
    "Do not discuss contract terms on case day",
    "Avoid expanding scope before trial logistics are clear",
    "Do not skip who moves evaluation forward",
  ],
  commitment: [
    "Do not pressure preference-card before champion proof",
    "Avoid new access asks without a path owner",
    "Do not skip supported-case scheduling",
  ],
  outcomes: [
    "Do not treat the account as fully closed — capture expansion signals",
    "Avoid skipping intelligence refresh between case blocks",
  ],
};

const MUST_LEARN_BY_STAGE: Record<SalesPathwayStageId, string[]> = {
  discovery: ["Who owns scheduling", "OR access rules", "Procedure mix", "Observation process"],
  observe: ["OR access rules", "Credentialing path", "Case type for first observation", "Scheduling lead time"],
  debrief: ["Workflow fit signal", "What blocks next stage", "Who owns next touch", "Observation takeaway"],
  evaluation: ["Trial logistics", "Decision path", "Product fit signal", "Evaluation timeline"],
  commitment: ["Preference-card path", "Champion proof", "Supported case rhythm", "Expansion signal"],
  outcomes: ["Repeat use pattern", "Case volume trend", "Champion durability", "Next expansion lane"],
};

function defaultEngagementTypeForPathway(stageId: SalesPathwayStageId): string {
  switch (stageId) {
    case "discovery":
      return "intro_call";
    case "observe":
      return "observation_request";
    case "debrief":
      return "follow_up";
    case "evaluation":
      return "product_demo";
    case "commitment":
      return "follow_up";
    case "outcomes":
      return "follow_up";
    default:
      return "intro_call";
  }
}

function resolveEngagementType(
  activeTouch: FieldBriefingActiveTouch | null,
  stageId: SalesPathwayStageId,
): string {
  if (activeTouch?.engagementType) {
    return normalizeEngagementType(activeTouch.engagementType) || activeTouch.engagementType;
  }
  return defaultEngagementTypeForPathway(stageId);
}

function buildTodaysObjective(input: {
  stageId: SalesPathwayStageId;
  engagementType: string;
  requirements: ReturnType<typeof buildSalesPathwayRequirements>;
  recentLearningLine: string | null;
}): string {
  const touchObjective = fieldBriefingObjectiveForTouch(input.engagementType);
  const firstOpen = input.requirements.find((r) => !r.met)?.label;
  if (firstOpen) return scanLine(firstOpen, 72);

  const candidates = PATHWAY_OBJECTIVE_CANDIDATES[input.stageId];
  if (input.recentLearningLine && /schedul|access|credential|observation/i.test(input.recentLearningLine)) {
    const accessObjective = candidates.find((c) => /access|observation|schedul/i.test(c));
    if (accessObjective) return accessObjective;
  }

  return candidates[0] ?? touchObjective;
}

function buildMustLearn(input: {
  stageId: SalesPathwayStageId;
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  engagementType: string;
  questionIds: string[];
  validatingLines: string[];
}): string[] {
  const chips = buildFieldBriefingLearnChips({
    contact: input.contact,
    planning: input.planning,
    engagementType: input.engagementType,
    excludeDbKeys: input.questionIds,
    limit: 4,
  }).map((c) => c.label);

  const stageDefaults = MUST_LEARN_BY_STAGE[input.stageId];
  const merged: string[] = [];
  const seen = new Set<string>();

  const push = (line: string) => {
    const t = scanLine(line, 48);
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(t);
  };

  for (const line of chips) push(line);
  for (const line of input.validatingLines.slice(0, 3)) push(line);
  for (const line of stageDefaults) {
    push(line);
    if (merged.length >= 5) break;
  }

  return merged.slice(0, 5);
}

function buildAvoidLines(input: {
  stageId: SalesPathwayStageId;
  engagementType: string;
  contextualLine: string | null;
}): string[] {
  const touchAvoid = fieldBriefingAvoidForTouch(input.engagementType, input.contextualLine, 3);
  const stageAvoid = PATHWAY_AVOID[input.stageId].map((line) => scanLine(line, 96));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [...touchAvoid, ...stageAvoid]) {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= 4) break;
  }
  return out;
}

function intelligenceHrefWithSection(
  intelligenceHref: string,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  const base = intelligenceHref.includes("?") ? intelligenceHref : `${intelligenceHref}?`;
  const u = new URL(base, "http://local");
  u.searchParams.set("tab", "intelligence");
  if (sectionId) u.searchParams.set("planning_section", sectionId);
  return `${u.pathname}${u.search}`;
}

export function buildProviderMissionMode(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  intelligenceHref: string;
  newEngagementHref: string;
  providerId: string;
  activeTouch: FieldBriefingActiveTouch | null;
}): ProviderMissionMode {
  const relationshipStage = String(
    input.relationshipStage ?? input.contact.provider_relationship_stage ?? "early_discovery",
  )
    .trim()
    .toLowerCase();

  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const stageId = resolveSalesPathwayStage({
    relationshipStage,
    commercialStage,
    contact: input.contact,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const requirements = buildSalesPathwayRequirements({
    contact: input.contact,
    planning: input.planning,
    relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const engagementType = resolveEngagementType(input.activeTouch, stageId);

  const protect = buildProtectFieldTimeAssessment({
    contact: input.contact,
    relationshipStage,
    commercialStage,
    engagements: input.engagements,
  });
  const contextualAvoid =
    protect.fieldTimeRisk.state === "efficient_field_target"
      ? null
      : softenBriefingRiskToCoaching(protect.topThreat?.scan ?? protect.headline ?? null);

  const learnings = buildProviderOverviewLatestFieldIntelligence({
    contact: input.contact,
    commercialStage,
    engagements: input.engagements,
  });
  const recentLearningLine = learnings[0]?.line ?? null;

  const narrative = buildProviderOverviewNarrative({
    providerId: input.providerId,
    contact: input.contact,
    relationshipStage,
    planning: input.planning,
    engagements: input.engagements ?? [],
    cases: input.cases,
    opportunities: input.opportunities,
    newEngagementHref: input.newEngagementHref,
    newCaseHref: input.newEngagementHref,
    intelligenceHref: input.intelligenceHref,
    createOpportunityHref: input.newEngagementHref,
  });

  const overviewBody = buildProviderOverviewBody({
    narrative,
    contact: input.contact,
    providerId: input.providerId,
    intelligenceHref: input.intelligenceHref,
    briefingHref: input.intelligenceHref,
    newEngagementHref: input.newEngagementHref,
    activityHref: input.intelligenceHref,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
    planning: input.planning,
  });

  const questions = buildProviderFieldBriefingAsks({
    contact: input.contact,
    planning: input.planning,
    engagementType,
    relationshipStage,
    commercialStage,
    limit: 5,
  }).slice(0, 5);

  const mustLearn = buildMustLearn({
    stageId,
    contact: input.contact,
    planning: input.planning,
    engagementType,
    questionIds: questions.map((q) => q.id),
    validatingLines: overviewBody.whatWeKnow.validating.map((item) => item.label),
  });

  const firstOpenReq = requirements.find((r) => !r.met);
  const confirmRequirementHref = firstOpenReq?.sectionId
    ? intelligenceHrefWithSection(input.intelligenceHref, firstOpenReq.sectionId)
    : firstOpenReq
      ? intelligenceHrefWithSection(input.intelligenceHref, "observation_readiness")
      : null;

  const followUpHref =
    input.activeTouch?.prepareHref ??
    input.activeTouch?.createEngagementHref ??
    input.newEngagementHref;

  const quickActions: MissionModeQuickAction[] = [
    { id: "dictation", kind: "dictation", label: "Start dictation", primary: true },
    ...(LOG_UPDATE_UI_ENABLED
      ? [{ id: "log", kind: "log_update" as const, label: "Log update" }]
      : []),
  ];

  if (firstOpenReq && confirmRequirementHref) {
    quickActions.push({
      id: "confirm",
      kind: "confirm_requirement",
      label: "Mark requirement confirmed",
    });
  }

  const touch = input.activeTouch;

  return {
    pathwayStageId: stageId,
    pathwayStageLabel: SALES_PATHWAY_STAGE_LABELS[stageId],
    touchLabel: touch?.touchLabel ?? null,
    touchWhen: touch?.whenLabel ?? null,
    todaysObjective: sanitizeIntelligenceTabUserCopy(
      buildTodaysObjective({
        stageId,
        engagementType,
        requirements,
        recentLearningLine,
      }),
    ),
    questions: questions.map((q) => ({
      ...q,
      text: sanitizeIntelligenceTabUserCopy(q.text),
    })),
    avoid: buildAvoidLines({ stageId, engagementType, contextualLine: contextualAvoid }).map((line) =>
      sanitizeIntelligenceTabUserCopy(line),
    ),
    mustLearn: mustLearn.map((line) => sanitizeIntelligenceTabUserCopy(line)),
    quickActions,
    confirmRequirementHref,
    confirmRequirementLabel: firstOpenReq?.label ?? null,
    followUpHref,
  };
}

export { fieldBriefingLogResponseHref };

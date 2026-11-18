import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import {
  buildObservationIntelligenceView,
  hasObservationIntelligenceContent,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import {
  buildObservationMissionBriefing,
  type ObservationMissionBriefingPillarId,
  type ObservationMissionBriefingPillarStatus,
} from "@/lib/surgical-sales/buildObservationMissionBriefing";
import { OBSERVATION_MISSION_BRIEFING_SECTION_LABELS } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { observationBriefingStatusLabel } from "@/lib/surgical-sales/observationBriefingSections";
import { GENERATE_DEBRIEF_LABEL } from "@/lib/surgical-sales/observationProgramGate";

export type ObservationDiscoveryFocusStatus = "confirmed" | "pending";

export type ObservationDiscoveryFocusItem = {
  id: ObservationMissionBriefingPillarId;
  label: string;
  value: string;
  status: ObservationDiscoveryFocusStatus;
  completionLabel: string;
  pillarStatus: ObservationMissionBriefingPillarStatus;
};

/** @deprecated Use ObservationDiscoveryFocusItem */
export type ObservationReadinessItem = ObservationDiscoveryFocusItem;

/** @deprecated Use ObservationDiscoveryFocusStatus */
export type ObservationReadinessStatus = ObservationDiscoveryFocusStatus;

export type ObservationIntelligenceMetricId =
  | "pain_points"
  | "competitors"
  | "workflow_issues"
  | "product_signals";

export type ObservationIntelligenceMetricStatus = "watch" | "identified";

export type ObservationIntelligenceMetric = {
  id: ObservationIntelligenceMetricId;
  label: string;
  shortLabel: string;
  count: number;
  status: ObservationIntelligenceMetricStatus;
  statusLabel: string;
};

export type ObservationSidebarActionId =
  | "perform_observation"
  | "capture_notes"
  | "review_intelligence"
  | "plan_debrief";

export type ObservationSidebarRecommendedAction = {
  id: ObservationSidebarActionId;
  label: string;
};

export type ObservationCaseSidebarView = {
  discoveryFocus: ObservationDiscoveryFocusItem[];
  /** @deprecated Use discoveryFocus */
  readiness: ObservationDiscoveryFocusItem[];
  intelligenceMetrics: ObservationIntelligenceMetric[];
  totalIntelligenceSignals: number;
  recommendedAction: ObservationSidebarRecommendedAction;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function caseStatus(caseRow: Record<string, unknown>): string {
  return String(caseRow.status ?? "").trim().toLowerCase();
}

function countObservationNotes(activities: Array<{ activity_type?: string }> | undefined): number {
  return (activities ?? []).filter(
    (activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note",
  ).length;
}

function buildDiscoveryFocusItems(input: {
  identity: CaseIdentity;
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string }>;
}): ObservationDiscoveryFocusItem[] {
  const briefing = buildObservationMissionBriefing({
    identity: input.identity,
    caseRow: input.caseRow,
    engagement: input.engagement,
    activities: input.activities,
  });

  const shortLabels: Record<ObservationMissionBriefingPillarId, string> = {
    why_here: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.whyHere,
    watch_signals: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.watchSignals,
    still_to_learn: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.stillToLearn,
    opportunities: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.opportunities,
    after_observation: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.afterObservation,
  };

  return briefing.pillars
    .filter((pillar) => pillar.id === "why_here" || pillar.id === "watch_signals")
    .map((pillar) => ({
    id: pillar.id,
    label: shortLabels[pillar.id],
    value:
      pillar.items[0] ??
      (pillar.status === "needs_input" ? "Tap to add" : observationBriefingStatusLabel(pillar.status)),
    status: pillar.status === "needs_input" ? "pending" : "confirmed",
    completionLabel: observationBriefingStatusLabel(pillar.status),
    pillarStatus: pillar.status,
  }));
}
function hasObservationFieldCapture(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string }>;
}): boolean {
  if (hasObservationIntelligenceContent(input.caseRow)) return true;
  return countObservationNotes(input.activities) > 0;
}

function resolveIntelligenceMetricPresentation(
  id: ObservationIntelligenceMetricId,
  count: number,
  hasCapture: boolean,
): Pick<ObservationIntelligenceMetric, "status" | "statusLabel"> {
  if (count > 0) {
    return {
      status: "identified",
      statusLabel: `${count} identified`,
    };
  }

  if (id === "pain_points") {
    return {
      status: "watch",
      statusLabel: hasCapture ? "None identified" : "None identified yet",
    };
  }

  return {
    status: "watch",
    statusLabel: "Not observed",
  };
}

export function buildObservationIntelligenceSidebarMetrics(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string }>;
}): ObservationIntelligenceMetric[] {
  const view = buildObservationIntelligenceView(input.caseRow);
  const counts = Object.fromEntries(view.categories.map((category) => [category.id, category.items.length]));
  const hasCapture = hasObservationFieldCapture(input);

  const specs: Array<{ id: ObservationIntelligenceMetricId; label: string; shortLabel: string; countKey: string }> = [
    {
      id: "pain_points",
      label: "Pain Points Identified",
      shortLabel: "Pain Points",
      countKey: "clinical_pain_points",
    },
    {
      id: "competitors",
      label: "Competitor Products Seen",
      shortLabel: "Competitors",
      countKey: "competitor_products",
    },
    {
      id: "workflow_issues",
      label: "Workflow Friction Identified",
      shortLabel: "Workflow Issues",
      countKey: "workflow_friction",
    },
    {
      id: "product_signals",
      label: "Product Signals Identified",
      shortLabel: "Product Signals",
      countKey: "product_fit_signals",
    },
  ];

  return specs.map((spec) => {
    const count = counts[spec.countKey] ?? 0;
    const presentation = resolveIntelligenceMetricPresentation(spec.id, count, hasCapture);
    return {
      id: spec.id,
      label: spec.label,
      shortLabel: spec.shortLabel,
      count,
      ...presentation,
    };
  });
}

export function deriveObservationCaseSidebarAction(input: {
  caseRow: Record<string, unknown>;
  identity: CaseIdentity;
  activities?: Array<{ activity_type?: string }>;
  today?: string;
}): ObservationSidebarRecommendedAction {
  const today = input.today ?? utcToday();
  const caseRow = input.caseRow;
  const st = caseStatus(caseRow);
  const caseDate = String(caseRow.case_date ?? "").trim();
  const noteCount = countObservationNotes(input.activities);
  const hasIntelligence = hasObservationIntelligenceContent(caseRow);
  const readyForDebrief = input.identity.readyForDebrief;
  const isUpcoming = Boolean(caseDate && caseDate > today);
  const isCaseDay = caseDate === today;
  const isPast = Boolean(caseDate && caseDate < today);

  if (!isSurgicalObservationCase(caseRow.case_type)) {
    return { id: "review_intelligence", label: "Review Intelligence" };
  }

  if (readyForDebrief) {
    return { id: "plan_debrief", label: GENERATE_DEBRIEF_LABEL };
  }

  if (
    st === "completed" ||
    st === "docs_needed" ||
    st === "billing_review" ||
    (isPast && noteCount > 0)
  ) {
    if (hasIntelligence && noteCount > 0) {
      return { id: "review_intelligence", label: "Review Intelligence" };
    }
    if (noteCount === 0) {
      return { id: "capture_notes", label: "Capture Observation Notes" };
    }
    return { id: "review_intelligence", label: "Review Intelligence" };
  }

  if (isUpcoming && (st === "scheduled" || st === "confirmed" || st === "draft")) {
    return { id: "perform_observation", label: "Perform Observation" };
  }

  if (hasIntelligence && noteCount > 0) {
    return { id: "review_intelligence", label: "Review Intelligence" };
  }

  if (isCaseDay || isPast || noteCount === 0) {
    return { id: "capture_notes", label: "Capture Observation Notes" };
  }

  return { id: "perform_observation", label: "Perform Observation" };
}

export function buildObservationCaseSidebarView(input: {
  identity: CaseIdentity;
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string }>;
  today?: string;
}): ObservationCaseSidebarView {
  const discoveryFocus = buildDiscoveryFocusItems(input);
  const intelligenceMetrics = buildObservationIntelligenceSidebarMetrics({
    caseRow: input.caseRow,
    activities: input.activities,
  });
  const totalIntelligenceSignals = intelligenceMetrics.reduce((sum, metric) => sum + metric.count, 0);

  return {
    discoveryFocus,
    readiness: discoveryFocus,
    intelligenceMetrics,
    totalIntelligenceSignals,
    recommendedAction: deriveObservationCaseSidebarAction(input),
  };
}

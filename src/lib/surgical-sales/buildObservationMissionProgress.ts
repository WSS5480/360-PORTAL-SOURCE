import {
  buildObservationIntelligenceView,
  hasObservationIntelligenceContent,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";

export type ObservationMissionProgressTrackId =
  | "current_products"
  | "competitor_presence"
  | "workflow_bottlenecks"
  | "staff_frustrations"
  | "product_opportunity";

export type ObservationMissionProgressTrackStatus = "confirmed" | "partial" | "missing";

export type ObservationMissionProgressTrack = {
  id: ObservationMissionProgressTrackId;
  label: string;
  status: ObservationMissionProgressTrackStatus;
  statusIcon: "✓" | "⚠" | "○";
  statusLabel: string;
  signalCount: number;
};

export type ObservationMissionProgressView = {
  title: string;
  percentComplete: number;
  percentLabel: string;
  tracks: ObservationMissionProgressTrack[];
  confirmedCount: number;
  partialCount: number;
  missingCount: number;
};

export const OBSERVATION_MISSION_PROGRESS_TITLE = "Observation Mission";

function fieldHasContent(value: unknown): boolean {
  return Boolean(String(value ?? "").trim());
}

function categoryCount(
  categories: Array<{ id: string; items: string[] }>,
  id: string,
): number {
  return categories.find((category) => category.id === id)?.items.length ?? 0;
}

function briefingMentionsDimension(
  caseRow: Record<string, unknown>,
  pattern: RegExp,
): boolean {
  const sources = [
    String(caseRow.observation_signals_to_validate ?? ""),
    String(caseRow.observation_learning_questions ?? ""),
    String(caseRow.observation_objectives ?? ""),
    String(caseRow.observation_opportunity_hypotheses ?? ""),
  ];
  return sources.some((source) => pattern.test(source));
}

function resolveTrackPresentation(input: {
  signalCount: number;
  liveFieldCaptured: boolean;
  hasAnyCapture: boolean;
  briefingRelevant: boolean;
}): Pick<ObservationMissionProgressTrack, "status" | "statusIcon" | "statusLabel"> {
  const captured = input.signalCount > 0 || input.liveFieldCaptured;

  if (captured) {
    return {
      status: "confirmed",
      statusIcon: "✓",
      statusLabel: input.signalCount > 0 ? `${input.signalCount} captured` : "Captured",
    };
  }

  if (input.hasAnyCapture || input.briefingRelevant) {
    return {
      status: "partial",
      statusIcon: "⚠",
      statusLabel: input.hasAnyCapture ? "Still open" : "Watch target",
    };
  }

  return {
    status: "missing",
    statusIcon: "○",
    statusLabel: "Not started",
  };
}


export function buildObservationMissionProgress(input: {
  caseRow: Record<string, unknown>;
}): ObservationMissionProgressView {
  const intelligence = buildObservationIntelligenceView(input.caseRow);
  const categories = intelligence.categories;
  const hasAnyCapture = hasObservationIntelligenceContent(input.caseRow);

  const productCount = categoryCount(categories, "product_fit_signals");
  const competitorCount = categoryCount(categories, "competitor_products");
  const workflowCount = categoryCount(categories, "workflow_friction");
  const staffCount = categoryCount(categories, "staff_observations");
  const opportunityCount = categoryCount(categories, "growth_opportunities");

  const trackSpecs: Array<{
    id: ObservationMissionProgressTrackId;
    label: string;
    signalCount: number;
    liveFieldCaptured: boolean;
    briefingRelevant: boolean;
  }> = [
    {
      id: "current_products",
      label: "Current Products Used",
      signalCount: productCount,
      liveFieldCaptured: fieldHasContent(input.caseRow.live_observation_product_fit),
      briefingRelevant: briefingMentionsDimension(
        input.caseRow,
        /product|utilization|preference card|tray|vendor/i,
      ),
    },
    {
      id: "competitor_presence",
      label: "Competitor Presence",
      signalCount: competitorCount,
      liveFieldCaptured: fieldHasContent(input.caseRow.live_observation_competitors),
      briefingRelevant: briefingMentionsDimension(input.caseRow, /competitor|rival|vendor tray/i),
    },
    {
      id: "workflow_bottlenecks",
      label: "Workflow Bottlenecks",
      signalCount: workflowCount,
      liveFieldCaptured: fieldHasContent(input.caseRow.live_observation_workflow),
      briefingRelevant: briefingMentionsDimension(
        input.caseRow,
        /workflow|bottleneck|friction|workaround|turnover|setup/i,
      ),
    },
    {
      id: "staff_frustrations",
      label: "Staff Frustrations",
      signalCount: staffCount,
      liveFieldCaptured: fieldHasContent(input.caseRow.live_observation_staff_process),
      briefingRelevant: briefingMentionsDimension(input.caseRow, /staff|nursing|tech|team/i),
    },
    {
      id: "product_opportunity",
      label: "Product Fit",
      signalCount: opportunityCount,
      liveFieldCaptured:
        fieldHasContent(input.caseRow.debrief_product_opportunity_identified) ||
        fieldHasContent(input.caseRow.observation_opportunity_hypotheses),
      briefingRelevant: briefingMentionsDimension(
        input.caseRow,
        /opportunity|growth|fit|switch|expand/i,
      ),
    },
  ];

  const tracks: ObservationMissionProgressTrack[] = trackSpecs.map((spec) => {
    const presentation = resolveTrackPresentation({
      signalCount: spec.signalCount,
      liveFieldCaptured: spec.liveFieldCaptured,
      hasAnyCapture,
      briefingRelevant: spec.briefingRelevant,
    });

    return {
      id: spec.id,
      label: spec.label,
      signalCount: spec.signalCount,
      ...presentation,
    };
  });

  const confirmedCount = tracks.filter((track) => track.status === "confirmed").length;
  const partialCount = tracks.filter((track) => track.status === "partial").length;
  const missingCount = tracks.filter((track) => track.status === "missing").length;
  const percentComplete =
    confirmedCount > 0 ? Math.round((confirmedCount / tracks.length) * 100) : 0;
  const evidenceSummary =
    confirmedCount > 0
      ? `${confirmedCount} of ${tracks.length} dimensions captured`
      : partialCount > 0
        ? `${partialCount} in progress · ${missingCount} open`
        : `${missingCount} dimensions to capture`;

  return {
    title: OBSERVATION_MISSION_PROGRESS_TITLE,
    percentComplete,
    percentLabel: evidenceSummary,
    tracks,
    confirmedCount,
    partialCount,
    missingCount,
  };
}

import { buildProviderObservationCaseWorkflowHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  buildProviderObservationCaseRollup,
  buildProviderObservationCaseQueueHref,
  formatObservationProgressSummary,
  type ProviderObservationCasePreview,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";

export type ProviderOverviewObservationMissionActionId =
  | "open_next"
  | "mark_complete"
  | "dictate_complete"
  | "add_observation";

export type ProviderOverviewObservationMissionAction = {
  id: ProviderOverviewObservationMissionActionId;
  label: string;
  href?: string;
  caseId?: string;
};

export type ProviderOverviewObservationMissionView = {
  headerProgress: string;
  missionObjective: string;
  hasScheduledCases: boolean;
  nextObservation: {
    caseId: string;
    procedureLabel: string;
    metaLine: string;
    statusLabel: string;
  } | null;
  emptyMessage: string | null;
  actions: ProviderOverviewObservationMissionAction[];
  viewAllHref: string | null;
  viewAllLabel: string | null;
};

export function resolveObservationMissionFacilityLabel(input: {
  contact: Record<string, unknown>;
  previewFacility?: string | null;
  caseRow?: Record<string, unknown>;
}): string | null {
  const candidates = [
    input.previewFacility,
    input.contact.primary_organization_name,
    input.contact.organization_name,
    input.contact.account_name,
    input.caseRow?.facility_name,
    input.caseRow?.organization_name,
    input.caseRow?.account_name,
  ];

  for (const candidate of candidates) {
    const label = String(candidate ?? "").trim();
    if (label && !/^no organization$/i.test(label)) {
      return label;
    }
  }

  return null;
}

function formatNextObservationMetaLine(
  preview: ProviderObservationCasePreview,
  facilityLabel: string | null,
): string {
  const parts: string[] = [];

  if (preview.caseDate) {
    const parsed = new Date(`${preview.caseDate}T12:00:00`);
    parts.push(
      Number.isNaN(parsed.getTime())
        ? preview.caseDate
        : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    );
  } else if (preview.dateTimeLabel) {
    parts.push(preview.dateTimeLabel.split("·")[0]?.trim() || preview.dateTimeLabel);
  }

  if (facilityLabel) {
    parts.push(facilityLabel);
  }

  return parts.join(" · ");
}

function resolveNextObservationPreview(input: {
  contact: Record<string, unknown>;
  cases?: Array<Record<string, unknown>>;
  facilityLabel: string | null;
  rollup: ReturnType<typeof buildProviderObservationCaseRollup>;
}): ProviderOverviewObservationMissionView["nextObservation"] {
  const preview = input.rollup.nextScheduled;
  if (!preview?.caseId) return null;

  const caseRow = input.cases?.find((row) => String(row.id ?? "") === preview.caseId);
  const facilityLabel =
    resolveObservationMissionFacilityLabel({
      contact: input.contact,
      previewFacility: preview.facilityLabel,
      caseRow,
    }) ?? input.facilityLabel;

  return {
    caseId: preview.caseId,
    procedureLabel: preview.procedureLabel || "Procedure TBD",
    metaLine: formatNextObservationMetaLine(preview, facilityLabel),
    statusLabel: preview.statusLabel,
  };
}

export function buildProviderOverviewObservationMissionView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  cases?: Array<Record<string, unknown>>;
  completedCount: number;
  addObservationHref: string;
}): ProviderOverviewObservationMissionView {
  const facilityLabel = resolveObservationMissionFacilityLabel({ contact: input.contact });
  const rollup = buildProviderObservationCaseRollup({
    cases: input.cases,
    facilityLabel: facilityLabel ?? "No organization",
    completedCount: input.completedCount,
    progressTotal: PROVIDER_OBSERVATION_TARGET,
  });

  const nextObservation = resolveNextObservationPreview({
    contact: input.contact,
    cases: input.cases,
    facilityLabel,
    rollup,
  });

  const headerProgress = formatObservationProgressSummary(rollup);
  const missionObjective = `Complete ${PROVIDER_OBSERVATION_TARGET} observed cases.`;
  const hasScheduledCases = rollup.upcomingCount > 0;

  const actions: ProviderOverviewObservationMissionAction[] = [];
  if (hasScheduledCases && nextObservation) {
    actions.push({
      id: "open_next",
      label: "Open Next Case",
      href: buildProviderObservationCaseWorkflowHref(nextObservation.caseId),
      caseId: nextObservation.caseId,
    });
    actions.push({
      id: "mark_complete",
      label: "Mark Complete",
      caseId: nextObservation.caseId,
    });
    actions.push({
      id: "dictate_complete",
      label: "Dictate & Complete",
      caseId: nextObservation.caseId,
    });
  } else {
    actions.push({
      id: "add_observation",
      label: "Add Observation",
      href: input.addObservationHref,
    });
  }

  const viewAllHref =
    rollup.upcomingCount > 1 ? buildProviderObservationCaseQueueHref(input.providerId) : null;
  const viewAllLabel =
    viewAllHref != null ? `View all observation cases (${rollup.upcomingCount})` : null;

  return {
    headerProgress,
    missionObjective,
    hasScheduledCases,
    nextObservation,
    emptyMessage: hasScheduledCases ? null : "No observation scheduled yet",
    actions,
    viewAllHref,
    viewAllLabel,
  };
}

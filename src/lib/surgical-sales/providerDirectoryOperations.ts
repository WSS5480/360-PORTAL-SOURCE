import { formatProviderLastActivity, type ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { deriveProviderPathwayNextActionLabel } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import {
  clinicalDiscoverySectionFromPlanning,
  findPlanningSection,
  type ProviderPlanningSectionCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import { formatProviderRelationshipStage, isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { resolveSalesPathwayStageFromProviderRow } from "@/lib/surgical-sales/pathway";
import {
  SALES_PATHWAY_STAGE_SHORT_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  PROVIDER_VIEW_MODE_STORAGE_KEY,
  parseDirectoryViewMode,
  readDirectoryViewModeFromStorage,
  writeDirectoryViewModeToStorage,
  type DirectoryViewMode,
} from "@/lib/surgical-sales/directoryViewMode";
import type {
  DirectoryReadinessGap,
  DirectoryReadinessSummary,
  TacticalActionChip,
} from "@/lib/surgical-sales/operationsDirectorySignals";
import { buildReadinessHeadline, openReadinessGaps } from "@/lib/surgical-sales/operationsDirectorySignals";
import { providerDirectoryLinks } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  ADMIN_OPEN_SIGNAL_IDS,
  filterPrimaryAlertItems,
  isAdminPrimaryAlertLabel,
  providerDirectoryFieldContext,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";
import {
  assessProviderSalesExecutionNeedsAction,
  providerNeedsDebrief,
  providerRecordNeedsAction,
} from "@/lib/surgical-sales/salesExecutionNeedsAction";
import { providerDebriefReady, deriveProviderObservationCount } from "@/lib/surgical-sales/providerObservationProgress";
import {
  deriveEvidenceBasedProviderFieldMission,
  providerContactRecord,
  providerHasObservationApprovalEvidence,
  providerHasObservationRequestedEvidence,
  providerHasObservationScheduledEvidence,
} from "@/lib/surgical-sales/relationshipStageProgression";

export {
  PROVIDER_VIEW_MODE_STORAGE_KEY,
  parseDirectoryViewMode as parseProviderViewMode,
};
export type ProviderViewMode = DirectoryViewMode;

export function readProviderViewModeFromStorage(): ProviderViewMode {
  return readDirectoryViewModeFromStorage(PROVIDER_VIEW_MODE_STORAGE_KEY, "operations");
}

export function writeProviderViewModeToStorage(mode: ProviderViewMode): void {
  writeDirectoryViewModeToStorage(PROVIDER_VIEW_MODE_STORAGE_KEY, mode);
}

export type ProviderOpsStatus = "blocked" | "active" | "advancing";

const MS_PER_DAY = 86_400_000;
const RECENT_ACTIVITY_DAYS = 30;

const SECTION_READINESS_GAP_LABEL: Partial<Record<string, string>> = {
  clinical_workflow: "Clinical workflow incomplete",
  commercial_signals: "Commercial pathway incomplete",
};

function daysSinceActivity(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

function sectionIsReady(section: ProviderPlanningSectionCompletion): boolean {
  return (
    section.status === "complete" ||
    section.confidence === "confirmed" ||
    section.confidence === "validated"
  );
}

function validatedPlanningSectionCount(p: ProviderDirectoryRow): number {
  const planning = p.planning_completion;
  if (!planning?.sections?.length) return 0;
  return planning.sections.filter(sectionIsReady).length;
}

function observationSection(p: ProviderDirectoryRow) {
  return p.planning_completion
    ? findPlanningSection(p.planning_completion, "observation_readiness")
    : undefined;
}

function observationReadinessPercent(p: ProviderDirectoryRow): number {
  const obs = observationSection(p);
  if (!obs) return 0;
  return Math.min(100, Math.max(0, Math.round(obs.confidence_progress)));
}

export function providerHasRecentActivity(p: ProviderDirectoryRow): boolean {
  const days = daysSinceActivity(p.last_activity_at);
  return days !== null && days < RECENT_ACTIVITY_DAYS;
}

export function providerOrganizationMissing(p: ProviderDirectoryRow): boolean {
  return !p.primary_organization_id && !p.primary_organization_name;
}

export function providerStageLabel(p: ProviderDirectoryRow): string {
  if (p.archived_at) return "Archived";
  if (p.onboarding_status === "draft") return "Draft";
  return formatProviderRelationshipStage(p.relationship_stage) || "Early discovery";
}

/** Gated sales pathway stage — matches provider profile (Discovery → Outcomes). */
export function deriveProviderRelationshipPathwayStageId(p: ProviderDirectoryRow): SalesPathwayStageId {
  return resolveSalesPathwayStageFromProviderRow(p);
}

export function deriveProviderRelationshipPathwayStageLabel(p: ProviderDirectoryRow): string {
  if (isProviderSalesCustomer(p)) return "Customer";
  return SALES_PATHWAY_STAGE_SHORT_LABELS[deriveProviderRelationshipPathwayStageId(p)];
}

export function providerUpcomingLabel(p: ProviderDirectoryRow): string {
  const n = p.upcoming_engagement_count ?? 0;
  if (n <= 0) return "None scheduled";
  return n === 1 ? "1 upcoming" : `${n} upcoming`;
}

export function providerLastActivityLabel(p: ProviderDirectoryRow): string {
  return formatProviderLastActivity(p.last_activity_at);
}

function observationApproved(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  return obs?.status === "complete" || obs?.confidence === "validated" || obs?.confidence === "confirmed";
}

function schedulingOwnerMissing(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  if (!obs) return true;
  if (obs.status === "not_started") return true;
  return obs.confidence === "unknown" && (p.upcoming_engagement_count ?? 0) === 0;
}

function credentialingPathwayIncomplete(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  if (!obs) return true;
  return (
    obs.status !== "complete" &&
    (obs.confidence === "unknown" ||
      obs.confidence === "partial" ||
      obs.confidence === "confirmed")
  );
}

function accessPathwayIncomplete(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  if (!obs) return true;
  return obs.status !== "complete" && obs.confidence !== "validated";
}

function vendorApprovalUnknown(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  if (!obs) return true;
  return obs.status !== "complete" && obs.confidence !== "validated";
}

function coordinatorIdentified(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  return Boolean(obs && (obs.status === "complete" || obs.confidence === "confirmed" || obs.confidence === "validated"));
}

function planningSectionGaps(_p: ProviderDirectoryRow): DirectoryReadinessGap[] {
  return [];
}

/** Named readiness gaps for the operations queue — field execution first; access admin stays in background intel. */
export function buildProviderDirectoryReadinessGaps(p: ProviderDirectoryRow): DirectoryReadinessGap[] {
  const gaps: DirectoryReadinessGap[] = [];
  const fieldContext = providerDirectoryFieldContext(p);

  if (providerOrganizationMissing(p)) {
    gaps.push({ id: "org", label: "Organization not linked", tone: "warn" });
  }

  if (observationApproved(p)) {
    gaps.push({ id: "obs_ok", label: "Observation approved", tone: "ok" });
  }

  if (coordinatorIdentified(p)) {
    gaps.push({ id: "coord", label: "Coordinator identified", tone: "ok" });
  }

  gaps.push(...planningSectionGaps(p));

  if (!providerHasRecentActivity(p) && !p.archived_at) {
    gaps.push({ id: "stale", label: "No recent field activity", tone: "warn" });
  }

  if ((p.upcoming_engagement_count ?? 0) > 0) {
    gaps.push({ id: "eng", label: "Engagement on calendar", tone: "ok" });
  }

  const rank = { warn: 0, gap: 1, ok: 2 };
  const sorted = [...gaps]
    .sort((a, b) => rank[a.tone] - rank[b.tone])
    .filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i)
    .filter((g) => !ADMIN_OPEN_SIGNAL_IDS.has(g.id));

  return filterPrimaryAlertItems(sorted, (g) => g.label, fieldContext).slice(0, 6);
}

export function buildProviderDirectoryReadinessSummary(p: ProviderDirectoryRow): DirectoryReadinessSummary {
  const gaps = buildProviderDirectoryReadinessGaps(p);
  const open = openReadinessGaps(gaps);
  const obsPercent = observationReadinessPercent(p);
  const { headline, subline } = buildReadinessHeadline(gaps, {
    readyHeadline: observationApproved(p)
      ? "Observation readiness · Approved"
      : "Pathway readiness · On track",
    contextLabel: "Observation readiness",
    contextPercent: obsPercent,
  });

  return {
    headline,
    subline,
    gaps,
    openGapCount: open.length,
  };
}

/** @deprecated Use buildProviderDirectoryReadinessGaps */
export function buildProviderDirectoryOperationalSignals(p: ProviderDirectoryRow): DirectoryReadinessGap[] {
  return buildProviderDirectoryReadinessGaps(p);
}

export { providerNeedsDebrief } from "@/lib/surgical-sales/salesExecutionNeedsAction";

export function deriveProviderNextAction(p: ProviderDirectoryRow): string {
  return deriveProviderNextFieldMove(p);
}

export type ProviderOpsDisplayCopy = {
  display: string;
  full: string;
};

function opsCopy(display: string, full?: string): ProviderOpsDisplayCopy {
  return { display, full: full ?? display };
}

/** Full pathway-status line for tooltips. */
function deriveProviderPathwayStatusFull(p: ProviderDirectoryRow): string {
  if (p.archived_at) return "Archived";
  if (p.onboarding_status === "draft") return "Draft";
  if (providerNeedsDebrief(p)) return "Surgeon debrief needed";
  if (observationApproved(p)) return "Observation readiness approved";
  if ((p.recent_case_count ?? 0) > 0) return "Active case on calendar";
  if ((p.upcoming_engagement_count ?? 0) > 0) return "Upcoming field touch scheduled";
  return "Relationship development in progress";
}

/** Compact pathway-status pill for the operations table. */
export function providerOpsPathwayStatusCopy(p: ProviderDirectoryRow): ProviderOpsDisplayCopy {
  if (p.archived_at) return opsCopy("Archived");
  if (p.onboarding_status === "draft") return opsCopy("Draft");
  if (providerNeedsDebrief(p)) return opsCopy("Debrief needed", deriveProviderPathwayStatusFull(p));
  if (observationApproved(p)) return opsCopy("Observation ready");
  if ((p.recent_case_count ?? 0) > 0) return opsCopy("Case active", deriveProviderPathwayStatusFull(p));
  if ((p.upcoming_engagement_count ?? 0) > 0) return opsCopy("Upcoming touch", deriveProviderPathwayStatusFull(p));
  return opsCopy("In progress", deriveProviderPathwayStatusFull(p));
}

/** @deprecated Prefer providerOpsPathwayStatusCopy().display */
export function deriveProviderPathwayStatus(p: ProviderDirectoryRow): string {
  return providerOpsPathwayStatusCopy(p).display;
}

export type ProviderPathwayStatusTone = "ok" | "warn" | "neutral" | "gap";

export function deriveProviderPathwayStatusTone(p: ProviderDirectoryRow): ProviderPathwayStatusTone {
  const status = deriveProviderPathwayStatus(p);
  if (status === "Observation ready") return "ok";
  if (status === "Debrief needed") return "warn";
  if (status === "Case active" || status === "Upcoming touch") return "ok";
  if (status === "Archived" || status === "Draft") return "neutral";
  return "gap";
}

function deriveProviderCurrentFocusFull(p: ProviderDirectoryRow): string {
  const upcoming = (p.upcoming_engagement_count ?? 0) > 0;
  if (upcoming) return "Upcoming engagement on calendar";
  if (providerNeedsDebrief(p)) return "Surgeon debrief touchpoint";
  if ((p.recent_case_count ?? 0) > 0) return "Active case pathway support";
  if (providerOrganizationMissing(p)) return "Organization not linked";

  const pathwayAction = deriveProviderPathwayNextActionLabel(p);
  if (pathwayAction && pathwayAction !== "Review Provider") return pathwayAction;

  return "Relationship development";
}

function shortenCurrentFocus(full: string): string {
  if (full.includes("approval pending")) return "Approval pending";
  if (full.includes("Upcoming engagement")) return "Upcoming";
  if (full.includes("debrief")) return "Debrief";
  if (full.includes("Scheduling owner")) return "Scheduling";
  if (full.includes("case pathway")) return "Case pathway";
  if (full.includes("Organization not linked")) return "Org linkage";
  if (full.includes("incomplete")) return full.replace(/\s+incomplete$/i, "");
  if (full.includes("not linked")) return "Org linkage";
  if (full.length > 28) return `${full.slice(0, 26).trim()}…`;
  return full;
}

export function providerOpsCurrentFocusCopy(p: ProviderDirectoryRow): ProviderOpsDisplayCopy {
  const full = deriveProviderCurrentFocusFull(p);
  return opsCopy(shortenCurrentFocus(full), full);
}

/** @deprecated Prefer providerOpsCurrentFocusCopy().display */
export function deriveProviderCurrentFocus(p: ProviderDirectoryRow): string {
  return providerOpsCurrentFocusCopy(p).display;
}

function deriveProviderNextFieldMoveFull(p: ProviderDirectoryRow): string {
  if (isProviderSalesCustomer(p)) return "Customer";
  const upcoming = (p.upcoming_engagement_count ?? 0) > 0;
  if (upcoming) return "Prep for engagement and workflow validation";
  if (providerNeedsDebrief(p)) return "Schedule surgeon debrief touchpoint";
  if (providerOrganizationMissing(p)) return "Link primary organization";
  if ((p.recent_case_count ?? 0) > 0) return "Execute active case follow-through";

  const pathwayAction = deriveProviderPathwayNextActionLabel(p);
  if (pathwayAction && pathwayAction !== "Review Provider") return pathwayAction;

  return "Advance field execution";
}

function shortenNextFieldMove(full: string): string {
  if (full.includes("Validate provider willingness")) return "Obtain approval";
  if (full.startsWith("Prep for engagement")) return "Prep engagement";
  if (full.includes("scheduling owner")) return "Find sched owner";
  if (full.includes("Schedule surgeon debrief")) return "Schedule debrief";
  if (full.includes("Link primary organization")) return "Link organization";
  if (full.includes("Log recent field activity")) return "Log activity";
  if (full.includes("credentialing")) return "Credentialing";
  if (full.includes("access pathway")) return "Confirm access";
  if (full.includes("vendor approval")) return "Vendor approval";
  if (full.includes("pathway intelligence")) return "Start capture";
  if (full.includes("Advance pathway")) return "Advance pathway";
  if (full.length > 32) return `${full.slice(0, 30).trim()}…`;
  return full;
}

export function providerOpsNextFieldMoveCopy(p: ProviderDirectoryRow): ProviderOpsDisplayCopy {
  const full = deriveProviderNextFieldMoveFull(p);
  return opsCopy(shortenNextFieldMove(full), full);
}

/** @deprecated Prefer providerOpsNextFieldMoveCopy().display */
export function deriveProviderNextFieldMove(p: ProviderDirectoryRow): string {
  return providerOpsNextFieldMoveCopy(p).display;
}

export function providerOpsUpcomingCopy(p: ProviderDirectoryRow): ProviderOpsDisplayCopy {
  const n = p.upcoming_engagement_count ?? 0;
  if (n <= 0) return opsCopy("—", "None scheduled");
  if (n === 1) return opsCopy("1", "1 upcoming engagement");
  return opsCopy(String(n), `${n} upcoming engagements`);
}

export function providerOpsActivityCopy(p: ProviderDirectoryRow): ProviderOpsDisplayCopy {
  const full = providerLastActivityLabel(p);
  if (full === "—") return opsCopy("—", "No recent activity");
  return opsCopy(full, `Last activity ${full}`);
}

export function providerOwnerTerritoryLabel(p: ProviderDirectoryRow): string {
  const territory = String(p.territory || "").trim();
  return territory || "—";
}

export type ProviderOpsQuickAction = {
  id: "open" | "intel" | "engagement" | "case";
  label: string;
  href: string;
  title: string;
};

export function deriveProviderOpsQuickActions(p: ProviderDirectoryRow): ProviderOpsQuickAction[] {
  const { detailHref, intelHref, newEngagementHref, newCaseHref } = providerDirectoryLinks(p);
  return [
    { id: "open", label: "Open", href: detailHref, title: "Open Provider" },
    { id: "intel", label: "Log intel", href: intelHref, title: "Log Intel" },
    { id: "engagement", label: "Schedule", href: newEngagementHref, title: "Schedule Engagement" },
    { id: "case", label: "Add case", href: newCaseHref, title: "Add Case" },
  ];
}

export function deriveProviderOpsStatus(p: ProviderDirectoryRow): ProviderOpsStatus {
  const upcoming = (p.upcoming_engagement_count ?? 0) > 0;
  const strongPathway = validatedPlanningSectionCount(p) >= 3;

  if (upcoming || strongPathway) return "advancing";
  if (providerOrganizationMissing(p) || !providerHasRecentActivity(p)) return "blocked";
  return "active";
}

export const PROVIDER_OPS_STATUS_LABEL: Record<ProviderOpsStatus, string> = {
  blocked: "Mission paused",
  active: "Active",
  advancing: "Advancing",
};

/** @deprecated Use deriveProviderOpsQuickActions for directory operations rows. */
export function deriveProviderTacticalActions(p: ProviderDirectoryRow): TacticalActionChip[] {
  return deriveProviderOpsQuickActions(p).map((a) => ({
    id: a.id,
    label: a.label,
    href: a.href,
    emphasis: a.id === "case",
  }));
}

/** Rep-facing operational focus for directory triage — not the sales pathway stage. */
export type ProviderMissionPathwayStage =
  | "early_discovery"
  | "observation_planning"
  | "observation_complete"
  | "evaluation"
  | "adoption"
  | "draft"
  | "archived";

export const PROVIDER_MISSION_PATHWAY_LABELS: Record<ProviderMissionPathwayStage, string> = {
  early_discovery: "Early Discovery",
  observation_planning: "Observation Planning",
  observation_complete: "Observation Complete",
  evaluation: "Evaluation",
  adoption: "Adoption",
  draft: "Draft",
  archived: "Archived",
};

export function deriveProviderMissionPathwayStageId(p: ProviderDirectoryRow): ProviderMissionPathwayStage {
  if (p.archived_at) return "archived";
  if (p.onboarding_status === "draft") return "draft";

  const hasOpportunities = (p.linked_opportunities_count ?? 0) > 0;
  const relationshipStage = p.relationship_stage;

  if (hasOpportunities || relationshipStage === "established_customer") return "adoption";
  if (providerNeedsDebrief(p)) return "evaluation";
  if (relationshipStage === "active_evaluation" && validatedPlanningSectionCount(p) >= 2) return "evaluation";
  if (observationApproved(p) && (p.recent_case_count ?? 0) > 0) return "observation_complete";
  const contact = providerContactRecord(p);
  if (
    providerHasObservationScheduledEvidence(contact) ||
    providerHasObservationRequestedEvidence({ contact })
  ) {
    return "observation_planning";
  }
  if (isEarlyDiscoveryProvider(p)) return "early_discovery";
  if (
    !observationApproved(p) ||
    schedulingOwnerMissing(p) ||
    accessPathwayIncomplete(p) ||
    credentialingPathwayIncomplete(p)
  ) {
    return "observation_planning";
  }
  if (relationshipStage === "active_relationship" || relationshipStage === "active_evaluation") {
    return "evaluation";
  }
  return "early_discovery";
}

export function deriveProviderMissionPathwayStageLabel(p: ProviderDirectoryRow): string {
  if (isProviderSalesCustomer(p)) return "Customer";
  if (p.relationship_pathway_stage_id) {
    return SALES_PATHWAY_STAGE_SHORT_LABELS[p.relationship_pathway_stage_id];
  }
  return PROVIDER_MISSION_PATHWAY_LABELS[deriveProviderMissionPathwayStageId(p)];
}

/** Field execution mission — primary organizational concept for provider directory. */
export function deriveProviderFieldMission(p: ProviderDirectoryRow): string {
  return deriveEvidenceBasedProviderFieldMission(p);
}

/** Execution status for provider cards and operations queue. */
export function deriveProviderMissionStatus(p: ProviderDirectoryRow): string {
  if (p.archived_at) return "Archived";
  if (p.onboarding_status === "draft") return "Waiting on Provider";

  if (providerDebriefReady(p)) return "Ready for Debrief";
  if (providerNeedsDebrief(p)) return "Ready for Debrief";

  const contact = providerContactRecord(p);
  if (providerHasObservationScheduledEvidence(contact)) {
    return "Scheduled";
  }

  if ((p.linked_opportunities_count ?? 0) > 0) return "Follow Up Needed";

  if (providerRecordNeedsAction(p)) return "Follow Up Needed";

  if (
    providerHasObservationApprovalEvidence(contact) &&
    deriveProviderObservationCount(p) === 0
  ) {
    return "Ready for Observation";
  }

  if (providerHasObservationRequestedEvidence({ contact })) {
    return "Waiting on Provider";
  }

  return "Waiting on Provider";
}

function formatLastTouch(event: string, iso: string | null | undefined): string {
  const when = formatProviderLastActivity(iso);
  if (when === "—") return "No recent touch";
  const whenPhrase =
    when === "Today" ? "today" : when === "Yesterday" ? "yesterday" : when.toLowerCase();
  return `${event} ${whenPhrase}`;
}

/** Current mission on provider cards — field execution progression. */
export function deriveProviderCardCurrentMission(p: ProviderDirectoryRow): string {
  return deriveProviderFieldMission(p);
}

export type {
  ProviderMissionBadge,
  ProviderMissionHealth,
  ProviderMissionHealthView,
  ProviderOpsPriority,
} from "@/lib/surgical-sales/providerMissionHealth";
export {
  PROVIDER_MISSION_HEALTH_LABEL,
  PROVIDER_MISSION_HEALTH_RANK,
  PROVIDER_OPS_PRIORITY_LABEL,
  deriveProviderMissionBadge,
  deriveProviderMissionHealth,
  deriveProviderOpsPriority,
  providerMissionHealthRank,
} from "@/lib/surgical-sales/providerMissionHealth";
export {
  PROVIDER_MISSION_BOARD_COLUMNS,
  countProvidersNeedingMissionAction,
  deriveProviderMissionBoardColumn,
  groupProvidersByMissionBoardColumn,
  sortProvidersForMissionBoard,
  type ProviderMissionBoardColumnId,
} from "@/lib/surgical-sales/providerMissionBoard";

/** Upcoming field work line for operations queue — null when nothing scheduled. */
export function deriveProviderUpcomingObservationDate(p: ProviderDirectoryRow): string | null {
  const eng = p.upcoming_engagement;
  if (!eng) return null;

  const when = String(eng.datetime_label ?? "").trim();
  if (!when || /^(date tbd|tbd)$/i.test(when)) return null;

  const location = String(eng.location_label ?? "").trim();
  return location ? `${when} · ${location}` : when;
}

/** Upcoming column for the provider execution queue. */
export function deriveProviderOperationsUpcomingLabel(p: ProviderDirectoryRow): string {
  const scheduled = deriveProviderUpcomingObservationDate(p);
  if (scheduled) return scheduled;

  if ((p.upcoming_engagement_count ?? 0) > 0) {
    const eng = p.upcoming_engagement;
    const when = String(eng?.datetime_label ?? "").trim();
    if (when && !/^(date tbd|tbd)$/i.test(when)) return when;
    return "Scheduled";
  }

  return "None scheduled";
}

/** Current operational focus for directory queues — relationship mission, not admin gaps. */
export function deriveProviderCurrentMissionLabel(p: ProviderDirectoryRow): string {
  return deriveProviderCardCurrentMission(p);
}

/** Primary rep action on provider cards — sales execution next step only. */
export function deriveProviderMissionNextAction(p: ProviderDirectoryRow): string {
  return deriveProviderPathwayNextActionLabel(p);
}

export type ProviderMissionOpenSignal = {
  id: string;
  label: string;
};

function commercialSignalsIncomplete(p: ProviderDirectoryRow): boolean {
  const section = p.planning_completion
    ? findPlanningSection(p.planning_completion, "commercial_signals")
    : undefined;
  return Boolean(section && !sectionIsReady(section));
}

function observationNotScheduled(p: ProviderDirectoryRow): boolean {
  return !observationApproved(p) && (p.upcoming_engagement_count ?? 0) === 0;
}

function observationWorkStarted(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  if (!obs) return false;
  return obs.status !== "not_started" || obs.confidence !== "unknown";
}

function schedulingContactUnconfirmed(p: ProviderDirectoryRow): boolean {
  const obs = observationSection(p);
  if (!obs) return true;
  if (obs.status === "complete" || obs.confidence === "validated" || obs.confidence === "confirmed") {
    return false;
  }
  return (p.upcoming_engagement_count ?? 0) === 0;
}

function isEarlyDiscoveryProvider(p: ProviderDirectoryRow): boolean {
  if (!p.planning_completion) return true;
  if (p.planning_completion.status === "not_started") return true;
  return !observationWorkStarted(p);
}

/** Up to three execution next steps for mission cards — not optional intelligence. */
export function buildProviderMissionOpenSignals(p: ProviderDirectoryRow): ProviderMissionOpenSignal[] {
  if (p.archived_at || p.onboarding_status === "draft") return [];

  return assessProviderSalesExecutionNeedsAction(p)
    .items.slice(0, 3)
    .map((item) => ({ id: item.id, label: item.label }));
}

/** Most recent touchpoint summary for mission cards. */
export function deriveProviderMissionRecentActivity(p: ProviderDirectoryRow): string {
  return deriveProviderLastTouch(p);
}

/** Last touch line for the operations queue. */
export function deriveProviderLastTouch(p: ProviderDirectoryRow): string {
  if (p.archived_at) return "Archived";
  if (p.onboarding_status === "draft") return "Profile draft";

  if (providerDebriefReady(p)) {
    return formatLastTouch("Observation milestone reached", p.last_activity_at);
  }

  const observationCount = deriveProviderObservationCount(p);
  if (observationCount > 0) {
    return formatLastTouch("Observation completed", p.last_activity_at);
  }

  const contact = providerContactRecord(p);

  if (p.upcoming_engagement) {
    const eng = p.upcoming_engagement;
    const when = String(eng.datetime_label ?? "").trim();
    const isIntro = /intro/i.test(eng.type_label);
    const event =
      isIntro
        ? "Intro call"
        : providerHasObservationScheduledEvidence(contact)
          ? "Observation scheduled"
          : "Engagement planned";
    if (when && !/^(date tbd|tbd)$/i.test(when)) {
      const whenNorm = when.toLowerCase();
      if (/today|yesterday|\d/.test(whenNorm)) {
        return `${event} ${whenNorm}`;
      }
      return `${event} · ${when}`;
    }
    return formatLastTouch(event.toLowerCase(), p.last_activity_at);
  }

  const upcoming = p.upcoming_engagement_count ?? 0;
  if (upcoming > 0 && providerHasObservationScheduledEvidence(contact)) {
    return formatLastTouch("Observation scheduled", p.last_activity_at);
  }

  if (providerHasObservationApprovalEvidence(contact)) {
    return formatLastTouch("Observation approved", p.last_activity_at);
  }

  if (p.last_contacted_at) {
    return formatLastTouch("Intro call", p.last_contacted_at);
  }

  if (p.last_activity_at) {
    return formatLastTouch("Field activity", p.last_activity_at);
  }

  return "No recent touch";
}

/** Operational last-activity line — alias for last touch phrasing. */
export function deriveProviderOperationsRecentActivity(p: ProviderDirectoryRow): string {
  return deriveProviderLastTouch(p);
}

export function deriveProviderActiveCaseCount(p: ProviderDirectoryRow): number {
  return deriveProviderObservationCount(p);
}

export type ProviderOperationsOpenSignalsPreview = {
  count: number;
  labels: string[];
  display: string;
  tooltip: string;
};

export function buildProviderOperationsOpenSignalsPreview(
  p: ProviderDirectoryRow,
): ProviderOperationsOpenSignalsPreview {
  const labels = buildProviderMissionOpenSignals(p).map((s) => s.label);
  const count = labels.length;
  return {
    count,
    labels,
    display: count === 0 ? "—" : count === 1 ? "1 open" : `${count} open`,
    tooltip: count === 0 ? "No open signals" : labels.join("\n"),
  };
}

export type {
  ProviderMissionMetricId,
  ProviderMissionMetricSummary,
  ProviderMissionPortfolioSummary,
  ProviderOperationsPortfolioSummary,
} from "@/lib/surgical-sales/providerMissionPortfolio";
export {
  PROVIDER_MISSION_METRICS,
  buildProviderMissionPortfolioSummary,
  buildProviderOperationsPortfolioSummary,
  filterProvidersByMissionMetric,
  providerMatchesMissionMetric,
  providerMissionMetricDefinition,
} from "@/lib/surgical-sales/providerMissionPortfolio";

export function providerNeedsOperationalAttention(p: ProviderDirectoryRow): boolean {
  if (p.archived_at || p.onboarding_status === "draft") return false;
  return providerRecordNeedsAction(p);
}

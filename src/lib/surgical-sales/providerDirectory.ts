import type { ProviderMissionEngagementPreview } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import type { ProviderDebriefEngagementPreview } from "@/lib/surgical-sales/missionBoardDebriefEngagement";
import type { ProviderEvaluationEngagementPreview } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import type { ProviderObservationCaseRollup } from "@/lib/surgical-sales/providerObservationCaseCollection";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { PROVIDER_PLANNING_LABEL, type ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import {
  buildProviderPlanningCompletion,
  type ProviderPlanningCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
export { PROVIDER_PLANNING_LABEL };

export type ProviderDirectoryRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  email?: string | null;
  role_type?: string | null;
  archived_at?: string | null;
  updated_at?: string | null;
  last_contacted_at?: string | null;
  access_notes?: string | null;
  personality_notes?: string | null;
  preferred_contact_method?: string | null;
  relationship_strength?: string | null;
  organization_id?: string | null;
  account_id?: string | null;
  organization?: { id?: string; name?: string | null } | null;
  account?: { id?: string; name?: string | null } | null;
  organization_links?: ProviderOrgLink[];
  organization_count: number;
  specialty: string | null;
  primary_organization_name: string | null;
  primary_organization_id: string | null;
  additional_organizations_count: number;
  territory: string | null;
  planning_status: ProviderPlanningStatus;
  planning_completion?: ProviderPlanningCompletion;
  onboarding_status?: string | null;
  crm_status?: string | null;
  relationship_stage?: string | null;
  upcoming_engagement_count?: number;
  upcoming_engagement?: ProviderMissionEngagementPreview | null;
  /** Latest provider_debrief engagement — used for Mission Board debrief column CTAs. */
  provider_debrief_engagement?: ProviderDebriefEngagementPreview | null;
  /** Latest evaluation-stage engagement — used for Mission Board evaluation column CTAs. */
  provider_evaluation_engagement?: ProviderEvaluationEngagementPreview | null;
  linked_opportunities_count: number;
  /** Completed observation procedures on file (OR cases + completed observation engagements). */
  observation_count?: number;
  recent_case_count: number;
  last_activity_at: string | null;
  /** Provider requested follow-up on a case but no follow-up engagement is scheduled. */
  pending_follow_up_unscheduled?: boolean;
  /** Upcoming field observation within the prep urgency window. */
  upcoming_observation_imminent?: boolean;
  /** Execution prep gaps for the next observation — not admin metadata. */
  upcoming_observation_prep_incomplete?: boolean;
  /** Gated sales pathway stage (Discovery → Outcomes) — matches provider profile pathway tracker. */
  relationship_pathway_stage_id?: SalesPathwayStageId;
  /** Scheduled/incomplete observation cases for Mission Board and Observation Mission. */
  observation_cases?: ProviderObservationCaseRollup | null;
  /** @deprecated Use observation_cases.nextScheduled */
  next_scheduled_observation_case?: ProviderObservationCaseRollup["nextScheduled"];
};

export type ProviderOrgLink = {
  contact_id?: string;
  account_id?: string;
  specialty?: string | null;
  is_primary_org?: boolean;
  is_active?: boolean;
  accounts?: { id?: string; name?: string | null } | null;
};

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contactMatchesPhysicianName(
  contact: { first_name?: string | null; last_name?: string | null; title?: string | null },
  physicianName: string | null | undefined,
): boolean {
  const pn = normName(String(physicianName || ""));
  if (!pn) return false;
  const dn = normName(contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]));
  if (!dn) return false;
  return pn === dn || dn.includes(pn) || pn.includes(dn);
}

export function pickPrimaryOrgLink(links: ProviderOrgLink[]): ProviderOrgLink | null {
  if (!links.length) return null;
  const active = links.filter((l) => l.is_active !== false);
  const pool = active.length ? active : links;
  return pool.find((l) => l.is_primary_org) || pool[0] || null;
}

export function pickSpecialty(links: ProviderOrgLink[], fallbackTitle?: string | null): string | null {
  const primary = pickPrimaryOrgLink(links);
  const fromLink = String(primary?.specialty || "").trim();
  if (fromLink) return fromLink;
  const any = links.map((l) => String(l.specialty || "").trim()).find(Boolean);
  if (any) return any;
  const title = String(fallbackTitle || "").trim();
  return title || null;
}

/** Planning status from required sections (basics, procedural, planning, relationship). */
export function deriveProviderPlanningStatusForContact(
  contact: Record<string, unknown>,
  context?: { latestCaseDate?: string | null; referenceCaseUpdatedAt?: string | null },
  orgLinks?: ProviderOrgLink[],
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[],
): ProviderPlanningStatus {
  return buildProviderPlanningCompletion(contact, {
    latestCaseDate: context?.latestCaseDate,
    referenceCaseUpdatedAt: context?.referenceCaseUpdatedAt,
  }, orgLinks).status;
}

export function providerPlanningSummary(
  contact: Record<string, unknown>,
  context?: { latestCaseDate?: string | null; referenceCaseUpdatedAt?: string | null },
  orgLinks?: ProviderOrgLink[],
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[],
): ProviderPlanningCompletion {
  return buildProviderPlanningCompletion(contact, {
    latestCaseDate: context?.latestCaseDate,
    referenceCaseUpdatedAt: context?.referenceCaseUpdatedAt,
  }, orgLinks);
}

export function formatProviderLastActivity(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

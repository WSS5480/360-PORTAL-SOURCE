import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import { formatMissingAreaDisplay } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import { buildProviderStrategicSummary } from "@/lib/surgical-sales/buildProviderStrategicSummary";
import {
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  encouragesEngagementPreCallOnboarding,
  isEarlyDiscoveryRelationshipStage,
  isProviderSalesCustomer,
  normalizeProviderRelationshipStage,
} from "@/lib/surgical-sales/providerRelationshipStage";

export type ProviderWhatMattersBullet = {
  id: string;
  text: string;
  isNextAction?: boolean;
  href?: string;
  actionLabel?: string;
};

const MAX_CONTEXT_BULLETS = 4;

function humanizeMissingArea(label: string): string {
  const display = formatMissingAreaDisplay(label);
  const s = label.trim().toLowerCase();
  if (s.includes("clinical") || s.includes("procedure")) {
    return "Clinical context not yet captured";
  }
  if (s.includes("product") || s.includes("competitor")) {
    return "Product and competitive context still forming";
  }
  if (s.includes("relationship") || s.includes("communication") || s.includes("influence")) {
    return `More context available on ${display}`;
  }
  return `More context available on ${display}`;
}

export function buildProviderWhatMattersNow(input: {
  providerId: string;
  relationshipStage: string;
  newEngagementHref: string;
  intelligenceHref: string;
  createOpportunityHref?: string;
  engagements: ProviderEngagementSummary[];
  planning?: ProviderPlanningCompletion | null;
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  activity_timeline?: Array<Record<string, unknown>>;
  contact: Record<string, unknown>;
}): ProviderWhatMattersBullet[] {
  if (isProviderSalesCustomer(input.relationshipStage) || isProviderSalesCustomer(input.contact)) {
    return [];
  }
  const stage = normalizeProviderRelationshipStage(input.relationshipStage);
  const engagements = input.engagements || [];
  const cases = input.cases || [];
  const opportunities = input.opportunities || [];
  const planning = input.planning ?? null;

  const summary = buildProviderStrategicSummary({
    providerId: input.providerId,
    relationshipStage: stage,
    newEngagementHref: input.newEngagementHref,
    intelligenceHref: input.intelligenceHref,
    createOpportunityHref: input.createOpportunityHref,
    engagements,
    planning,
    cases,
    opportunities,
    activity_timeline: input.activity_timeline,
  });

  const intelView = planning
    ? buildProviderIntelligenceSummaryView({
        contact: input.contact,
        planning,
      })
    : null;

  const context: ProviderWhatMattersBullet[] = [];
  const seen = new Set<string>();

  const push = (id: string, text: string) => {
    if (context.length >= MAX_CONTEXT_BULLETS || seen.has(id)) return;
    seen.add(id);
    context.push({ id, text });
  };

  if (isEarlyDiscoveryRelationshipStage(stage) || encouragesEngagementPreCallOnboarding(stage)) {
    push("relationship-early", "No established operational relationship yet");
  } else if (stage === "active_evaluation") {
    push("relationship-evaluation", "Active evaluation — keep momentum on engagements and field prep");
  } else if (stage === "dormant") {
    push("relationship-dormant", "Relationship has gone quiet — plan a re-engagement touch");
  }

  const clinicalTrack = intelView?.tracks.find((t) => t.id === "clinical");
  const planningNotStarted = !planning || planning.status === "not_started";
  const clinicalLimited = clinicalTrack?.status === "Limited" || planningNotStarted;

  if (clinicalLimited) {
    push("intel-workflow", "Limited procedural understanding captured");
  } else if (intelView && intelView.missingAreas.length > 0) {
    const top = intelView.missingAreas[0];
    push("intel-gap", humanizeMissingArea(top));
  } else if (intelView?.overallStatus === "Building") {
    push("intel-building", "Field context still forming — add detail on the next touch");
  }

  const completedCount = engagements.filter((e) => e.status.toLowerCase() === "completed").length;
  const upcoming = engagements.filter((e) => isUpcomingEngagementStatus(e.status));
  const nextUpcoming = [...upcoming].sort((a, b) => {
    const ta = a.scheduled_at || (a.engagement_date ? `${a.engagement_date}T12:00:00` : "");
    const tb = b.scheduled_at || (b.engagement_date ? `${b.engagement_date}T12:00:00` : "");
    return new Date(ta || 0).getTime() - new Date(tb || 0).getTime();
  })[0];

  if (engagements.length === 0) {
    push("eng-none", "No engagements on the books yet");
  } else if (completedCount === 0) {
    push("eng-none-done", "No engagements completed yet");
  } else if (
    nextUpcoming &&
    nextUpcoming.status.toLowerCase() === "planned" &&
    !nextUpcoming.pre_call_complete &&
    nextUpcoming.pre_call_total > 0
  ) {
    const label = nextUpcoming.title?.trim() || nextUpcoming.engagement_type_label;
    push("eng-prep", `Pre-call plan still open for ${label}`);
  } else if (nextUpcoming && nextUpcoming.status.toLowerCase() === "in_progress") {
    const label = nextUpcoming.title?.trim() || nextUpcoming.engagement_type_label;
    push("eng-progress", `${label} is in progress — close the loop while it is fresh`);
  }

  if (context.length < MAX_CONTEXT_BULLETS && stage === "active_evaluation" && cases.length === 0) {
    push("case-obs", "Observation is on the path — no case scheduled yet");
  }

  if (context.length < MAX_CONTEXT_BULLETS && opportunities.length === 0 && completedCount > 0) {
    push("opp-none", "No evaluation tied to this provider yet");
  }

  const nextAction: ProviderWhatMattersBullet = {
    id: "next-action",
    text: "",
    isNextAction: true,
    href: summary.primaryAction.href,
    actionLabel: summary.primaryAction.label,
  };

  return [...context.slice(0, MAX_CONTEXT_BULLETS), nextAction];
}

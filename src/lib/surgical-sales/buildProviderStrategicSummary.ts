import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  clinicalDiscoverySectionFromPlanning,
  type ProviderPlanningCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  encouragesEngagementPreCallOnboarding,
  formatProviderRelationshipStage,
  normalizeProviderRelationshipStage,
} from "@/lib/surgical-sales/providerRelationshipStage";
import {
  buildProviderRepPrimaryAction,
  type ProviderRepPrimaryAction,
} from "@/lib/surgical-sales/buildProviderRepPrimaryAction";

export type ProviderStrategicSummary = {
  stagePhrase: string;
  intelligencePhrase: string;
  nextStepPhrase: string;
  narrative: string;
  primaryAction: ProviderRepPrimaryAction;
};

export type ProviderLastTouch = {
  kind: "activity" | "engagement";
  label: string;
  atLabel: string;
  href?: string | null;
};

function engagementTimestamp(e: ProviderEngagementSummary): number {
  const raw = e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatTouchDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function resolveProviderLastEngagement(
  engagements: ProviderEngagementSummary[],
  providerId: string,
): ProviderLastTouch | null {
  const sorted = [...engagements].sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
  const e = sorted[0];
  if (!e || engagementTimestamp(e) === 0) return null;

  const atRaw = e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  const title = e.title?.trim() || e.engagement_type_label;
  const prefix = isUpcomingEngagementStatus(e.status) ? "Upcoming" : "Last";

  return {
    kind: "engagement",
    label: `${prefix}: ${title}`,
    atLabel: formatTouchDate(atRaw),
    href: `/portal/sales/engagements/${encodeURIComponent(e.id)}`,
  };
}

export function resolveProviderLastActivity(
  timeline: Array<Record<string, unknown>>,
): ProviderLastTouch | null {
  const sorted = [...timeline]
    .map((e) => ({
      at: String(e.at ?? ""),
      title: String(e.title ?? "Activity").trim(),
      href: e.href != null ? String(e.href) : null,
    }))
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const row = sorted[0];
  if (!row) return null;

  return {
    kind: "activity",
    label: row.title,
    atLabel: formatTouchDate(row.at),
    href: row.href,
  };
}

function stageNarrativePhrase(relationshipStage: string): string {
  const s = normalizeProviderRelationshipStage(relationshipStage);
  const map: Record<string, string> = {
    early_discovery: "Early discovery — no established operational relationship yet",
    active_evaluation: "Active evaluation underway",
    active_relationship: "Active relationship",
    established_customer: "Established customer",
    dormant: "Dormant relationship",
    archived: "Archived relationship",
  };
  return map[s] ?? formatProviderRelationshipStage(relationshipStage);
}

function intelligenceNarrativePhrase(
  planning: ProviderPlanningCompletion | null | undefined,
): string {
  if (!planning || planning.status === "not_started") {
    return "Still learning — capture workflow and access on next touch";
  }

  const clinical = clinicalDiscoverySectionFromPlanning(planning);
  const clinicalThin =
    clinical && clinical.total > 0 && clinical.filled / clinical.total < 0.4;

  if (planning.status === "needs_update") {
    return "Refresh intelligence before the next touch";
  }

  if (planning.status === "complete") {
    if (clinicalThin) return "Procedure mix still developing";
    return "Workflow context mostly mapped";
  }

  if (clinicalThin) return "Procedure mix still unknown";
  if (planning.percent < 40) return "Learning in progress";
  return "Discovery progress building";
}

function nextStepNarrativePhrase(
  action: ProviderRepPrimaryAction,
  relationshipStage: string,
  hasUpcoming: boolean,
): string {
  const label = action.label.toLowerCase();

  if (label.includes("prepare for upcoming")) return "prepare for the upcoming meeting";
  if (label.includes("follow up after recent")) return "follow up after the recent engagement";
  if (label.includes("schedule intro")) return "schedule an intro call";
  if (label.includes("request or observation")) return "request OR observation access";
  if (label.includes("capture procedural")) return "capture procedural workflow intelligence";
  if (label.includes("advance adoption")) return "advance the evaluation";
  if (label.includes("capture provider intelligence") || label.includes("refresh provider")) {
    return "update provider intelligence";
  }
  if (label.includes("log touch outcomes") || label.includes("confirm or")) {
    return label;
  }
  if (label.includes("prepare") || label.includes("prep ")) return label;
  if (label.includes("New opportunity") || label.includes("create adoption")) return "create an evaluation";
  if (label.includes("schedule follow-up") || label.includes("schedule expansion")) return label;
  if (label.includes("plan next")) return "schedule the next engagement";

  return label;
}

export function buildProviderStrategicSummary(
  input: Parameters<typeof buildProviderRepPrimaryAction>[0] & {
    relationshipStage: string;
  },
): ProviderStrategicSummary {
  const hasUpcoming = input.engagements.some((e) => isUpcomingEngagementStatus(e.status));
  const primaryAction = buildProviderRepPrimaryAction(input);

  const stagePhrase = stageNarrativePhrase(input.relationshipStage);
  const intelligencePhrase = intelligenceNarrativePhrase(input.planning);
  const nextStepPhrase = nextStepNarrativePhrase(
    primaryAction,
    input.relationshipStage,
    hasUpcoming,
  );

  const narrative = `${stagePhrase}. ${intelligencePhrase}. Recommended field move: ${nextStepPhrase}.`;

  return {
    stagePhrase,
    intelligencePhrase,
    nextStepPhrase,
    narrative,
    primaryAction,
  };
}

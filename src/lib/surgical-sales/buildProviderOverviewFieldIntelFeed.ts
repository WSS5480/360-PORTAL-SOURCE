/**
 * Compact field intel feed for pathway execution overview.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildProviderOverviewLatestFieldIntelligence } from "@/lib/surgical-sales/buildProviderOverviewLatestFieldIntelligence";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { flattenOperationalSignalGroups } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { OperationalFieldSignalGroup } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import {
  heroBlockerBulletLine,
  heroChipGroup,
} from "@/lib/surgical-sales/providerOverviewMissionPresentation";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { sanitizeOverviewDisplayText } from "@/lib/surgical-sales/buildProviderOverviewBody";

export type ProviderOverviewFieldIntelFeedKind =
  | "engagement"
  | "observation"
  | "learning"
  | "gap";

export type ProviderOverviewFieldIntelFeedItem = {
  id: string;
  kind: ProviderOverviewFieldIntelFeedKind;
  kicker: string;
  line: string;
  /** Timeline bucket for grouped feed display. */
  timeGroup?: "today" | "yesterday" | "earlier";
};

const OBSERVATION_TYPES = new Set(["observation_request", "or_visit", "or_observation"]);

function resolveTimeGroup(iso: string | null | undefined): "today" | "yesterday" | "earlier" {
  if (!iso) return "earlier";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "earlier";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startToday) return "today";
  if (d >= startYesterday) return "yesterday";
  return "earlier";
}

function timeGroupLabel(group: "today" | "yesterday" | "earlier"): string {
  if (group === "today") return "Today";
  if (group === "yesterday") return "Yesterday";
  return "Earlier";
}

function engagementTimestamp(e: ProviderEngagementSummary): number {
  const raw = e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function engagementAtIso(e: ProviderEngagementSummary): string | null {
  return e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : null);
}

function latestObservationLine(engagements: ProviderEngagementSummary[]): string | null {
  const obs = engagements
    .filter((e) => OBSERVATION_TYPES.has(String(e.engagement_type || "").toLowerCase()))
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
  const hit = obs[0];
  if (!hit) return null;
  const title = hit.title?.trim() || hit.engagement_type_label || "Observation";
  const status = String(hit.status || "").trim();
  if (status) return scanLine(`${title} — ${status.replace(/_/g, " ")}`, 72);
  return scanLine(title, 72);
}
function latestBlockerLine(signalGroups: OperationalFieldSignalGroup[]): string | null {
  const signals = flattenOperationalSignalGroups(signalGroups);
  const blocker = signals.find((s) => heroChipGroup(s.chipStatus) === "blockers");
  if (!blocker) return null;
  return scanLine(heroBlockerBulletLine(blocker.shortLabel), 72);
}

export function buildProviderOverviewFieldIntelFeed(input: {
  contact: Record<string, unknown>;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  signalGroups: OperationalFieldSignalGroup[];
  providerId: string;
}): ProviderOverviewFieldIntelFeedItem[] {
  const engagements = input.engagements ?? [];
  const items: ProviderOverviewFieldIntelFeedItem[] = [];

  const sortedEngagements = [...engagements].sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
  const latestEngagement = sortedEngagements[0];
  if (latestEngagement && engagementTimestamp(latestEngagement) > 0) {
    const atIso = engagementAtIso(latestEngagement);
    const group = resolveTimeGroup(atIso);
    const title =
      latestEngagement.title?.trim() ||
      latestEngagement.engagement_type_label?.trim() ||
      "Engagement";
    items.push({
      id: "feed:engagement",
      kind: "engagement",
      kicker: timeGroupLabel(group),
      line: scanLine(title, 72),
      timeGroup: group,
    });
  }

  const obs = engagements
    .filter((e) => OBSERVATION_TYPES.has(String(e.engagement_type || "").toLowerCase()))
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))[0];
  const obsLine = obs ? latestObservationLine(engagements) : null;
  if (obsLine && obs) {
    items.push({
      id: "feed:observation",
      kind: "observation",
      kicker: timeGroupLabel(resolveTimeGroup(obs.updated_at || obs.engagement_date)),
      line: obsLine,
      timeGroup: resolveTimeGroup(obs.updated_at || obs.engagement_date),
    });
  }

  const learnings = buildProviderOverviewLatestFieldIntelligence({
    contact: input.contact,
    commercialStage: input.commercialStage,
    engagements,
  });
  const topLearning = learnings[0];
  if (topLearning?.line) {
    items.push({
      id: `feed:learning:${topLearning.id}`,
      kind: "learning",
      kicker: "Earlier",
      line: scanLine(topLearning.line.replace(/\.$/, ""), 72),
      timeGroup: "earlier",
    });
  }

  const blockerLine = latestBlockerLine(input.signalGroups);
  if (blockerLine) {
    const clean = sanitizeOverviewDisplayText(blockerLine);
    if (clean) {
      items.push({
        id: "feed:gap",
        kind: "gap",
        kicker: "Earlier",
        line: clean,
        timeGroup: "earlier",
      });
    }
  }

  if (items.length === 0) {
    items.push({
      id: "feed:empty",
      kind: "learning",
      kicker: "Today",
      line: "Log a touchpoint to start building pathway intelligence.",
      timeGroup: "today",
    });
  }

  return items.slice(0, 4);
}

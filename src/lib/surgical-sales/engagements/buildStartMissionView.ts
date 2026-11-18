import {
  buildEngagementDetailHref,
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { resolveEngagementObjective } from "@/lib/surgical-sales/engagements/buildEngagementRecordView";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  resolveStartMissionContent,
  type StartMissionContent,
  type StartMissionOutcome,
} from "@/lib/surgical-sales/engagements/startMissionConfig";
import {
  readStartMissionSnapshot,
  type StartMissionSnapshot,
} from "@/lib/surgical-sales/engagements/startMissionSnapshot";

export type StartMissionView = {
  engagement_id: string;
  engagement_type: string;
  engagement_type_label: string;
  status: string;
  provider: {
    id: string;
    display_name: string;
  };
  organization: {
    id: string | null;
    name: string | null;
  };
  schedule_label: string | null;
  content: StartMissionContent;
  live_session: StartMissionSnapshot | null;
  outcome_recorded: boolean;
  links: {
    engagement_detail_href: string;
    prepare_mission_href: string;
    log_outcome_href: string;
  };
};

function formatScheduleLabel(engagement: Record<string, unknown>): string | null {
  const scheduled = engagement.scheduled_at ? String(engagement.scheduled_at).trim() : "";
  const dateOnly =
    (engagement.engagement_date ? String(engagement.engagement_date).trim() : "") ||
    (engagement.scheduled_date ? String(engagement.scheduled_date).trim() : "");

  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) {
      const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return `${date} · ${time}`;
    }
  }

  if (dateOnly) {
    const d = new Date(`${dateOnly}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
  }

  return null;
}

export function buildStartMissionView(input: {
  engagement: Record<string, unknown>;
  provider: { id: string; display_name: string };
  organization?: { id?: string | null; name?: string | null } | null;
}): StartMissionView {
  const engagement = input.engagement;
  const engagementId = String(engagement.id);
  const engagementType = String(engagement.engagement_type ?? "intro_call");
  const liveSession = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
  const storedObjective = resolveEngagementObjective(engagement);
  const content = resolveStartMissionContent({
    engagementType,
    storedObjective,
    storedPrimaryQuestion: engagement.next_action ? String(engagement.next_action) : null,
  });
  const prepareHref = buildEngagementPrepareForMeetingHref(engagementId);

  return {
    engagement_id: engagementId,
    engagement_type: engagementType,
    engagement_type_label: formatEngagementType(engagementType),
    status: String(engagement.status ?? "planned"),
    provider: {
      id: input.provider.id,
      display_name: input.provider.display_name,
    },
    organization: {
      id: input.organization?.id ? String(input.organization.id) : null,
      name: input.organization?.name ? String(input.organization.name) : null,
    },
    schedule_label: formatScheduleLabel(engagement),
    content,
    live_session: liveSession,
    outcome_recorded: Boolean(liveSession?.outcome_recorded_at),
    links: {
      engagement_detail_href: buildEngagementDetailHref(engagementId),
      prepare_mission_href: prepareHref,
      log_outcome_href: buildEngagementDebriefHref(engagementId),
    },
  };
}

export type { StartMissionContent, StartMissionOutcome };

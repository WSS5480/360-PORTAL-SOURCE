import type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import type { EngagementStatus } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  resolveEngagementOperationalBannerId,
  type EngagementOperationalBannerId,
} from "@/lib/surgical-sales/engagements/engagementOperationalBanner";

/** @deprecated Replaced by EngagementOperationalBannerId — kept for patch helpers only. */
export type MeetingStateChipId = "planned" | "prepared" | "completed" | "debrief_needed";

/** PATCH body for engagement API (admin / legacy flows — not shown as selectable chips). */
export function patchBodyForMeetingStateChip(
  chipId: MeetingStateChipId,
): Record<string, string | null | Record<string, never>> {
  switch (chipId) {
    case "planned":
      return {
        status: "planned",
        prepared_at: null,
        prepared_by_user_id: null,
        prepare_checklist_json: {},
      };
    case "prepared":
      return {};
    case "completed":
      return { status: "completed" };
    case "debrief_needed":
      return { status: "in_progress" };
    default:
      return {};
  }
}

export function meetingStateChipUsesMarkPrepared(chipId: MeetingStateChipId): boolean {
  return chipId === "prepared";
}

/** Maps operational banner to legacy chip id for status PATCH helpers. */
export function meetingStateChipIdFromBanner(
  bannerId: EngagementOperationalBannerId,
): MeetingStateChipId {
  switch (bannerId) {
    case "field_touch_ready":
    case "early_discovery_touch":
      return "prepared";
    case "pre_visit_blockers":
    case "discovery_in_progress":
    case "operational_understanding_developing":
      return "planned";
    case "post_visit_debrief_required":
      return "debrief_needed";
    case "visit_closed":
      return "completed";
    default:
      return "planned";
  }
}

/** @deprecated Use resolveEngagementOperationalBannerId */
export function resolveMeetingStateChip(input: {
  status: string;
  engagementType?: string;
  preparation: Pick<EngagementPreparationStatus, "is_prepared">;
  preVisitBlockerCount?: number;
  discoveryObjectiveCount?: number;
}): MeetingStateChipId {
  const bannerId = resolveEngagementOperationalBannerId({
    status: input.status,
    engagementType: input.engagementType ?? "intro_call",
    preparation: { is_prepared: input.preparation.is_prepared },
    readiness: {
      preVisitBlockerCount: input.preVisitBlockerCount ?? 0,
      discoveryObjectiveCount: input.discoveryObjectiveCount ?? 0,
    },
  });
  return meetingStateChipIdFromBanner(bannerId);
}

/** @deprecated Banner model replaced multi-chip UI */
export function resolveMeetingStateChipFromStatus(status: string): MeetingStateChipId {
  const s = String(status ?? "planned").toLowerCase() as EngagementStatus;
  if (s === "completed") return "completed";
  if (s === "in_progress") return "debrief_needed";
  return "planned";
}

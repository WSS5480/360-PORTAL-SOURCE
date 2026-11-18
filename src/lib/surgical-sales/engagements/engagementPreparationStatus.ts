import {
  buildPrepareChecklistDisplay,
  formatPreparePreparedAtLabel,
  type PrepareChecklistDisplayItem,
} from "@/lib/surgical-sales/engagements/prepareForMeetingChecklist";

/** Client-safe preparation status derived from an engagement row — no server imports. */
export type EngagementPreparationStatus = {
  is_prepared: boolean;
  prepared_at: string | null;
  prepared_at_label: string | null;
  checklist: PrepareChecklistDisplayItem[];
};

export function buildEngagementPreparationStatus(
  engagement: Record<string, unknown>,
): EngagementPreparationStatus {
  const preparedAt = engagement.prepared_at ? String(engagement.prepared_at) : null;
  return {
    is_prepared: Boolean(preparedAt),
    prepared_at: preparedAt,
    prepared_at_label: formatPreparePreparedAtLabel(preparedAt),
    checklist: buildPrepareChecklistDisplay(engagement.prepare_checklist_json),
  };
}

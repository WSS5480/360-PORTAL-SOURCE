import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { buildEngagementDetailHref, buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";

function readObservationProducts(caseRow: Record<string, unknown>, lineProductNames: string[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  const push = (raw: unknown) => {
    const value = String(raw ?? "").trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(value);
  };

  push(caseRow.live_observation_competitors);
  push(caseRow.live_observation_product_fit);
  push(caseRow.live_observation_tools_used);
  for (const name of lineProductNames) push(name);

  return items.slice(0, 6);
}

export function buildObservationProductsObserved(
  caseRow: Record<string, unknown>,
  lineProductNames: string[] = [],
): string[] {
  return readObservationProducts(caseRow, lineProductNames);
}

export type ObservationRelatedEngagementView = {
  id: string;
  label: string;
  statusLabel: string;
  dateLabel: string;
  detailHref: string;
  prepareHref: string;
};

export function buildObservationRelatedEngagementView(
  engagement: Record<string, unknown> | null | undefined,
): ObservationRelatedEngagementView | null {
  if (!engagement?.id) return null;
  const id = String(engagement.id);
  const typeLabel = formatEngagementType(String(engagement.engagement_type ?? ""));
  const statusLabel = String(engagement.status ?? "planned")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const dateRaw = String(engagement.engagement_date ?? engagement.scheduled_at ?? "").trim();
  const dateLabel = dateRaw
    ? new Date(`${dateRaw.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Date TBD";

  return {
    id,
    label: typeLabel,
    statusLabel,
    dateLabel,
    detailHref: buildEngagementDetailHref(id),
    prepareHref: buildEngagementPrepareForMeetingHref(id),
  };
}

export function formatObservationCaseSnapshotRef(caseNumber: string | null | undefined): string {
  const formatted = formatSurgicalCaseNumber(String(caseNumber ?? ""));
  return formatted || "—";
}

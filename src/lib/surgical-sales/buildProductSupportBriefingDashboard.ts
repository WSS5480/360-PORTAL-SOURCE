import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import {
  buildCaseFieldWatchBriefing,
  flattenCaseFieldWatchBriefing,
  type CaseFieldWatchBriefing,
} from "@/lib/surgical-sales/caseFieldWatchBriefing";
import {
  buildProductSupportKnownInsights,
  buildProductSupportMissionBullets,
} from "@/lib/surgical-sales/buildProductSupportRepBriefingContent";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import { formatSurgicalCaseStatus } from "@/lib/surgical-sales/labels";
export type ProductSupportBriefingInsight = {
  id: string;
  text: string;
};

export type ProductSupportTrendingSignal = {
  id: string;
  text: string;
};

export type ProductSupportCaseSnapshotRow = {
  label: string;
  value: string;
};

export type ProductSupportBriefingDashboard = {
  missionBullets: string[];
  knownInsights: ProductSupportBriefingInsight[];
  watchBriefing: CaseFieldWatchBriefing;
  /** @deprecated Use watchBriefing — flat strings for legacy callers. */
  watchItems: string[];
  trendingSignals: ProductSupportTrendingSignal[];
  snapshotRows: ProductSupportCaseSnapshotRow[];
};
type ActivityInput = {
  activity_type?: string;
  body?: string;
  metadata_json?: Record<string, unknown> | null;
};

function trendingSignals(activities: ActivityInput[] | undefined): ProductSupportTrendingSignal[] {
  const counts = new Map<string, number>();

  for (const activity of activities ?? []) {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") continue;
    const body = String(activity.body ?? "").toLowerCase();
    if (!body) continue;

    if (/\b(training|education|in-service|teach)\b/.test(body)) {
      counts.set("training", (counts.get("training") ?? 0) + 1);
    }
    if (/\b(volume|more cases|busier|increasing)\b/.test(body)) {
      counts.set("volume", (counts.get("volume") ?? 0) + 1);
    }
    if (/\b(interest|evaluat|trial|demo|fit)\b/.test(body)) {
      counts.set("interest", (counts.get("interest") ?? 0) + 1);
    }
    if (/\b(reorder|restock|inventory|availability)\b/.test(body)) {
      counts.set("inventory", (counts.get("inventory") ?? 0) + 1);
    }
  }

  const signals: ProductSupportTrendingSignal[] = [];
  if ((counts.get("volume") ?? 0) >= 2) {
    signals.push({ id: "volume", text: "Increasing procedure volume" });
  }
  if ((counts.get("interest") ?? 0) >= 2) {
    signals.push({ id: "interest", text: "Additional product interest" });
  }
  if ((counts.get("training") ?? 0) >= 2) {
    signals.push({ id: "training", text: "Training requests increasing" });
  }
  if ((counts.get("inventory") ?? 0) >= 2) {
    signals.push({ id: "inventory", text: "Inventory availability questions recurring" });
  }

  return signals;
}

function snapshotRows(input: {
  caseRow: Record<string, unknown>;
  products: ProductSupportOverviewProductLine[];
  supportRepName?: string | null;
  poAttached: boolean;
  caseTypeLabel: string;
}): ProductSupportCaseSnapshotRow[] {
  const plannedCount = input.products.length;
  const usedCount = input.products.filter((line) => line.actualQuantity != null).length;
  const room = String(input.caseRow.case_room_assignment ?? "").trim();
  const procedure = String(input.caseRow.procedure_type ?? "").trim();
  const expectedRevenue = Number(input.caseRow.expected_revenue ?? 0);
  const actualRaw = input.caseRow.actual_revenue;
  const actualRevenue =
    actualRaw == null || actualRaw === "" ? null : Number(actualRaw);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const revenueLabel =
    actualRevenue != null && Number.isFinite(actualRevenue)
      ? `${money.format(expectedRevenue)} expected · ${money.format(actualRevenue)} actual`
      : expectedRevenue > 0
        ? money.format(expectedRevenue)
        : "—";

  return [
    { label: "Procedure", value: procedure || "—" },
    { label: "Revenue per case", value: revenueLabel },
    { label: "Products planned", value: plannedCount > 0 ? `${plannedCount} item${plannedCount === 1 ? "" : "s"}` : "None" },
    { label: "Products used", value: usedCount > 0 ? `${usedCount} logged` : "Not logged yet" },
    { label: "PO attached", value: input.poAttached ? "Yes" : "No" },
    { label: "Case type", value: input.caseTypeLabel },
    { label: "OR / Room", value: room || "—" },
    { label: "Support rep", value: input.supportRepName?.trim() || "—" },
    {
      label: "Case status",
      value: formatSurgicalCaseStatus(input.caseRow.status),
    },
  ];
}

export function buildProductSupportBriefingDashboard(input: {
  caseRow: Record<string, unknown>;
  products: ProductSupportOverviewProductLine[];
  providerContact?: Record<string, unknown> | null;
  operationalContext?: CaseOperationalContextView | null;
  activities?: ActivityInput[];
  priorCases?: Array<Record<string, unknown>>;
  specialty?: string | null;
  supportRepName?: string | null;
  poAttached?: boolean;
  caseTypeLabel?: string;
  hasObservationEvidence?: boolean;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ProductSupportBriefingDashboard {
  const watchBriefing = buildCaseFieldWatchBriefing({
    caseRow: input.caseRow,
    providerContact: input.providerContact,
    priorCases: input.priorCases,
    activities: input.activities,
    operationalContext: input.operationalContext,
    universalFactsReadModel: input.universalFactsReadModel,
  });

  return {
    missionBullets: buildProductSupportMissionBullets({
      caseRow: input.caseRow,
      products: input.products,
    }),
    knownInsights: buildProductSupportKnownInsights({
      caseRow: input.caseRow,
      providerContact: input.providerContact,
      specialty: input.specialty,
      priorCases: input.priorCases,
      activities: input.activities,
    }),
    watchBriefing,
    watchItems: flattenCaseFieldWatchBriefing(watchBriefing),
    trendingSignals: trendingSignals(input.activities),
    snapshotRows: snapshotRows({
      caseRow: input.caseRow,
      products: input.products,
      supportRepName: input.supportRepName,
      poAttached: input.poAttached ?? false,
      caseTypeLabel: input.caseTypeLabel ?? "Product Support",
    }),
  };
}

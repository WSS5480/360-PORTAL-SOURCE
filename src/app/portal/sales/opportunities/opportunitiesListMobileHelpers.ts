import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";

export type MobileOpportunityListSegmentId =
  | "all"
  | "discovery"
  | "evaluation"
  | "preference_card"
  | "won"
  | "lost";

export const MOBILE_OPPORTUNITY_LIST_SEGMENTS: ReadonlyArray<{
  id: MobileOpportunityListSegmentId;
  label: string;
  stages: SalesStage[] | null;
}> = [
  { id: "all", label: "All", stages: null },
  {
    id: "discovery",
    label: "Discovery",
    stages: ["discovery", "clinical_validation"],
  },
  {
    id: "evaluation",
    label: "Evaluation",
    stages: ["evaluation_planned", "evaluation_active", "outcome_review"],
  },
  {
    id: "preference_card",
    label: "Preference Card",
    stages: ["preference_card_progress", "adoption_expanding"],
  },
  { id: "won", label: "Won", stages: ["won"] },
  { id: "lost", label: "Lost", stages: ["lost"] },
] as const;

export type OpportunityListRow = {
  id: string;
  account_id?: string | null;
  account_name: string;
  physician_name?: string | null;
  surgeon_contact_id?: string | null;
  product_line?: string;
  product_display?: string;
  stage: SalesStage;
  next_action?: string | null;
  linked_cases_count?: number;
  linked_engagements_count?: number;
  updated_at?: string;
};

export function getPrimaryProductLine(o: OpportunityListRow): string {
  const raw = String(o.product_display || o.product_line || "").trim();
  if (!raw) return "No product line";
  const firstEntry = raw.split(",")[0]?.trim() || raw;
  return firstEntry.split(" · ")[0]?.trim() || firstEntry;
}

export function filterOpportunitiesByMobileSegment(
  rows: OpportunityListRow[],
  segment: MobileOpportunityListSegmentId,
): OpportunityListRow[] {
  const def = MOBILE_OPPORTUNITY_LIST_SEGMENTS.find((s) => s.id === segment);
  if (!def?.stages) return rows;
  const allowed = new Set(def.stages);
  return rows.filter((o) => {
    const stage = normalizeSalesStage(o.stage);
    return stage != null && allowed.has(stage);
  });
}

export function filterOpportunitiesBySearch(rows: OpportunityListRow[], query: string): OpportunityListRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((o) => {
    const hay = [
      o.account_name,
      o.physician_name || "",
      o.product_display || "",
      o.product_line || "",
      o.next_action || "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function formatLastActivityLabel(iso?: string | null): string {
  if (!iso) return "No activity";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "No activity";
  const days = Math.max(0, Math.floor(ms / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

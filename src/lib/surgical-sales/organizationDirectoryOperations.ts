import { attentionPriority, type OrgAttentionItem } from "@/lib/surgical-sales/organizationDirectoryAttention";
import type {
  DirectoryReadinessGap,
  DirectoryReadinessSummary,
  TacticalActionChip,
} from "@/lib/surgical-sales/operationsDirectorySignals";
import { buildReadinessHeadline, openReadinessGaps } from "@/lib/surgical-sales/operationsDirectorySignals";

export type OrganizationDirectoryRow = {
  id: string;
  name: string | null;
  surgical_crm_status?: string | null;
  doctor_contact_count?: number;
  surgeon_count?: number;
  contact_count?: number;
  upcoming_case_count?: number;
  last_activity_at?: string | null;
  attention_items?: OrgAttentionItem[];
  surgical_crm_billing_city?: string | null;
  surgical_crm_billing_state?: string | null;
};

export type OrganizationOpsStatus = "blocked" | "active" | "advancing";

function doctorCount(org: OrganizationDirectoryRow): number {
  return org.doctor_contact_count ?? org.surgeon_count ?? 0;
}

export function deriveOrganizationOpsStatus(org: OrganizationDirectoryRow): OrganizationOpsStatus {
  const items = org.attention_items ?? [];
  const pri = attentionPriority(items);
  if (pri >= 3) return "blocked";
  if ((org.upcoming_case_count ?? 0) > 0 || pri >= 2) return "advancing";
  return "active";
}

export function organizationDisplayName(org: OrganizationDirectoryRow): string {
  return org.name?.trim() || "Untitled organization";
}

export function organizationLocationLine(org: OrganizationDirectoryRow): string {
  const city = String(org.surgical_crm_billing_city || "").trim();
  const state = String(org.surgical_crm_billing_state || "").trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "Location not set";
}

export function organizationStageLabel(org: OrganizationDirectoryRow): string {
  const st = String(org.surgical_crm_status || "").trim().toLowerCase();
  if (!st) return "Status unknown";
  return st.charAt(0).toUpperCase() + st.slice(1);
}

export function organizationUpcomingLabel(org: OrganizationDirectoryRow): string {
  const n = org.upcoming_case_count ?? 0;
  if (n <= 0) return "No cases scheduled";
  return n === 1 ? "1 case scheduled" : `${n} cases scheduled`;
}

export function buildOrganizationDirectoryReadinessGaps(org: OrganizationDirectoryRow): DirectoryReadinessGap[] {
  const gaps: DirectoryReadinessGap[] = [];
  const items = org.attention_items ?? [];
  const doctors = doctorCount(org);

  for (const item of items.slice(0, 4)) {
    gaps.push({
      id: item.code,
      label: item.label,
      tone: item.severity === "high" ? "warn" : item.severity === "medium" ? "gap" : "gap",
    });
  }

  if (doctors === 0) {
    gaps.push({ id: "no_doctor", label: "No surgeon or PA on file", tone: "warn" });
  }

  if (doctors > 0 && !items.some((i) => i.code === "no_doctor")) {
    gaps.push({
      id: "clinicians",
      label: doctors === 1 ? "Clinician roster on file" : `${doctors} clinicians on file`,
      tone: "ok",
    });
  }

  if ((org.upcoming_case_count ?? 0) > 0 && !items.some((i) => i.code === "upcoming_surgery_7d")) {
    gaps.push({ id: "pipeline", label: "Active surgical pipeline", tone: "ok" });
  }

  if ((org.contact_count ?? 0) > 0 && !items.some((i) => i.code === "stale_activity")) {
    gaps.push({ id: "contacts", label: "Contact network established", tone: "ok" });
  }

  if (!gaps.length) {
    gaps.push({ id: "baseline", label: "Facility baseline forming", tone: "gap" });
  }

  const rank = { warn: 0, gap: 1, ok: 2 };
  return [...gaps]
    .sort((a, b) => rank[a.tone] - rank[b.tone])
    .filter((g, i, arr) => arr.findIndex((x) => x.label === g.label) === i)
    .slice(0, 6);
}

export function buildOrganizationDirectoryReadinessSummary(org: OrganizationDirectoryRow): DirectoryReadinessSummary {
  const gaps = buildOrganizationDirectoryReadinessGaps(org);
  const open = openReadinessGaps(gaps);
  const { headline, subline } = buildReadinessHeadline(gaps, {
    readyHeadline: "Facility readiness · On track",
    contextLabel: "Operational friction",
    contextPercent: open.length === 0 ? 100 : Math.max(0, 100 - open.length * 20),
  });
  return { headline, subline, gaps, openGapCount: open.length };
}

/** @deprecated Use buildOrganizationDirectoryReadinessGaps */
export function buildOrganizationDirectoryOperationalSignals(org: OrganizationDirectoryRow): DirectoryReadinessGap[] {
  return buildOrganizationDirectoryReadinessGaps(org);
}

export function deriveOrganizationTacticalActions(org: OrganizationDirectoryRow): TacticalActionChip[] {
  const base = `/portal/sales/accounts/${encodeURIComponent(org.id)}`;
  const items = org.attention_items ?? [];
  const primary = items[0];
  const actions: TacticalActionChip[] = [
    { id: "open", label: "Open", href: base },
    { id: "intel", label: "Intel", href: `${base}?tab=intelligence` },
    { id: "cases", label: "Cases", href: `${base}?tab=cases` },
  ];

  if (primary) {
    actions.unshift({
      id: "resolve",
      label: primary.ctaLabel.length > 12 ? "Resolve" : primary.ctaLabel,
      href: primary.ctaHref,
      emphasis: primary.severity === "high",
    });
  }

  if (doctorCount(org) === 0) {
    actions.push({
      id: "clinician",
      label: "Clinician",
      href: `${base}?tab=contacts&new_contact=1`,
    });
  }

  return actions.slice(0, 5);
}

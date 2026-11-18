export const ORG_PRODUCT_APPROVAL_STATUSES = [
  "not_started",
  "in_progress",
  "submitted",
  "under_review",
  "approved",
  "denied",
] as const;

export type OrgProductApprovalStatus = (typeof ORG_PRODUCT_APPROVAL_STATUSES)[number];

export const ORG_PRODUCT_APPROVAL_STATUS_LABEL: Record<OrgProductApprovalStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  denied: "Denied",
};

export const ORG_PRODUCT_APPROVAL_STATUS_STYLE: Record<
  OrgProductApprovalStatus,
  { bg: string; fg: string; border: string }
> = {
  not_started: { bg: "rgba(100, 116, 139, 0.12)", fg: "#475569", border: "rgba(100, 116, 139, 0.35)" },
  in_progress: { bg: "rgba(14, 165, 233, 0.12)", fg: "#0369a1", border: "rgba(14, 165, 233, 0.35)" },
  submitted: { bg: "rgba(99, 102, 241, 0.12)", fg: "#4338ca", border: "rgba(99, 102, 241, 0.35)" },
  under_review: { bg: "rgba(245, 158, 11, 0.14)", fg: "#b45309", border: "rgba(245, 158, 11, 0.4)" },
  approved: { bg: "rgba(6, 118, 71, 0.16)", fg: "var(--success)", border: "rgba(6, 118, 71, 0.45)" },
  denied: { bg: "rgba(180, 35, 24, 0.08)", fg: "var(--danger)", border: "rgba(180, 35, 24, 0.25)" },
};

export type OrgProductApprovalRow = {
  id: string;
  organization_id: string;
  product_id: string;
  status: OrgProductApprovalStatus;
  champion_contact_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type OrgProductApprovalListItem = OrgProductApprovalRow & {
  product_name: string;
  product_category: string | null;
  champion_name: string | null;
};

export function normalizeOrgProductApprovalStatus(raw: string | null | undefined): OrgProductApprovalStatus | null {
  const s = String(raw ?? "").trim();
  if ((ORG_PRODUCT_APPROVAL_STATUSES as readonly string[]).includes(s)) return s as OrgProductApprovalStatus;
  return null;
}

export function orgProductApprovalStatusLabel(raw: string | null | undefined): string {
  const n = normalizeOrgProductApprovalStatus(raw);
  return n ? ORG_PRODUCT_APPROVAL_STATUS_LABEL[n] : "—";
}

export function orgProductApprovalStatusStyle(raw: string | null | undefined): {
  bg: string;
  fg: string;
  border: string;
} {
  const n = normalizeOrgProductApprovalStatus(raw);
  return n ? ORG_PRODUCT_APPROVAL_STATUS_STYLE[n] : ORG_PRODUCT_APPROVAL_STATUS_STYLE.not_started;
}

export function isOrgProductApprovalPending(status: string | null | undefined): boolean {
  const n = normalizeOrgProductApprovalStatus(status);
  return !!n && n !== "approved" && n !== "denied";
}

export function summarizeOrgProductApprovals(items: OrgProductApprovalListItem[]) {
  let approved = 0;
  let pending = 0;
  let denied = 0;
  for (const item of items) {
    if (item.status === "approved") approved += 1;
    else if (item.status === "denied") denied += 1;
    else pending += 1;
  }
  return { total: items.length, approved, pending, denied };
}

/** Set submitted_at / approved_at when status transitions (MVP manual tracking). */
export function orgProductApprovalStatusSideEffects(
  nextStatus: OrgProductApprovalStatus,
  prev: Pick<OrgProductApprovalRow, "status" | "submitted_at" | "approved_at">,
  nowIso: string,
): { submitted_at: string | null; approved_at: string | null } {
  let submitted_at = prev.submitted_at;
  let approved_at = prev.approved_at;

  if (
    !submitted_at &&
    (nextStatus === "submitted" || nextStatus === "under_review" || nextStatus === "approved" || nextStatus === "denied")
  ) {
    submitted_at = nowIso;
  }

  if (nextStatus === "approved" && !approved_at) {
    approved_at = nowIso;
  }

  if (nextStatus !== "approved") {
    approved_at = prev.approved_at;
  }

  return { submitted_at, approved_at };
}

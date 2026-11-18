import { supabaseAdmin } from "@/lib/supabase/admin";

export const TIME_OFF_REQUEST_TYPES = {
  PTO: "pto",
  SICK: "sick",
  PERSONAL: "personal",
} as const;

export type TimeOffRequestType = (typeof TIME_OFF_REQUEST_TYPES)[keyof typeof TIME_OFF_REQUEST_TYPES];

export const TIME_OFF_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  DENIED: "denied",
  CANCELLED: "cancelled",
} as const;

export type TimeOffStatus = (typeof TIME_OFF_STATUSES)[keyof typeof TIME_OFF_STATUSES];

export const TIME_OFF_TYPE_LABELS: Record<TimeOffRequestType, string> = {
  pto: "PTO / Vacation",
  sick: "Sick leave",
  personal: "Personal day",
};

export const TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  denied: "Denied",
  cancelled: "Cancelled",
};

export type TimeOffRequestRow = {
  id: string;
  requester_user_id: string;
  request_type: TimeOffRequestType;
  start_date: string;
  end_date: string;
  notes: string | null;
  status: TimeOffStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeOffRequestWithUser = TimeOffRequestRow & {
  requester_name: string | null;
  requester_email: string | null;
  reviewer_name: string | null;
};

function formatDateRange(start: string, end: string): string {
  const s = String(start).slice(0, 10);
  const e = String(end).slice(0, 10);
  if (s === e) return s;
  return `${s} – ${e}`;
}

function countBusinessDays(start: string, end: string): number {
  const s = new Date(`${String(start).slice(0, 10)}T12:00:00Z`);
  const e = new Date(`${String(end).slice(0, 10)}T12:00:00Z`);
  let n = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) n += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.max(1, n);
}

export async function loadUserDisplayNames(userIds: string[]): Promise<Map<string, { name: string | null; email: string | null }>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length === 0) return out;

  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", ids);
  for (const row of data || []) {
    const uid = String((row as { user_id: string }).user_id);
    out.set(uid, {
      name: (row as { full_name?: string | null }).full_name ?? null,
      email: (row as { email?: string | null }).email ?? null,
    });
  }
  return out;
}

export async function enrichTimeOffRequests(rows: TimeOffRequestRow[]): Promise<TimeOffRequestWithUser[]> {
  const userIds = rows.flatMap((r) => [r.requester_user_id, r.reviewed_by].filter(Boolean) as string[]);
  const names = await loadUserDisplayNames(userIds);
  return rows.map((r) => {
    const req = names.get(r.requester_user_id);
    const rev = r.reviewed_by ? names.get(r.reviewed_by) : undefined;
    return {
      ...r,
      requester_name: req?.name ?? null,
      requester_email: req?.email ?? null,
      reviewer_name: rev?.name ?? null,
    };
  });
}

export async function notifyAdminsOfTimeOffRequest(params: {
  requestId: string;
  requesterUserId: string;
  requestType: TimeOffRequestType;
  startDate: string;
  endDate: string;
  notes?: string | null;
}): Promise<void> {
  const names = await loadUserDisplayNames([params.requesterUserId]);
  const rep = names.get(params.requesterUserId);
  const repLabel = rep?.name?.trim() || rep?.email?.trim() || "A sales rep";
  const typeLabel = TIME_OFF_TYPE_LABELS[params.requestType];
  const range = formatDateRange(params.startDate, params.endDate);
  const days = countBusinessDays(params.startDate, params.endDate);

  const title = `Time off request — ${repLabel}`;
  const bodyParts = [`${typeLabel} · ${range} (${days} business day${days === 1 ? "" : "s"})`];
  if (params.notes?.trim()) bodyParts.push(params.notes.trim());

  await supabaseAdmin.from("admin_internal_notifications").insert({
    notification_type: "time_off_request",
    title,
    body: bodyParts.join("\n"),
    metadata_json: {
      request_id: params.requestId,
      requester_user_id: params.requesterUserId,
      request_type: params.requestType,
      start_date: params.startDate,
      end_date: params.endDate,
    },
    dedupe_key: `time_off_request:${params.requestId}`,
    read_at: null,
  });
}

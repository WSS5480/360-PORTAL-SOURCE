// src/lib/portal/getPortalContext.ts
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { getOptionalUser, requireUser } from "@/lib/auth/requireUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { applyPortalIvrScope, seesFullAccountPortalData } from "@/lib/portal/portalRowScope";

export type PortalMembershipRow = {
  account_id: string;
  role: string;
  disabled_at: string | null;
  accounts: { id: string; name: string }[] | null;
};

export type PortalMembership = {
  account_id: string;
  role: string;
  disabled_at: string | null;
  account: { id: string; name: string } | null;
};

export type PendingInfoItem = {
  id: string;
  requested_at: string | null;
  message: string | null;
  status: string | null;

  patient_first_name: string | null;
  patient_last_name: string | null;
};

export type PortalContext = {
  user: User | null;
  memberships: PortalMembership[];
  currentAccountId: string | null;
  currentRole: string | null;
  currentAccountName: string | null;
  pendingInfoCount: number;
  pendingInfoItems: PendingInfoItem[];
};

function emptyPortalContext(): PortalContext {
  return {
    user: null,
    memberships: [],
    currentAccountId: null,
    currentRole: null,
    currentAccountName: null,
    pendingInfoCount: 0,
    pendingInfoItems: [],
  };
}

export type GetPortalContextOptions = {
  /** When true, missing session returns an empty context instead of redirecting (for Route Handlers). */
  allowMissingSession?: boolean;
};

/**
 * Build portal context for a user already established by `supabase.auth.getUser()`
 * (e.g. `/api/portal/me`). Avoids a second cookie/session read that can disagree under load.
 */
export async function getPortalContextForAuthenticatedUser(user: User): Promise<PortalContext> {
  const { data, error } = await supabaseAdmin
    .from("account_users")
    .select("account_id, role, disabled_at, accounts:accounts(id,name)")
    .eq("user_id", user.id)
    .is("disabled_at", null);

  if (error) throw new Error(error.message);

  const rows = (data || []) as PortalMembershipRow[];

  const memberships: PortalMembership[] = rows.map((r) => {
    const acc = r.accounts;
    const account = acc
      ? Array.isArray(acc)
        ? acc.length
          ? acc[0]
          : null
        : acc
      : null;
    return {
      account_id: r.account_id,
      role: r.role,
      disabled_at: r.disabled_at,
      account: account as { id: string; name: string } | null,
    };
  });

  if (memberships.length === 0) {
    return {
      user,
      memberships: [],
      currentAccountId: null,
      currentRole: null,
      currentAccountName: null,

      pendingInfoCount: 0,
      pendingInfoItems: [],
    };
  }

  const cookieStore = await cookies();
  const selected = cookieStore.get("portal_account")?.value;

  const validSelected =
    selected && memberships.some((m) => m.account_id === selected) ? selected : null;

  const currentAccountId = validSelected ?? memberships[0].account_id;
  const current = memberships.find((m) => m.account_id === currentAccountId) ?? memberships[0];

  // 🔥 Pending additional-info requests for THIS account (non-admins: own IVRs only)
  // "Pending" = requested_at set AND submitted_at is null
  let pendingQ = supabaseAdmin
    .from("ivr_requests")
    .select(
      "id, status, additional_info_requested_at, additional_info_message, patient_first_name, patient_last_name"
    )
    .eq("account_id", currentAccountId)
    .not("additional_info_requested_at", "is", null)
    .is("additional_info_submitted_at", null);

  if (!seesFullAccountPortalData(current.role)) {
    pendingQ = applyPortalIvrScope(pendingQ, user.id, current.role);
  }

  const pendingRes = await pendingQ
    .order("additional_info_requested_at", { ascending: false })
    .limit(5);

  const pendingInfoItems: PendingInfoItem[] =
    pendingRes.error || !Array.isArray(pendingRes.data)
      ? []
      : pendingRes.data.map((r: any) => ({
          id: String(r.id),
          requested_at: r.additional_info_requested_at ?? null,
          message: r.additional_info_message ?? null,
          status: r.status ?? null,
          patient_first_name: r.patient_first_name ?? null,
          patient_last_name: r.patient_last_name ?? null,
        }));

  return {
    user,
    memberships,
    currentAccountId,
    currentRole: current.role,
    currentAccountName: current.account?.name ?? null,

    pendingInfoCount: pendingInfoItems.length,
    pendingInfoItems,
  };
}

export async function getPortalContext(opts?: GetPortalContextOptions): Promise<PortalContext> {
  const user = opts?.allowMissingSession ? await getOptionalUser() : await requireUser();
  if (!user) return emptyPortalContext();
  return getPortalContextForAuthenticatedUser(user);
}

import { supabaseAdmin } from "@/lib/supabase/admin";
import { defaultVirtualWarehouseAccessForAccountRole } from "@/lib/portal/virtualWarehouseAccessDefaultForRole";

export const INTERNAL_TEAM_ACCOUNT_NAME = "360 Medical Internal Team";

/**
 * Resolve the shared internal ordering account every Sales Command teammate
 * should belong to (env override, else lookup by name).
 */
export async function resolveInternalTeamAccountId(): Promise<
  { ok: true; accountId: string } | { ok: false; error: string }
> {
  const fromEnv = String(process.env.INTERNAL_TEAM_ACCOUNT_ID ?? "").trim();
  if (fromEnv) return { ok: true, accountId: fromEnv };

  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("name", INTERNAL_TEAM_ACCOUNT_NAME)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) {
    return {
      ok: false,
      error: `Account "${INTERNAL_TEAM_ACCOUNT_NAME}" not found. Set INTERNAL_TEAM_ACCOUNT_ID or create the account.`,
    };
  }
  return { ok: true, accountId: String(data.id) };
}

/**
 * Ensure the user has an active membership on 360 Medical Internal Team.
 * Idempotent — safe to call on invite and role updates.
 */
export async function ensureInternalTeamMembership(
  userId: string,
  accountRole: "ACCOUNT_ADMIN" | "ORDER_CREATOR" = "ORDER_CREATOR",
): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  const resolved = await resolveInternalTeamAccountId();
  if (!resolved.ok) return resolved;

  const accountId = resolved.accountId;
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("account_users")
    .select("user_id, role, disabled_at")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingErr) return { ok: false, error: existingErr.message };

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (existing.disabled_at) patch.disabled_at = null;
    // Promote to ACCOUNT_ADMIN when requested; never demote an existing admin via this helper.
    if (accountRole === "ACCOUNT_ADMIN" && String(existing.role ?? "").toUpperCase() !== "ACCOUNT_ADMIN") {
      patch.role = "ACCOUNT_ADMIN";
      patch.virtual_warehouse_access = defaultVirtualWarehouseAccessForAccountRole("ACCOUNT_ADMIN");
    }
    if (Object.keys(patch).length) {
      const { error: upErr } = await supabaseAdmin
        .from("account_users")
        .update(patch)
        .eq("account_id", accountId)
        .eq("user_id", userId);
      if (upErr) return { ok: false, error: upErr.message };
    }
    return { ok: true, accountId };
  }

  const { error: insErr } = await supabaseAdmin.from("account_users").insert({
    account_id: accountId,
    user_id: userId,
    role: accountRole,
    virtual_warehouse_access: defaultVirtualWarehouseAccessForAccountRole(accountRole),
  });
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true, accountId };
}

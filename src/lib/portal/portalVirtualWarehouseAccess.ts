/**
 * Effective portal virtual warehouse access = account pricing flag ON
 * AND this membership row allows it (account_users.virtual_warehouse_access).
 */

export async function portalUserHasVirtualWarehouseAccess(
  sb: any,
  accountId: string,
  userId: string
): Promise<boolean> {
  const uid = String(userId || "").trim();
  const aid = String(accountId || "").trim();
  if (!uid || !aid) return false;

  const { data: pr, error: pErr } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled")
    .eq("account_id", aid)
    .maybeSingle();
  if (pErr || !(pr as any)?.virtual_warehouse_enabled) return false;

  const { data: mem, error: mErr } = await sb
    .from("account_users")
    .select("virtual_warehouse_access")
    .eq("account_id", aid)
    .eq("user_id", uid)
    .maybeSingle();
  if (mErr || !mem) return false;
  return (mem as any).virtual_warehouse_access !== false;
}

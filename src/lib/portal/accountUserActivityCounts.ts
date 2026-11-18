/**
 * Aggregate order + IVR counts per auth user for an account (for account admin “team” views).
 *
 * Orders: counted by `orders.created_by_user_id` for the account.
 * IVRs: each request is attributed to `submitted_by_user_id` if set, else `created_by_user_id`.
 */

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

const PAGE = 1000;

async function fetchAllRows(sb: any, table: string, select: string, accountId: string): Promise<any[]> {
  const out: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select(select)
      .eq("account_id", accountId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const chunk = Array.isArray(data) ? data : [];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function loadAccountUserActivityCounts(
  sb: any,
  accountId: string
): Promise<{ orderCountByUserId: Map<string, number>; ivrCountByUserId: Map<string, number> }> {
  const orderCountByUserId = new Map<string, number>();
  const ivrCountByUserId = new Map<string, number>();

  const orderRows = await fetchAllRows(sb, "orders", "created_by_user_id", accountId);
  for (const row of orderRows) {
    const uid = safeStr((row as any)?.created_by_user_id).trim();
    if (!uid) continue;
    orderCountByUserId.set(uid, (orderCountByUserId.get(uid) ?? 0) + 1);
  }

  const ivrRows = await fetchAllRows(sb, "ivr_requests", "submitted_by_user_id, created_by_user_id", accountId);
  for (const row of ivrRows) {
    const sub = safeStr((row as any)?.submitted_by_user_id).trim();
    const cre = safeStr((row as any)?.created_by_user_id).trim();
    const uid = sub || cre;
    if (!uid) continue;
    ivrCountByUserId.set(uid, (ivrCountByUserId.get(uid) ?? 0) + 1);
  }

  return { orderCountByUserId, ivrCountByUserId };
}

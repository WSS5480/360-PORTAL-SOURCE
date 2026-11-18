// src/lib/portal/portalRowScope.ts
/**
 * Row-level visibility for portal users on a shared account:
 * - ACCOUNT_ADMIN: all orders / IVR / invoices for the account (unchanged).
 * - Other roles (ORDER_CREATOR, ORDER_VIEWER, READ_ONLY, IVR_SUBMITTER): only resources
 *   created by or explicitly tied to this login (orders: created_by_user_id or contact link).
 *
 * Enforcement is application-side (service role queries); keep every list + detail path in sync.
 */

function normRole(role: string | null | undefined) {
  return String(role || "").trim().toUpperCase();
}

/** Full account visibility (everyone's data for that account). */
export function seesFullAccountPortalData(role: string | null | undefined): boolean {
  return normRole(role) === "ACCOUNT_ADMIN";
}

export async function loadOwnContactIdsForAccount(sb: any, accountId: string, userId: string): Promise<string[]> {
  const { data, error } = await sb
    .from("account_contacts")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => String(r.id)).filter(Boolean);
}

/** PostgREST `or` clause for orders visible to a non-admin portal user. */
export function buildOrderOwnOrFilter(userId: string, contactIds: string[]): string {
  const parts = [`created_by_user_id.eq.${userId}`];
  if (contactIds.length) {
    parts.push(`submitted_by_contact_id.in.(${contactIds.join(",")})`);
  }
  return parts.join(",");
}

/**
 * After `.eq("account_id", accountId)`, restrict to orders this user may see.
 *
 * Returns `{ query }` (not the builder alone): Supabase builders are thenable, so returning a
 * builder from an `async` function and doing `await applyPortalOrdersScope(...)` would execute
 * the query early. Callers must use `const { query } = await applyPortalOrdersScope(...)` then
 * chain `.order()` / `.limit()` on `query`.
 */
export async function applyPortalOrdersScope(
  sb: any,
  query: any,
  accountId: string,
  userId: string,
  role: string | null
): Promise<{ query: any }> {
  if (seesFullAccountPortalData(role)) return { query };
  const cids = await loadOwnContactIdsForAccount(sb, accountId, userId);
  return { query: query.or(buildOrderOwnOrFilter(userId, cids)) };
}

export async function isPortalOrderRowViewable(
  sb: any,
  accountId: string,
  userId: string,
  role: string | null,
  order: { account_id: string; created_by_user_id?: string | null; submitted_by_contact_id?: string | null }
): Promise<boolean> {
  if (String(order.account_id) !== String(accountId)) return false;
  if (seesFullAccountPortalData(role)) return true;
  if (String(order.created_by_user_id || "") === String(userId)) return true;
  const sc = order.submitted_by_contact_id;
  if (!sc) return false;
  const cids = await loadOwnContactIdsForAccount(sb, accountId, userId);
  return cids.includes(String(sc));
}

export type AllowedOrdersScope = { mode: "all" } | { mode: "ids"; ids: string[] };

export async function getPortalOrdersScope(
  sb: any,
  accountId: string,
  userId: string,
  role: string | null
): Promise<AllowedOrdersScope> {
  if (seesFullAccountPortalData(role)) return { mode: "all" };
  let q = sb.from("orders").select("id").eq("account_id", accountId);
  const scoped = await applyPortalOrdersScope(sb, q, accountId, userId, role);
  const { data, error } = await scoped.query;
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r: any) => String(r.id)).filter(Boolean);
  return { mode: "ids", ids };
}

/** IVR list / detail: own submissions only for non-admins. */
export function applyPortalIvrScope(query: any, userId: string, role: string | null): any {
  if (seesFullAccountPortalData(role)) return query;
  return query.or(`submitted_by_user_id.eq.${userId},created_by_user_id.eq.${userId}`);
}

export function isPortalIvrRowViewable(
  role: string | null,
  userId: string,
  ivr: { account_id: string; submitted_by_user_id?: string | null; created_by_user_id?: string | null },
  accountId: string
): boolean {
  if (String(ivr.account_id) !== String(accountId)) return false;
  if (seesFullAccountPortalData(role)) return true;
  return (
    String(ivr.submitted_by_user_id || "") === String(userId) ||
    String(ivr.created_by_user_id || "") === String(userId)
  );
}

export async function isPortalInvoiceRowViewable(
  sb: any,
  accountId: string,
  userId: string,
  role: string | null,
  invoice: { account_id: string; order_id?: string | null }
): Promise<boolean> {
  if (String(invoice.account_id) !== String(accountId)) return false;
  if (seesFullAccountPortalData(role)) return true;
  const oid = invoice.order_id;
  if (!oid) return false;
  const scope = await getPortalOrdersScope(sb, accountId, userId, role);
  if (scope.mode === "all") return true;
  return scope.ids.includes(String(oid));
}

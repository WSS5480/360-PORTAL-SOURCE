// src/lib/portal/portalRoles.ts
/**
 * Single source of truth for customer-portal role capabilities.
 *
 * Roles you’ve referenced so far:
 * - ACCOUNT_ADMIN
 * - ORDER_CREATOR
 * - ORDER_VIEWER
 * - READ_ONLY
 * - IVR_SUBMITTER (legacy; still supported)
 *
 * NOTE:
 * - New invites should default to ORDER_CREATOR (per your invite API).
 * - IVR_SUBMITTER remains allowed for older users until migrated.
 */

export type PortalRole =
  | "ACCOUNT_ADMIN"
  | "ORDER_CREATOR"
  | "ORDER_VIEWER"
  | "READ_ONLY"
  | "IVR_SUBMITTER"
  | string;

function norm(role: string | null | undefined) {
  return String(role || "").trim().toUpperCase();
}

function has(role: string | null | undefined, allowed: string[]) {
  const r = norm(role);
  return !!r && allowed.includes(r);
}

/** View Orders list / order detail */
export const ROLE_CAN_VIEW_ORDERS = ["ACCOUNT_ADMIN", "ORDER_VIEWER", "ORDER_CREATOR", "READ_ONLY"] as const;

/** Create draft orders, submit/confirm orders */
export const ROLE_CAN_CREATE_ORDERS = ["ACCOUNT_ADMIN", "ORDER_CREATOR"] as const;

/**
 * Locking is INTERNAL in most workflows.
 * If you truly want customers to lock, add ORDER_CREATOR here intentionally.
 */
export const ROLE_CAN_LOCK_ORDERS = ["ACCOUNT_ADMIN"] as const;

/** View IVR list / IVR detail */
export const ROLE_CAN_VIEW_IVR = ["ACCOUNT_ADMIN", "ORDER_VIEWER", "ORDER_CREATOR", "READ_ONLY", "IVR_SUBMITTER"] as const;

/** Submit IVR / upload additional info / do IVR actions */
export const ROLE_CAN_SUBMIT_IVR = ["ACCOUNT_ADMIN", "ORDER_CREATOR", "IVR_SUBMITTER"] as const;

// ---------- Primary exports (what routes/pages should use) ----------

export function canViewOrders(role: string | null) {
  return has(role, Array.from(ROLE_CAN_VIEW_ORDERS));
}

export function canCreateOrders(role: string | null) {
  return has(role, Array.from(ROLE_CAN_CREATE_ORDERS));
}

export function canLockOrders(role: string | null) {
  return has(role, Array.from(ROLE_CAN_LOCK_ORDERS));
}

export function canViewIvr(role: string | null) {
  return has(role, Array.from(ROLE_CAN_VIEW_IVR));
}

export function canSubmitIvr(role: string | null) {
  return has(role, Array.from(ROLE_CAN_SUBMIT_IVR));
}

/** Customer portal: full account administration (invite flow, account-level toggles, member list). */
export function isAccountAdmin(role: string | null | undefined): boolean {
  return norm(role) === "ACCOUNT_ADMIN";
}

// ---------- Backwards-compatible aliases (so older imports won’t break) ----------

// Some codebases use singular names; keep these so you don’t chase errors.
export const canViewOrder = canViewOrders;
export const canCreateOrder = canCreateOrders;
export const canSubmitOrder = canCreateOrders;

// If any older code referenced these:
export const canViewIVR = canViewIvr;
export const canSubmitIVR = canSubmitIvr;

/**
 * True if the user is a customer-side portal user
 * (i.e. not a 360 Medical internal admin/staff).
 *
 * IMPORTANT:
 * - This does NOT grant permissions
 * - It is only for UI logic / labeling / branching
 */
export function isPortalCustomer(role: string | null | undefined): boolean {
  const r = String(role || "").toUpperCase();

  // Any account-scoped role counts as a portal customer
  return (
    r === "ACCOUNT_ADMIN" ||
    r === "ORDER_CREATOR" ||
    r === "ORDER_VIEWER" ||
    r === "READ_ONLY" ||
    r === "IVR_SUBMITTER"
  );
}

/**
 * Default `account_users.virtual_warehouse_access` when a membership row is first created.
 * Non–account-admin customers start with VW off; account admins default on so they can manage the account.
 */
export function defaultVirtualWarehouseAccessForAccountRole(role: string): boolean {
  return String(role || "").trim().toUpperCase() === "ACCOUNT_ADMIN";
}

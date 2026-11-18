import type { SalesCommandDocumentAccessLevel } from "@/lib/sales-command/salesCommandDocumentTypes";

export type SalesCommandDocumentViewer = {
  isInternalSalesRep: boolean;
  isTerritoryManager: boolean;
  isAdmin?: boolean;
};

export function canViewSalesCommandDocumentFolder(
  accessLevel: SalesCommandDocumentAccessLevel,
  viewer: SalesCommandDocumentViewer,
): boolean {
  if (viewer.isAdmin) return true;
  if (accessLevel === "admin_only") return false;
  if (!viewer.isInternalSalesRep) return false;
  if (accessLevel === "all_reps") return true;
  return viewer.isTerritoryManager;
}

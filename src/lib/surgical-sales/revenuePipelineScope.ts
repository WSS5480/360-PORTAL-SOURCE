export type RevenuePipelineScope = "mine" | "team";

export function canViewRevenuePipelineTeam(flags: {
  isTerritoryManager?: boolean | null;
}): boolean {
  return flags.isTerritoryManager === true;
}

/** Territory managers default to team; everyone else stays on their own book. */
export function parseRevenuePipelineScope(
  raw: string | null | undefined,
  canViewTeam: boolean,
): RevenuePipelineScope {
  if (!canViewTeam) return "mine";
  if (String(raw || "").trim().toLowerCase() === "mine") return "mine";
  return "team";
}

export function revenuePipelineRepIdsForScope(params: {
  viewerId: string;
  scope: RevenuePipelineScope;
  assignedRepIds: string[];
}): string[] {
  const viewerId = String(params.viewerId || "").trim();
  if (!viewerId) return [];
  if (params.scope !== "team") return [viewerId];
  const assigned = params.assignedRepIds
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  return [...new Set([viewerId, ...assigned])];
}

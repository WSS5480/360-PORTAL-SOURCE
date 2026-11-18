export type LeaderboardTeamFilterType = "all" | "territory" | "region" | "product_line";

export type LeaderboardTeamFilter = {
  type: LeaderboardTeamFilterType;
  value?: string | null;
};

export type LeaderboardFilterOptions = {
  territories: string[];
  regions: string[];
  product_lines: string[];
};

/** US state → sales region (for team filter grouping). */
const STATE_TO_REGION: Record<string, string> = {
  AL: "Southeast",
  AK: "West",
  AZ: "West",
  AR: "Southeast",
  CA: "West",
  CO: "West",
  CT: "Northeast",
  DE: "Northeast",
  FL: "Southeast",
  GA: "Southeast",
  HI: "West",
  ID: "West",
  IL: "Midwest",
  IN: "Midwest",
  IA: "Midwest",
  KS: "Midwest",
  KY: "Southeast",
  LA: "Southeast",
  ME: "Northeast",
  MD: "Northeast",
  MA: "Northeast",
  MI: "Midwest",
  MN: "Midwest",
  MS: "Southeast",
  MO: "Midwest",
  MT: "West",
  NE: "Midwest",
  NV: "West",
  NH: "Northeast",
  NJ: "Northeast",
  NM: "West",
  NY: "Northeast",
  NC: "Southeast",
  ND: "Midwest",
  OH: "Midwest",
  OK: "South",
  OR: "West",
  PA: "Northeast",
  RI: "Northeast",
  SC: "Southeast",
  SD: "Midwest",
  TN: "Southeast",
  TX: "South",
  UT: "West",
  VT: "Northeast",
  VA: "Southeast",
  WA: "West",
  WV: "Southeast",
  WI: "Midwest",
  WY: "West",
  DC: "Northeast",
};

export const LEADERBOARD_REGIONS = ["Northeast", "Southeast", "Midwest", "South", "West"] as const;

export function resolveLeaderboardTeamFilter(
  teamTypeRaw: string | null | undefined,
  teamValueRaw: string | null | undefined,
): LeaderboardTeamFilter {
  const type = String(teamTypeRaw ?? "all").trim().toLowerCase();
  const value = teamValueRaw ? String(teamValueRaw).trim() : null;
  if (type === "territory" && value) return { type: "territory", value: value.toUpperCase() };
  if (type === "region" && value) return { type: "region", value };
  if (type === "product_line" && value) return { type: "product_line", value };
  return { type: "all" };
}

export function stateToSalesRegion(state: string | null | undefined): string | null {
  const key = String(state ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!key) return null;
  return STATE_TO_REGION[key] ?? null;
}

export function entityMatchesTeamFilter(args: {
  filter: LeaderboardTeamFilter;
  accountState?: string | null;
  productName?: string | null;
}): boolean {
  const { filter, accountState, productName } = args;
  if (filter.type === "all") return true;
  if (filter.type === "territory") {
    const st = String(accountState ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 2);
    return st === filter.value;
  }
  if (filter.type === "region") {
    return stateToSalesRegion(accountState) === filter.value;
  }
  if (filter.type === "product_line") {
    return String(productName ?? "").trim() === filter.value;
  }
  return true;
}

export function buildLeaderboardFilterOptions(args: {
  accountStates: string[];
  productNames: string[];
}): LeaderboardFilterOptions {
  const territories = [...new Set(args.accountStates.map((s) => s.trim().toUpperCase().slice(0, 2)).filter(Boolean))].sort();
  const regions = [
    ...new Set(args.accountStates.map((s) => stateToSalesRegion(s)).filter(Boolean) as string[]),
  ].sort();
  const product_lines = [...new Set(args.productNames.map((s) => s.trim()).filter(Boolean))].sort();
  return { territories, regions, product_lines };
}

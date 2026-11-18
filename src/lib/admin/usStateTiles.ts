export type TileCoord = { col: number; row: number; name: string };

/** statebins canonical US tile-grid layout (col 1-12, row 1-8). */
export const US_STATE_TILES: Record<string, TileCoord> = {
  AL: { col: 8, row: 7, name: "Alabama" },
  AK: { col: 1, row: 7, name: "Alaska" },
  AZ: { col: 3, row: 6, name: "Arizona" },
  AR: { col: 6, row: 6, name: "Arkansas" },
  CA: { col: 2, row: 5, name: "California" },
  CO: { col: 4, row: 5, name: "Colorado" },
  CT: { col: 11, row: 4, name: "Connecticut" },
  DC: { col: 10, row: 6, name: "District of Columbia" },
  DE: { col: 11, row: 5, name: "Delaware" },
  FL: { col: 10, row: 8, name: "Florida" },
  GA: { col: 9, row: 7, name: "Georgia" },
  HI: { col: 1, row: 8, name: "Hawaii" },
  ID: { col: 3, row: 3, name: "Idaho" },
  IL: { col: 7, row: 3, name: "Illinois" },
  IN: { col: 7, row: 4, name: "Indiana" },
  IA: { col: 6, row: 4, name: "Iowa" },
  KS: { col: 5, row: 6, name: "Kansas" },
  KY: { col: 7, row: 5, name: "Kentucky" },
  LA: { col: 6, row: 7, name: "Louisiana" },
  ME: { col: 12, row: 1, name: "Maine" },
  MD: { col: 10, row: 5, name: "Maryland" },
  MA: { col: 11, row: 3, name: "Massachusetts" },
  MI: { col: 8, row: 3, name: "Michigan" },
  MN: { col: 6, row: 3, name: "Minnesota" },
  MS: { col: 7, row: 7, name: "Mississippi" },
  MO: { col: 6, row: 5, name: "Missouri" },
  MT: { col: 4, row: 3, name: "Montana" },
  NE: { col: 5, row: 5, name: "Nebraska" },
  NV: { col: 3, row: 4, name: "Nevada" },
  NH: { col: 12, row: 2, name: "New Hampshire" },
  NJ: { col: 10, row: 4, name: "New Jersey" },
  NM: { col: 4, row: 6, name: "New Mexico" },
  NY: { col: 10, row: 3, name: "New York" },
  NC: { col: 8, row: 6, name: "North Carolina" },
  ND: { col: 5, row: 3, name: "North Dakota" },
  OH: { col: 8, row: 4, name: "Ohio" },
  OK: { col: 5, row: 7, name: "Oklahoma" },
  OR: { col: 2, row: 4, name: "Oregon" },
  PA: { col: 9, row: 4, name: "Pennsylvania" },
  RI: { col: 12, row: 4, name: "Rhode Island" },
  SC: { col: 9, row: 6, name: "South Carolina" },
  SD: { col: 5, row: 4, name: "South Dakota" },
  TN: { col: 7, row: 6, name: "Tennessee" },
  TX: { col: 5, row: 8, name: "Texas" },
  UT: { col: 3, row: 5, name: "Utah" },
  VT: { col: 11, row: 2, name: "Vermont" },
  VA: { col: 9, row: 5, name: "Virginia" },
  WA: { col: 2, row: 3, name: "Washington" },
  WV: { col: 8, row: 5, name: "West Virginia" },
  WI: { col: 7, row: 2, name: "Wisconsin" },
  WY: { col: 4, row: 4, name: "Wyoming" },
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.entries(US_STATE_TILES).reduce(
  (acc, [code, tile]) => {
    acc[tile.name.toLowerCase()] = code;
    return acc;
  },
  {} as Record<string, string>,
);

/** Normalize a free-text billing state string to a 2-letter tile code, or null. */
export function normalizeStateToTileCode(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const upper = value.toUpperCase();
  if (US_STATE_TILES[upper]) return upper;
  const byName = STATE_NAME_TO_CODE[value.toLowerCase()];
  return byName ?? null;
}

/** Ordered list of US state codes for selectors. */
export const US_STATE_CODES = Object.keys(US_STATE_TILES).sort();

export function stateName(code: string): string {
  return US_STATE_TILES[code]?.name ?? code;
}

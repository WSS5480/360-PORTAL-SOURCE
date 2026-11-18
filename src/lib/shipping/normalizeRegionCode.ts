const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
  "washington dc": "DC",
  "washington d.c.": "DC",
};

const CA_PROVINCE_NAMES: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  newfoundland: "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

const US_TERRITORY_NAMES: Record<string, string> = {
  "puerto rico": "PR",
  guam: "GU",
  "american samoa": "AS",
  "u.s. virgin islands": "VI",
  "us virgin islands": "VI",
  "virgin islands": "VI",
  "northern mariana islands": "MP",
};

const INVALID_STATE_VALUES = new Set([
  "usa",
  "us",
  "u.s.",
  "u.s.a.",
  "united states",
  "united states of america",
  "america",
]);

function cleanRegionToken(raw: string): string {
  return raw
    .trim()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function lookupNamedRegion(lower: string): string | null {
  const withoutStateSuffix = lower.replace(/\s+state$/, "").trim();
  return (
    US_STATE_NAMES[lower] ||
    US_STATE_NAMES[withoutStateSuffix] ||
    CA_PROVINCE_NAMES[lower] ||
    US_TERRITORY_NAMES[lower] ||
    null
  );
}

/** Normalize free-text state/province to a carrier-friendly code (usually 2 letters). */
export function normalizeRegionCode(raw: string | null | undefined, countryCode?: string | null): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";

  const lower = cleanRegionToken(trimmed);
  if (INVALID_STATE_VALUES.has(lower)) return "";

  if (trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const named = lookupNamedRegion(lower);
  if (named) return named;

  // "Austin, TX" or "TX 78701"
  const embedded = trimmed.match(/\b([A-Za-z]{2})\b/g);
  if (embedded?.length) {
    const last = embedded[embedded.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(last) && !INVALID_STATE_VALUES.has(last.toLowerCase())) {
      return last;
    }
  }

  const country = String(countryCode ?? "")
    .trim()
    .toUpperCase();
  if (country === "US" || country === "CA") {
    return trimmed.slice(0, 2).toUpperCase();
  }

  return trimmed.toUpperCase();
}

export function regionCodeLooksValidForFedEx(code: string, countryCode?: string | null): boolean {
  const s = String(code ?? "").trim();
  if (!s) return false;
  const country = String(countryCode ?? "US")
    .trim()
    .toUpperCase();
  if (country === "US" || country === "CA" || !country) {
    return /^[A-Z]{2}$/.test(s.toUpperCase());
  }
  return s.length <= 3;
}

export function describeRegionCodeIssue(raw: string | null | undefined, normalized: string): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "State/province is required.";
  const lower = cleanRegionToken(trimmed);
  if (INVALID_STATE_VALUES.has(lower)) {
    return `State is "${trimmed}" — that looks like a country, not a state. Use a 2-letter code (e.g. NY, TX).`;
  }
  if (normalized.length > 2) {
    return `State/province "${trimmed}" must be a 2-letter code for FedEx (e.g. NY, TX, ON).`;
  }
  if (!/^[A-Za-z]{2}$/.test(normalized)) {
    return `State/province "${trimmed}" is not a valid 2-letter code.`;
  }
  return null;
}

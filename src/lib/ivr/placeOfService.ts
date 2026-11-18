export const POS_OPTIONS = [
  { code: "11", label: "11 — Office" },
  { code: "12", label: "12 — Home" },
  { code: "22", label: "22 — Outpatient Hospital" },
  { code: "24", label: "24 — Ambulatory Surgical Center" },
  { code: "31", label: "31 — Skilled Nursing Facility" },
  { code: "32", label: "32 — Nursing Facility" },
  { code: "OTHER", label: "Other" },
] as const;

export type PosCode = (typeof POS_OPTIONS)[number]["code"];

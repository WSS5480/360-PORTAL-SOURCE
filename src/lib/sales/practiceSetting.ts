export const PRACTICE_SETTINGS = ["hospital", "private_practice", "mobile", "other"] as const;

export type PracticeSetting = (typeof PRACTICE_SETTINGS)[number];

export const PRACTICE_SETTING_LABEL: Record<PracticeSetting, string> = {
  hospital: "Hospital / health system",
  private_practice: "Private practice / clinic",
  mobile: "Mobile / ASC / outreach",
  other: "Other setting",
};

export function parsePracticeSetting(raw: string | null | undefined): PracticeSetting {
  const s = String(raw || "").trim() as PracticeSetting;
  return (PRACTICE_SETTINGS as readonly string[]).includes(s) ? s : "private_practice";
}

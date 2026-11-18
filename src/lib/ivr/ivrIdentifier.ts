// src/lib/ivr/ivrIdentifier.ts

function lettersOnlyUpper(s: string): string {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function take3OrPadX(s: string): string {
  const t = lettersOnlyUpper(s);
  if (t.length >= 3) return t.slice(0, 3);
  return (t + "XXX").slice(0, 3);
}

function twoDigitYearFromDobISO(dobISO: string): string | null {
  // Expected "YYYY-MM-DD" or "YYYY/MM/DD" etc; we only need the first 4.
  const yearStr = String(dobISO || "").trim().slice(0, 4);
  const yearNum = Number(yearStr);
  if (!Number.isFinite(yearNum) || yearStr.length !== 4) return null;
  const yy = yearNum % 100;
  return String(yy).padStart(2, "0");
}

/**
 * Returns e.g. "JOHSMI87" or null if missing/invalid.
 * - Pads short names with "X" so length is stable.
 * - Strips non-letters and uppercases.
 */
export function buildIvrIdentifier(args: {
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_dob: string | null; // ISO-ish string like "1987-04-02"
}): string | null {
  const fn = String(args.patient_first_name || "").trim();
  const ln = String(args.patient_last_name || "").trim();
  const dob = String(args.patient_dob || "").trim();

  if (!fn || !ln || !dob) return null;

  const yy = twoDigitYearFromDobISO(dob);
  if (!yy) return null;

  const a = take3OrPadX(fn);
  const b = take3OrPadX(ln);

  return `${a}${b}${yy}`;
}

/**
 * Human-readable lot/serial line for inventory tables (Lookup, Workbench, etc.).
 * Rows often store lot_number = "UNKNOWN" when a label was scanned but GS1 lot AI wasn't parsed.
 */
export function displayLotIdentifier(r: {
  serial_number?: string | null;
  lot_number?: string | null;
  raw_scan?: string | null;
}): string {
  const sn = String(r.serial_number ?? "").trim();
  if (sn) return sn;
  const lot = String(r.lot_number ?? "").trim();
  if (lot && !/^UNKNOWN$/i.test(lot)) return lot;
  const raw = String(r.raw_scan ?? "").trim();
  if (raw) {
    return raw.length > 56 ? `${raw.slice(0, 53)}…` : raw;
  }
  return "—";
}

/** Lot text when serial is shown in a separate column (e.g. recent scan list). */
export function displayLotNumberOnly(lotNumber: string | null | undefined, rawScan: string | null | undefined): string {
  const lot = String(lotNumber ?? "").trim();
  if (lot && !/^UNKNOWN$/i.test(lot)) return lot;
  const raw = String(rawScan ?? "").trim();
  if (raw) {
    return raw.length > 48 ? `${raw.slice(0, 45)}…` : raw;
  }
  return "—";
}

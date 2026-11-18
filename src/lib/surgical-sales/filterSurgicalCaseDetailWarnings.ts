/** Strip product-support reminders that do not apply to observation cases. */
export function filterSurgicalCaseDetailWarnings(warnings: string[], isObservationCase: boolean): string[] {
  if (!isObservationCase) return warnings;
  return warnings.filter((warning) => {
    const lower = warning.toLowerCase();
    if (lower.includes("expected revenue")) return false;
    if (lower.includes("purchase order")) return false;
    if (lower.includes("invoice")) return false;
    if (lower.includes("billing")) return false;
    if (lower.includes("quantity")) return false;
    if (lower.includes("tray")) return false;
    if (lower.includes("implant")) return false;
    if (lower.includes("support coverage")) return false;
    if (lower.includes("product need")) return false;
    return true;
  });
}

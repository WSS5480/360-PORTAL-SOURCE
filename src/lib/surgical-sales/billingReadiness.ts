export type BillingReadinessLevel = "ready" | "partial" | "blocked";

export type SurgicalBillingChecklist = {
  po_uploaded: boolean;
  invoice_uploaded: boolean;
  quantities_confirmed: boolean;
  readiness: BillingReadinessLevel;
  /** 0–3 count of checklist items satisfied */
  score: number;
};

function actualQtyOk(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

/** True when every line has a non-null actual quantity (and there is at least one line). */
export function surgicalLinesQuantitiesConfirmed(lines: { actual_quantity?: unknown }[]): boolean {
  if (!lines.length) return false;
  return lines.every((l) => actualQtyOk(l.actual_quantity));
}

/** Product-free observation cases skip PO, invoice, and quantity billing workflow. */
export function surgicalCaseRequiresBillingWorkflow(params: {
  caseType?: string | null;
  productId?: string | null;
  productLineCount?: number;
}): boolean {
  if (String(params.caseType || "").toLowerCase() !== "observation") return true;
  const hasProducts =
    Boolean(String(params.productId || "").trim()) || Number(params.productLineCount || 0) > 0;
  return hasProducts;
}

export function computeSurgicalBillingChecklist(
  status: string,
  hasPurchaseOrder: boolean,
  hasInvoice: boolean,
  lines: { actual_quantity?: unknown }[],
  requiresBilling = true
): SurgicalBillingChecklist {
  if (!requiresBilling) {
    return {
      po_uploaded: true,
      invoice_uploaded: true,
      quantities_confirmed: true,
      readiness: "ready",
      score: 3,
    };
  }

  const po_uploaded = hasPurchaseOrder;
  const invoice_uploaded = hasInvoice;
  const quantities_confirmed = surgicalLinesQuantitiesConfirmed(lines);
  const score = (po_uploaded ? 1 : 0) + (invoice_uploaded ? 1 : 0) + (quantities_confirmed ? 1 : 0);

  let readiness: BillingReadinessLevel;
  if (score === 3) {
    readiness = "ready";
  } else if (score >= 1) {
    readiness = "partial";
  } else {
    const st = String(status || "").toLowerCase();
    if (st === "scheduled" || st === "confirmed" || st === "cancelled") {
      readiness = "partial";
    } else {
      readiness = "blocked";
    }
  }

  return {
    po_uploaded,
    invoice_uploaded,
    quantities_confirmed,
    readiness,
    score,
  };
}

export function surgicalCaseBillingExemptCopy(): string {
  return "Observation case without products — PO and invoice are not required.";
}

export function billingReadinessLabel(level: BillingReadinessLevel): string {
  switch (level) {
    case "ready":
      return "Billing ready";
    case "partial":
      return "Billing in progress";
    case "blocked":
      return "Billing blocked";
    default:
      return level;
  }
}

export function billingReadinessColors(level: BillingReadinessLevel): { dot: string; border: string; label: string } {
  switch (level) {
    case "ready":
      return { dot: "#16a34a", border: "color-mix(in srgb, #16a34a 35%, var(--border))", label: "#15803d" };
    case "partial":
      return { dot: "#ca8a04", border: "color-mix(in srgb, #ca8a04 35%, var(--border))", label: "#a16207" };
    case "blocked":
      return { dot: "#dc2626", border: "color-mix(in srgb, #dc2626 35%, var(--border))", label: "#b91c1c" };
    default:
      return { dot: "#64748b", border: "var(--border)", label: "var(--muted)" };
  }
}

/** Admin / table (hex-friendly, no CSS vars). */
export function billingReadinessColorsAdmin(level: BillingReadinessLevel): { dot: string; fg: string } {
  switch (level) {
    case "ready":
      return { dot: "#16a34a", fg: "#15803d" };
    case "partial":
      return { dot: "#ca8a04", fg: "#a16207" };
    case "blocked":
      return { dot: "#dc2626", fg: "#b91c1c" };
    default:
      return { dot: "#94a3b8", fg: "#64748b" };
  }
}

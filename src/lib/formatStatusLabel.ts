export function formatStatusLabel(status: string | null | undefined): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "—";
  const u = raw.toUpperCase().replace(/\s+/g, "_");
  if (u === "WIRE_PENDING") return "Wire pending";
  if (u === "PENDING_BANK") return "Bank pending (Stripe)";
  const cleaned = raw.replace(/_/g, " ").replace(/\s+/g, " ").toLowerCase();
  return cleaned
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export type OrderStatusLabelOpts = {
  /** Primary (or other) invoice has a WIRE submission awaiting staff verification */
  wirePendingVerification?: boolean;
};

/** Portal / admin: clearer labels for virtual-warehouse bulk invoice states. */
export function formatOrderStatusLabel(
  status: string | null | undefined,
  opts?: OrderStatusLabelOpts
): string {
  const u = String(status ?? "").trim().toUpperCase();
  if (u === "PENDING_WIRE") return "VW — Wire pending verification";
  if (u === "COMPLETED") {
    // Legacy: close-with-invoice used to write COMPLETED even when unpaid.
    return formatOrderStatusLabel("INVOICED", opts);
  }
  if (u === "INVOICED") {
    if (opts?.wirePendingVerification) return "VW — Invoiced (wire pending verification)";
    return "VW — Invoiced";
  }
  if (u === "PARTIALLY_PAID" && opts?.wirePendingVerification) {
    return "VW — Partially paid (wire pending verification)";
  }
  return formatStatusLabel(status);
}

/** Format role for display (no underscores). Known roles get friendly labels. */
export function formatRoleLabel(role: string | null | undefined): string {
  const r = String(role ?? "").trim().toUpperCase();
  if (!r) return "—";
  const known: Record<string, string> = {
    ORDER_CREATOR: "Customer",
    IVR_SUBMITTER: "IVR Team",
    ACCOUNT_ADMIN: "Account Admin",
    ORDER_VIEWER: "Customer (view only)",
    READ_ONLY: "Customer (read only)",
    ORDER_MANAGER: "Order Manager",
    INTERNAL_ADMIN: "Internal Admin",
    IVR_STAFF: "IVR Team",
    INTERNAL_SALES_REP: "Internal sales rep",
  };
  return known[r] ?? formatStatusLabel(role);
}

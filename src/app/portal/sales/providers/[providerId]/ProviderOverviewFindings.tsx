"use client";

/** Compact operational finding row — label + value, no prose blocks. */
export function ProviderOverviewFindingRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "validated" | "open" | "warn" | "blocked";
}) {
  return (
    <div className={`provider-ops-finding provider-ops-finding--${tone}`}>
      <span className="provider-ops-finding-label">{label}</span>
      <span className="provider-ops-finding-value">{value}</span>
    </div>
  );
}

export function ProviderOverviewFindingsTable({
  rows,
  className,
}: {
  rows: { label: string; value: string; tone?: "neutral" | "validated" | "open" | "warn" | "blocked" }[];
  className?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className={["provider-ops-findings-table", className].filter(Boolean).join(" ")}>
      {rows.map((row) => (
        <ProviderOverviewFindingRow key={`${row.label}-${row.value}`} {...row} />
      ))}
    </div>
  );
}

"use client";

export type CommandMetricTone = "open" | "learning" | "progress" | "ready" | "action";

export function ProviderCommandMetricCard({
  label,
  value,
  detailLine,
  tone = "action",
}: {
  label: string;
  value: string;
  detailLine?: string | null;
  tone?: CommandMetricTone;
}) {
  return (
    <article className={`pov-cc-command-card pov-cc-command-card--${tone}`}>
      <h3 className="pov-cc-command-card__label">{label}</h3>
      <p className="pov-cc-command-card__value">{value}</p>
      {detailLine ? <p className="pov-cc-command-card__detail">{detailLine}</p> : null}
    </article>
  );
}

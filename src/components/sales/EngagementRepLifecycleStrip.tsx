import {
  ENGAGEMENT_REP_LIFECYCLE_LABELS,
  formatEngagementRepLifecycleLabel,
  type EngagementRepLifecyclePhase,
} from "@/lib/surgical-sales/engagements/engagementRepLifecycle";

export const engagementRepLifecycleStripCss = `
.erl-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: color-mix(in srgb, var(--erl-strip-accent, #38bdf8) 10%, rgba(21, 29, 46, 0.95));
  font-size: 13px;
  line-height: 1.35;
}
.erl-strip--light {
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--foreground);
}
.erl-strip__state {
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--erl-strip-accent, #38bdf8);
}
.erl-strip--light .erl-strip__state {
  color: var(--brand-700);
}
.erl-strip__sep {
  opacity: 0.45;
  font-weight: 700;
}
.erl-strip__next-label {
  font-weight: 700;
  color: color-mix(in srgb, currentColor 72%, transparent);
}
.erl-strip__next {
  font-weight: 800;
}
.erl-strip[data-phase="active"] { --erl-strip-accent: #38bdf8; }
.erl-strip[data-phase="planned"] { --erl-strip-accent: #94a3b8; }
.erl-strip[data-phase="debrief_needed"] { --erl-strip-accent: #fbbf24; }
.erl-strip[data-phase="completed"] { --erl-strip-accent: #34d399; }
`;

type EngagementRepLifecycleStripProps = {
  phase: EngagementRepLifecyclePhase;
  nextActionLabel?: string | null;
  variant?: "dark" | "light";
  className?: string;
};

export function EngagementRepLifecycleStrip({
  phase,
  nextActionLabel,
  variant = "dark",
  className = "",
}: EngagementRepLifecycleStripProps) {
  const stateLabel = formatEngagementRepLifecycleLabel(phase);
  const classNames = [
    "erl-strip",
    variant === "light" ? "erl-strip--light" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} data-phase={phase} role="status" aria-label={`${stateLabel}${nextActionLabel ? ` — next: ${nextActionLabel}` : ""}`}>
      <span className="erl-strip__state">{ENGAGEMENT_REP_LIFECYCLE_LABELS[phase]}</span>
      {nextActionLabel ? (
        <>
          <span className="erl-strip__sep" aria-hidden>
            →
          </span>
          <span>
            <span className="erl-strip__next-label">Next: </span>
            <span className="erl-strip__next">{nextActionLabel}</span>
          </span>
        </>
      ) : null}
    </div>
  );
}

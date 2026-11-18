"use client";

export const LEADERBOARD_DEMO_MODE_NOTE = "Demo data only — no production records are changed.";

export function LeaderboardDemoModeHeaderHint() {
  return (
    <span className="lb-demo-header" role="status" aria-live="polite">
      <span className="lb-demo-mode-badge">DEMO DATA</span>
      <span className="lb-demo-header-note">{LEADERBOARD_DEMO_MODE_NOTE}</span>
    </span>
  );
}

export function LeaderboardDemoModeToggle({
  enabled,
  onChange,
  compact = false,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label className={`lb-demo-mode-toggle${compact ? " lb-demo-mode-toggle--compact" : ""}`}>
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="lb-demo-mode-toggle-ui" aria-hidden />
      <span className="lb-demo-mode-toggle-label">{compact ? "Demo" : "Demo Mode"}</span>
    </label>
  );
}

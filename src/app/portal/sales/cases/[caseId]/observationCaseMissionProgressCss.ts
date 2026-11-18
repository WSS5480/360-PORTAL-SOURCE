export const observationCaseMissionProgressCss = `
.case-obs-mission-progress {
  display: grid;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, #0f172a 12%, var(--border));
  background:
    radial-gradient(
      circle at 0% 0%,
      color-mix(in srgb, var(--brand-600) 8%, transparent) 0%,
      transparent 55%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, #0f172a 3%, var(--surface, #fff)) 0%,
      var(--surface, #fff) 100%
    );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #ffffff 80%, transparent),
    0 12px 32px color-mix(in srgb, #0f172a 6%, transparent);
}

.case-obs-mission-progress--compact {
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
}

.case-obs-mission-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.case-obs-mission-progress-head-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.case-obs-mission-progress-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-600) 78%, var(--muted));
}

.case-obs-mission-progress-title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.case-obs-mission-progress--compact .case-obs-mission-progress-title {
  font-size: 15px;
}

.case-obs-mission-progress-ring {
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
}

.case-obs-mission-progress--compact .case-obs-mission-progress-ring {
  width: 56px;
  height: 56px;
}

.case-obs-mission-progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.case-obs-mission-progress-ring-track {
  fill: none;
  stroke: color-mix(in srgb, var(--foreground) 8%, var(--border));
  stroke-width: 6;
}

.case-obs-mission-progress-ring-fill {
  fill: none;
  stroke: var(--brand-600);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.35s ease;
}

.case-obs-mission-progress-ring-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.1;
  color: var(--foreground);
}

.case-obs-mission-progress--compact .case-obs-mission-progress-ring-label {
  font-size: 11px;
}

.case-obs-mission-progress-ring-suffix {
  display: block;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-mission-progress-bar {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--border));
  overflow: hidden;
}

.case-obs-mission-progress-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--brand-600) 0%,
    color-mix(in srgb, #16a34a 70%, var(--brand-600)) 100%
  );
  transition: width 0.35s ease;
}

.case-obs-mission-progress-tracks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-obs-mission-progress-track {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, var(--surface, #fff));
}

.case-obs-mission-progress-track--confirmed {
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
  background: color-mix(in srgb, #16a34a 4%, var(--surface, #fff));
}

.case-obs-mission-progress-track--partial {
  border-color: color-mix(in srgb, #d97706 24%, var(--border));
  background: color-mix(in srgb, #d97706 4%, var(--surface, #fff));
}

.case-obs-mission-progress-track--missing {
  border-style: dashed;
  opacity: 0.82;
}

.case-obs-mission-progress-track-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.case-obs-mission-progress-track-icon {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
}

.case-obs-mission-progress-track--confirmed .case-obs-mission-progress-track-icon {
  color: #166534;
  background: #bbf7d0;
}

.case-obs-mission-progress-track--partial .case-obs-mission-progress-track-icon {
  color: #92400e;
  background: #fde68a;
}

.case-obs-mission-progress-track--missing .case-obs-mission-progress-track-icon {
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
  background: color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.case-obs-mission-progress-track-label {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
}

.case-obs-mission-progress--compact .case-obs-mission-progress-track-label {
  font-size: 13px;
}

.case-obs-mission-progress-track-meta {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}

.case-obs-mission-progress-track--confirmed .case-obs-mission-progress-track-meta {
  color: #15803d;
}

.case-obs-mission-progress--compact .case-obs-mission-progress-track {
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 10px;
}

.case-obs-mission-progress--compact .case-obs-mission-progress-tracks {
  gap: 6px;
}
`;

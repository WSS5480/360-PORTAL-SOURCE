/** Stage and status badges for mission-control surfaces. */
export const missionControlBadgesCss = `
.mc-badge,
.mc-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  white-space: nowrap;
}

.mc-badge--stage,
.mc-status-pill--stage {
  color: #fff;
  background: color-mix(in srgb, var(--mc-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--mc-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, var(--mc-accent) 30%, transparent);
}

.mc-status-pill--ready,
.mc-badge--ready {
  color: #ecfdf5;
  background: color-mix(in srgb, #16a34a 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #16a34a 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, #16a34a 30%, transparent);
}

.mc-status-pill--pending,
.mc-badge--pending {
  color: #fef3c7;
  background: color-mix(in srgb, #d97706 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #d97706 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, #d97706 28%, transparent);
}

.mc-status-pill--active,
.mc-badge--active {
  color: #e0f2fe;
  background: color-mix(in srgb, #0284c7 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #0284c7 55%, rgba(255, 255, 255, 0.2));
}

.mc-badge--neutral {
  color: var(--mc-hero-subtle);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.mc-badge--surface {
  color: var(--mc-ink-soft);
  background: color-mix(in srgb, var(--foreground, #0f172a) 4%, #fff);
  border: 1px solid var(--mc-border);
  box-shadow: none;
}

.mc-badge-label {
  display: block;
  margin-bottom: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mc-hero-muted);
}
`;

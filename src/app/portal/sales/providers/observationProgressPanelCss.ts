/** Shared observation progress panel — overview command header + mission board cards. */
export const observationProgressPanelCss = `
.observation-progress-panel {
  display: grid;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.observation-progress-panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.observation-progress-panel__title {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.observation-progress-panel__summary {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
  white-space: nowrap;
}

.observation-progress-panel__next-step {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.observation-progress-panel__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 34px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.observation-progress-panel__stats {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
}

.observation-progress-panel__stat {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.observation-progress-panel__stat--wide {
  grid-column: 1 / -1;
}

.observation-progress-panel__stat dt {
  margin: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.observation-progress-panel__stat dd {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.observation-progress-panel__stat-value--muted {
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  font-style: italic;
  font-weight: 600;
}

.observation-progress-panel--compact {
  padding: 6px 8px;
  gap: 6px;
}

.observation-progress-panel--compact .observation-progress-panel__stat dd {
  font-size: 10px;
}

.pov-command-header__observation-progress {
  margin: 8px 0 0;
  max-width: 36rem;
}

.pov-command-header__observation-progress .observation-progress-panel {
  border-color: color-mix(in srgb, #fff 12%, transparent);
  background: color-mix(in srgb, #fff 6%, transparent);
}

.pov-command-header__observation-progress .observation-progress-panel__title {
  color: color-mix(in srgb, #fff 55%, #94a3b8);
}

.pov-command-header__observation-progress .observation-progress-panel__summary {
  color: #e2e8f0;
}

.pov-command-header__observation-progress .observation-progress-panel__stat dt {
  color: color-mix(in srgb, #fff 50%, #94a3b8);
}

.pov-command-header__observation-progress .observation-progress-panel__stat dd {
  color: #f1f5f9;
}

.pov-command-header__observation-progress .observation-progress-panel__stat-value--muted {
  color: color-mix(in srgb, #fff 55%, #64748b);
}
`;

/** Shared evaluation path panel — overview command header + mission board cards. */
export const evaluationPathPanelCss = `
.evaluation-path-panel {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.evaluation-path-panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.evaluation-path-panel__title {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.evaluation-path-panel__value {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--foreground);
  text-align: right;
}

.evaluation-path-panel--compact {
  padding: 6px 8px;
}

.evaluation-path-panel--compact .evaluation-path-panel__value {
  font-size: 10px;
}

.pov-command-header__evaluation-path {
  margin: 8px 0 0;
  max-width: 36rem;
}

.pov-command-header__evaluation-path-kicker {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, #fff 55%, #94a3b8);
}

.pov-command-header__evaluation-path .evaluation-path-panel {
  border-color: color-mix(in srgb, #fff 12%, transparent);
  background: color-mix(in srgb, #fff 6%, transparent);
}

.pov-command-header__evaluation-path .evaluation-path-panel__title {
  color: color-mix(in srgb, #fff 55%, #94a3b8);
}

.pov-command-header__evaluation-path .evaluation-path-panel__value {
  color: #f1f5f9;
}
`;

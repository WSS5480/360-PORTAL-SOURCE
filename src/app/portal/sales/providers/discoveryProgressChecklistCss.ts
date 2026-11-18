/** Shared discovery progress checklist — overview command header + mission board cards. */
export const discoveryProgressChecklistCss = `
.discovery-progress-checklist {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.discovery-progress-checklist__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.discovery-progress-checklist__title {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.discovery-progress-checklist__summary {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--foreground);
  white-space: nowrap;
}

.discovery-progress-checklist__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 3px;
}

.discovery-progress-checklist__item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.discovery-progress-checklist__item--met {
  color: var(--foreground);
}

.discovery-progress-checklist__mark {
  flex-shrink: 0;
  width: 12px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  color: color-mix(in srgb, var(--foreground) 40%, var(--muted));
}

.discovery-progress-checklist__item--met .discovery-progress-checklist__mark {
  color: #166534;
}

.discovery-progress-checklist--compact {
  padding: 6px 8px;
  gap: 4px;
}

.discovery-progress-checklist--compact .discovery-progress-checklist__item {
  font-size: 10px;
}

.pov-command-header__discovery-progress {
  margin: 8px 0 0;
  max-width: 36rem;
}

.pov-command-header__discovery-progress .discovery-progress-checklist {
  border-color: color-mix(in srgb, #fff 12%, transparent);
  background: color-mix(in srgb, #fff 6%, transparent);
}

.pov-command-header__discovery-progress .discovery-progress-checklist__title {
  color: color-mix(in srgb, #fff 55%, #94a3b8);
}

.pov-command-header__discovery-progress .discovery-progress-checklist__summary {
  color: #e2e8f0;
}

.pov-command-header__discovery-progress .discovery-progress-checklist__item {
  color: color-mix(in srgb, #fff 62%, #94a3b8);
}

.pov-command-header__discovery-progress .discovery-progress-checklist__item--met {
  color: #f1f5f9;
}

.pov-command-header__discovery-progress .discovery-progress-checklist__mark {
  color: color-mix(in srgb, #fff 45%, #64748b);
}

.discovery-progress-checklist--approved .discovery-progress-checklist__summary {
  color: #166534;
}

.discovery-progress-checklist--pending .discovery-progress-checklist__summary {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.pov-command-header__discovery-progress .discovery-progress-checklist--approved .discovery-progress-checklist__summary {
  color: #86efac;
}

.pov-command-header__discovery-progress .discovery-progress-checklist--pending .discovery-progress-checklist__summary {
  color: #fbbf24;
}
`;

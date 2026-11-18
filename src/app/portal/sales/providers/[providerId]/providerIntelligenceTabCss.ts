/** Provider Intelligence tab — field execution briefing layout. */
export const providerIntelligenceTabCss = `
.pit {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  max-width: 100%;
}

.pit-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pit-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.pit-lead {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  max-width: 42rem;
}

.pit-sec {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.pit-sec--primary {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.pit-sec--action {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-600) 6%, var(--surface)) 0%,
    var(--surface) 100%
  );
}

.pit-sec--timeline {
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.pit-sec-title {
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.pit-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  font-style: italic;
}

.pit-scan {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--foreground);
}

.pit-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pit-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 88px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--background);
}

.pit-status__label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.pit-status__value {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--foreground);
}

.pit-status--positive {
  border-color: color-mix(in srgb, #16a34a 35%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, var(--background));
}

.pit-status--positive .pit-status__value {
  color: color-mix(in srgb, #15803d 85%, var(--foreground));
}

.pit-status--negative {
  border-color: color-mix(in srgb, #dc2626 30%, var(--border));
  background: color-mix(in srgb, #dc2626 6%, var(--background));
}

.pit-status--negative .pit-status__value {
  color: color-mix(in srgb, #b91c1c 85%, var(--foreground));
}

.pit-status--caution {
  border-color: color-mix(in srgb, #d97706 35%, var(--border));
  background: color-mix(in srgb, #d97706 8%, var(--background));
}

.pit-status--caution .pit-status__value {
  color: color-mix(in srgb, #b45309 85%, var(--foreground));
}

.pit-still-needed {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.pit-still-needed__label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.pit-lanes {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px 16px;
}

@media (max-width: 640px) {
  .pit-lanes {
    grid-template-columns: 1fr;
  }
}

.pit-sub-title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
}

.pit-bullets {
  margin: 0;
  padding: 0 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pit-bullets li {
  font-size: 12px;
  line-height: 1.4;
  color: var(--foreground);
}

.pit-action-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pit-action-row {
  display: grid;
  grid-template-columns: minmax(0, 120px) minmax(0, 1fr);
  gap: 8px 12px;
  align-items: baseline;
}

@media (max-width: 480px) {
  .pit-action-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

.pit-action-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.pit-action-value {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.pit-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pit-timeline__item {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
}

.pit-timeline__title {
  margin: 0 0 3px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--foreground);
}

.pit-timeline__detail {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--foreground);
  white-space: pre-wrap;
  word-break: break-word;
}

.pit-timeline__meta {
  margin: 0;
  font-size: 10px;
  line-height: 1.3;
  color: var(--muted);
}

.pit-timeline-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.pit-timeline-link:hover .pit-timeline__title {
  color: var(--brand-600);
}
`;

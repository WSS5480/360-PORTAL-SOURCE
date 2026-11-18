export const caseObservationOverviewCss = `
.case-obs-overview-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  background: #fff;
}

.case-obs-brief-section {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  min-width: 0;
}

.case-obs-brief-section-head {
  display: grid;
  gap: 2px;
}

.case-obs-brief-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-brief-section-hint {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
}

.case-obs-brief-mission {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.case-obs-brief-list {
  margin: 0;
  padding: 0 0 0 16px;
  display: grid;
  gap: 6px;
}

.case-obs-brief-list li {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--foreground);
}

.case-obs-brief-list--questions li {
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 88%, var(--brand-700));
}

.case-obs-brief-empty {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 50%, var(--muted));
}

.case-obs-brief-activity {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.case-obs-brief-activity-item {
  display: grid;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}

.case-obs-brief-activity-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.case-obs-brief-activity-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.case-obs-brief-activity-time {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  white-space: nowrap;
}

.case-obs-brief-activity-preview {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case-obs-brief-activity-actor {
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}

.case-obs-brief-link {
  justify-self: start;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}
`;

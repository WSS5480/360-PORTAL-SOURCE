export const caseEngagementStrategySnapshotCss = `
.case-engagement-strategy-card {
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  border-radius: 8px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
  display: grid;
  gap: 8px;
}

.case-engagement-strategy-card--cta {
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.case-engagement-strategy-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.case-engagement-strategy-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.case-engagement-strategy-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}

.case-engagement-strategy-open {
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.case-engagement-strategy-grid {
  display: grid;
  gap: 10px;
}

.case-engagement-strategy-row {
  display: grid;
  gap: 3px;
}

.case-engagement-strategy-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.case-engagement-strategy-value {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  color: var(--foreground);
}

.case-engagement-strategy-foot {
  margin: 0;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.4;
  font-weight: 600;
}
`;

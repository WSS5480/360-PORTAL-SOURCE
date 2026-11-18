export const observationCaseAccessHistoryCss = `
.case-obs-access-history {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--foreground) 1%, var(--surface, #fff));
  overflow: hidden;
}
.case-obs-access-history-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  touch-action: manipulation;
}
.case-obs-access-history-summary::-webkit-details-marker {
  display: none;
}
.case-obs-access-history-summary-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.case-obs-access-history-summary-note {
  font-size: 10px;
  font-weight: 700;
  color: var(--cod-muted, var(--muted));
  white-space: nowrap;
}
.case-obs-access-history-body {
  display: grid;
  gap: 12px;
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-obs-access-history-lead {
  margin: 10px 0 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--cod-muted, var(--muted));
}
.case-obs-access-history-block {
  display: grid;
  gap: 6px;
}
.case-obs-access-history-block-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cod-muted, var(--muted));
}
.case-obs-access-history-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.case-obs-access-history-line {
  display: grid;
  gap: 2px;
}
.case-obs-access-history-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--cod-muted, var(--muted));
}
.case-obs-access-history-value {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
}
.case-obs-access-history-empty {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--cod-muted, var(--muted));
}
.case-obs-access-history-link,
.case-obs-access-history-plan-link {
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}
.case-obs-access-history-link:hover,
.case-obs-access-history-plan-link:hover {
  text-decoration: underline;
}
.case-obs-access-history-plan-link {
  justify-self: start;
}
`;

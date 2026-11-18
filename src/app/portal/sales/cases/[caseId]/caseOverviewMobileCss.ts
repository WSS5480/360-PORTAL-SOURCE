export const caseOverviewMobileCss = `
.case-mobile-overview-panel {
  display: grid;
  gap: 0;
  min-width: 0;
  background: #fff;
}
.case-mobile-overview-meta {
  display: grid;
  min-width: 0;
}
.case-mobile-overview-row {
  display: grid;
  grid-template-columns: 18px minmax(72px, 30%) minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 7px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  min-width: 0;
}
.case-mobile-overview-row:last-child {
  border-bottom: none;
}
.case-mobile-overview-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 2px;
  color: var(--muted);
}
.case-mobile-overview-label {
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
  line-height: 1.35;
  padding-top: 2px;
  letter-spacing: 0.01em;
}
.case-mobile-overview-value {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
  min-width: 0;
}
.case-mobile-overview-value.case-mobile-overview-value--muted {
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  font-weight: 700;
}
.case-mobile-overview-value a {
  color: var(--foreground);
  text-decoration: none;
  font-weight: 800;
}
.case-mobile-overview-reminder {
  margin: 0;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  color: #a16207;
  background: color-mix(in srgb, #ca8a04 8%, #fff);
  border-top: 1px solid color-mix(in srgb, #ca8a04 22%, var(--border));
  border-bottom: 1px solid color-mix(in srgb, #ca8a04 22%, var(--border));
}
.case-mobile-overview-panel .case-wf-progress {
  margin: 0;
  border: none;
  border-radius: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}
.case-wf-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px 6px;
  border: none;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}
.case-wf-progress-head:active {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}
.case-wf-progress-list li {
  list-style: none;
}
button.case-wf-progress-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: transparent;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
  min-width: 0;
}
button.case-wf-progress-row:last-child {
  border-bottom: none;
}
button.case-wf-progress-row:active {
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
}
.case-wf-progress-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-wf-progress-summary {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
  white-space: nowrap;
}
.case-wf-progress-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.case-wf-progress-row[data-active="true"] {
  background: color-mix(in srgb, var(--brand-600) 7%, #fff);
}
.case-wf-progress-row[data-active="true"] .case-wf-progress-title {
  color: var(--brand-700);
}
.case-wf-progress-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
  background: #fff;
  flex-shrink: 0;
}
.case-wf-progress-dot--active {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 20%, #fff);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 12%, transparent);
}
.case-wf-progress-dot--done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: var(--brand-600);
  color: #fff;
}
.case-wf-progress-main {
  min-width: 0;
  display: grid;
  gap: 1px;
}
.case-wf-progress-title {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}
.case-wf-progress-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
  line-height: 1.3;
}
.case-wf-progress-chevron {
  font-size: 15px;
  line-height: 1;
  color: var(--muted);
  flex-shrink: 0;
}
.case-wf-progress-cta {
  display: block;
  width: 100%;
  padding: 7px 12px !important;
  border: none !important;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border)) !important;
  border-radius: 0 !important;
  background: color-mix(in srgb, var(--foreground) 2%, #fff) !important;
  color: var(--brand-700) !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  text-align: center;
  box-shadow: none !important;
  touch-action: manipulation;
}
@media (min-width: 641px) {
  .case-mobile-overview-panel {
    display: none;
  }
}
`;

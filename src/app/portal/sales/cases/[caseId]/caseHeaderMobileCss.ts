export const caseHeaderMobileCss = `
.case-mobile-header {
  display: grid;
  gap: 0;
  min-width: 0;
}
.case-mobile-header-top {
  display: grid;
  grid-template-columns: auto 32px minmax(0, 1fr) auto;
  gap: 6px;
  align-items: start;
  padding: 5px 12px 3px;
  min-width: 0;
}
.case-mobile-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-top: 1px;
  border-radius: 8px;
  color: var(--brand-700);
  text-decoration: none;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.case-mobile-header-body {
  min-width: 0;
  display: grid;
  gap: 1px;
}
.case-mobile-header-title {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}
.case-mobile-header-org {
  font-size: 11px;
  font-weight: 650;
  line-height: 1.3;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.case-mobile-header-org a {
  color: var(--muted);
  text-decoration: none;
}
.case-mobile-header-surgeon {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.case-mobile-header-icons {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  margin-top: -1px;
}
.case-mobile-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  touch-action: manipulation;
}
.case-mobile-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.case-mobile-icon-btn:active {
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
}
.case-mobile-header-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 0 12px 5px;
  min-width: 0;
}
.case-mobile-header-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--foreground);
  text-decoration: none;
  white-space: nowrap;
}
.case-mobile-header-chip--brand {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 7%, #fff);
  color: var(--brand-700);
}
.case-mobile-overflow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
  cursor: pointer;
  touch-action: manipulation;
  flex-shrink: 0;
}
.case-mobile-overflow-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Compact executive summary header */
.case-mobile-header--executive {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}
.case-mobile-header-top--executive {
  align-items: start;
  padding: 6px 10px 8px;
  gap: 6px;
}
.case-mobile-header-body--executive {
  min-width: 0;
}
.case-exec-summary {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.case-exec-summary-primary {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.case-exec-summary-type {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-700);
  line-height: 1.2;
}
.case-exec-summary-name {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.case-exec-summary-specialty {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.case-exec-summary-location {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.3;
  color: var(--muted);
  min-width: 0;
}
.case-exec-summary-location a {
  color: inherit;
  font-weight: 800;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.case-exec-summary-sep {
  flex-shrink: 0;
}
.case-exec-summary-secondary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.case-exec-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  font-size: 10px;
  font-weight: 750;
  line-height: 1.25;
  color: var(--foreground);
  white-space: nowrap;
}
.case-exec-status-pill-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.case-exec-status-pill-icon {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}
.case-exec-status-pill--ok {
  border-color: color-mix(in srgb, var(--success) 24%, var(--border));
  background: color-mix(in srgb, var(--success) 6%, #fff);
  color: #166534;
}
.case-exec-status-pill--ok .case-exec-status-pill-icon {
  color: #166534;
}
.case-exec-status-pill--warn {
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, #fff);
  color: #92400e;
}
.case-exec-status-pill--warn .case-exec-status-pill-icon {
  color: #b45309;
}
.case-exec-status-pill--blocked {
  border-color: color-mix(in srgb, var(--danger) 24%, var(--border));
  background: color-mix(in srgb, var(--danger) 6%, #fff);
  color: var(--danger);
}
.case-exec-status-pill--neutral {
  color: var(--foreground);
}
.case-exec-summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
}

@media (min-width: 641px) {
  .case-mobile-header {
    display: none;
  }
}
`;

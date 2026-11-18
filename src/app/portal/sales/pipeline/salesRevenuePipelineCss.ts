/** Mobile layout for the sales-rep revenue pipeline page. */
export const salesRevenuePipelineCss = `
.sales-rev-pipe-metrics {
  margin-bottom: 4px;
}

.sales-rev-pipe-hint {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 650;
}

.sales-rev-pipe-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.sales-rev-pipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}

.sales-rev-pipe-row + .sales-rev-pipe-row {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.sales-rev-pipe-row a {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px;
  text-decoration: none;
  color: inherit;
  min-height: 44px;
}

.sales-rev-pipe-row strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.sales-rev-pipe-row small {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 650;
}

.sales-rev-pipe-row em {
  flex: 0 0 auto;
  text-align: right;
  font-style: normal;
}

.sales-rev-pipe-row em b {
  display: block;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.sales-rev-pipe-row em small {
  margin-top: 2px;
}

.sales-rev-pipe-empty {
  display: grid;
  gap: 6px;
  color: var(--muted);
}

.sales-rev-pipe-empty strong {
  color: var(--foreground);
  font-size: 14px;
}

.sales-rev-pipe-empty p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}

.sales-rev-pipe-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.sales-rev-pipe-scope {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 12px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
}

.sales-rev-pipe-scope--active {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  color: var(--brand-700);
}

.sales-rev-pipe-view-toggle {
  margin: 0;
  margin-bottom: 0;
}

.sales-rev-pipe-view-toggle .sales-rev-pipe-scope {
  min-height: 40px;
}

@media (max-width: 560px) {
  .sales-rev-pipe-view-toggle {
    width: 100%;
  }

  .sales-rev-pipe-view-toggle .sales-rev-pipe-scope {
    flex: 1 1 0;
  }
}

@media (max-width: 900px) {
  .sales-rev-pipe-grid {
    grid-template-columns: 1fr;
  }

  .sales-rev-pipe-page .sales-rev-pipe-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 400px) {
  .sales-rev-pipe-page .sales-rev-pipe-metrics {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 1024px) {
  body:has(.sales-rev-pipe-page) .portal-contentWrap:not(:has(.provider-workspace-page)):not(:has(.case-workspace-page)) {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
`;

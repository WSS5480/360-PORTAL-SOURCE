/** Mobile-only layout for Sales Command analytics page (desktop grid unchanged). */
export const salesAnalyticsMobileCss = `
@media (max-width: 640px) {
  .sales-analytics-page .sales-analytics-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
  }

  .sales-analytics-page .sales-analytics-metrics > * {
    min-width: 0;
  }

  .sales-analytics-page .sales-analytics-usage-row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 4px !important;
  }

  .sales-analytics-page .sales-analytics-usage-row span {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

@media (max-width: 400px) {
  .sales-analytics-page .sales-analytics-metrics {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 1024px) {
  body:has(.sales-analytics-page) .portal-contentWrap:not(:has(.provider-workspace-page)):not(:has(.case-workspace-page)) {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
`;
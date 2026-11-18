/** Mobile-only layout for Observations / Debriefs / Engagements list (desktop table unchanged). */
export const engagementsListMobileCss = `
@media (max-width: 768px) {
  .sc-native-page .engagements-portal-desktop-only,
  .engagements-portal-root .engagements-portal-desktop-only {
    display: none !important;
  }

  .engagements-portal-root .engagements-portal-table-wrap {
    overflow-x: hidden !important;
    margin: 0;
    border: none;
    border-radius: 0;
    min-width: 0;
  }

  .engagements-portal-root .engagements-portal-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 0 !important;
  }

  .engagements-portal-root .engagements-portal-table thead {
    display: none;
  }

  .engagements-portal-root .engagements-portal-table,
  .engagements-portal-root .engagements-portal-table tbody {
    display: block;
    width: 100%;
  }

  .engagements-portal-root .engagements-portal-table tbody tr {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    margin: 0 0 8px;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    border-radius: 14px;
    background: #fff;
    min-width: 0;
  }

  .engagements-portal-root .engagements-portal-table tbody tr:hover {
    background: color-mix(in srgb, var(--brand-600) 3%, #fff);
  }

  .engagements-portal-root .engagements-portal-table tbody td {
    display: block;
    padding: 0 !important;
    border: none !important;
    font-size: 13px;
    line-height: 1.35;
    word-break: break-word;
    overflow-wrap: anywhere;
    min-width: 0;
  }

  .engagements-portal-root .engagements-portal-table tbody td::before {
    content: attr(data-label);
    display: block;
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }

  .engagements-portal-root .engagements-portal-table tbody td:first-child::before {
    display: none;
  }

  .engagements-portal-root .engagements-portal-table tbody td:first-child {
    font-weight: 750;
    font-size: 14px;
  }

  .engagements-portal-root .engagements-portal-empty,
  .engagements-portal-root .engagements-portal-loading {
    padding: 12px 0;
    font-size: 13px;
    line-height: 1.45;
  }
}

@media (min-width: 769px) {
  .engagements-portal-root .engagements-portal-mobile-only {
    display: none !important;
  }
}

@media (max-width: 1024px) {
  body:has(.engagements-portal-root) .portal-contentWrap:not(:has(.provider-workspace-page)):not(:has(.case-workspace-page)) {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
`;
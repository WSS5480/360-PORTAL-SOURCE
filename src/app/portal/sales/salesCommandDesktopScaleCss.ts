/** Scale native Sales Command UI to full desktop width (1180px canvas). */
export const salesCommandDesktopScaleCss = `
@media (min-width: 721px) {
  .portal-contentWrap:has(.sc-native-page),
  .portal-contentWrap:has(.surgical-cases-crm-page),
  .portal-contentWrap:has(.case-workspace-page) {
    padding: 20px clamp(16px, 2.5vw, 32px) 28px !important;
  }

  .sc-native-page,
  .surgical-cases-mobile-root,
  .case-workspace-page,
  .org-cmd-page.sc-native-page {
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 20px color-mix(in srgb, var(--foreground) 5%, transparent);
    min-height: 0;
  }

  .sc-mobile-list-header-top {
    padding: 14px 20px 10px;
    min-height: 52px;
  }

  .sc-mobile-list-title {
    font-size: 22px;
  }

  .sc-mobile-list-count {
    font-size: 13px;
    margin-top: 4px;
  }

  .sc-mobile-list-search-row {
    padding: 8px 20px 12px;
    grid-template-columns: minmax(0, 1fr) 40px 40px;
    gap: 8px;
  }

  .sc-mobile-list-segments-track {
    padding: 0 20px 10px;
  }

  .sc-mobile-list-icon-btn,
  .sc-native-page .sc-mobile-list-tool-btn {
    width: 40px !important;
    min-width: 40px !important;
    height: 40px !important;
  }

  .sc-native-page button.sc-mobile-list-segment,
  .sc-native-page .sc-mobile-list-segment {
    min-height: 30px !important;
    height: 30px !important;
    padding: 0 12px !important;
    font-size: 12px !important;
  }

  .sc-mobile-case-row,
  .sc-native-page .sales-cmd-table tbody tr {
    padding: 12px 20px;
  }

  .sc-mobile-list-fab {
    right: max(24px, calc(50% - 590px + 24px));
    bottom: 28px;
  }

  .sc-native-page .sales-cmd-panel-native > div:first-child {
    padding: 10px 20px 8px !important;
  }

  .sc-native-page .sales-cmd-panel-native > div:last-child {
    padding: 0 20px 14px !important;
  }

  .sc-native-page .sc-native-board-track {
    padding: 12px 20px 18px;
  }

  .sc-native-page .sc-native-board-col {
    flex: 0 0 min(300px, 28%);
    max-height: min(72vh, 720px);
  }

  .sc-native-page .sc-native-metric-scroll {
    padding: 10px 20px 12px;
    flex-wrap: wrap;
    overflow: visible;
  }

  .sc-native-page .sc-native-metric-scroll > * {
    flex: 1 1 140px;
    min-width: 140px;
  }

  @media (min-width: 960px) {
    .sc-native-page .org-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1100px) {
    .sc-native-page .org-card-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}
`;

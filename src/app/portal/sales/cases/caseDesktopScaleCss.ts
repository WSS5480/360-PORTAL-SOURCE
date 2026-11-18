/** Scale native case UI to full desktop width (same layout, larger canvas). */
export const caseDesktopScaleCss = `
@media (min-width: 721px) {
  .portal-contentWrap:has(.case-workspace-page),
  .surgical-cases-crm-page .crm-sales-page-bg {
    padding: 20px clamp(16px, 2.5vw, 32px) 28px !important;
    gap: 16px !important;
  }

  .case-workspace-page {
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 20px color-mix(in srgb, var(--foreground) 5%, transparent);
    background: #fff;
  }

  .case-detail-page-pad {
    padding-bottom: 88px;
  }

  .case-workspace-tabbar .case-workspace-tab {
    min-height: 42px !important;
    padding: 10px 16px 8px !important;
    font-size: 13px !important;
  }

  .case-workspace-banner {
    padding: 10px 20px !important;
    font-size: 13px !important;
  }

  .case-bottom-action-shell--mobile {
    padding: 12px clamp(16px, 2.5vw, 32px) 16px !important;
    left: 0;
    right: 0;
  }

  .case-mobile-bottom-bar {
    max-width: 1180px;
    margin: 0 auto;
    min-height: 64px !important;
    padding: 8px 12px 10px !important;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    box-shadow: 0 4px 24px color-mix(in srgb, var(--foreground) 8%, transparent);
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    backdrop-filter: blur(12px);
  }

  .case-mobile-bottom-bar .case-mobile-tab-action {
    min-height: 48px !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action-icon {
    width: 36px !important;
    height: 36px !important;
  }

  .case-mobile-bottom-bar .case-mobile-tab-action-label {
    font-size: 12px !important;
  }

  .surgical-cases-mobile-root {
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    min-height: 0;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 20px color-mix(in srgb, var(--foreground) 5%, transparent);
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
    padding: 6px 20px 6px;
    grid-template-columns: minmax(0, 1fr) 40px 40px;
    gap: 8px;
  }

  .mission-board-columns {
    padding: 12px 16px 16px;
    gap: 12px;
  }

  .mission-case-card-title {
    font-size: 14px;
  }

  .mission-case-card-meta {
    font-size: 12px;
  }

  .sc-mobile-list-icon-btn,
  .surgical-cases-crm-page .sc-mobile-list-tool-btn {
    width: 40px !important;
    min-width: 40px !important;
    height: 40px !important;
  }

  .surgical-cases-crm-page button.sc-mobile-list-segment,
  .surgical-cases-crm-page .sc-mobile-list-segment {
    min-height: 30px !important;
    height: 30px !important;
    padding: 0 12px !important;
    font-size: 12px !important;
  }

  .sc-mobile-case-row {
    padding: 12px 20px;
  }

  .sc-mobile-list-fab {
    right: max(24px, calc(50% - 590px + 24px));
    bottom: 28px;
  }

  .case-mobile-header-top {
    padding: 10px 20px 6px;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 10px;
  }

  .case-mobile-header-title {
    font-size: 20px;
  }

  .case-mobile-header-org,
  .case-mobile-header-meta {
    font-size: 13px;
  }

  .case-mobile-header-chips {
    padding: 6px 20px 8px;
  }

  .case-mobile-overview-row {
    grid-template-columns: 20px minmax(100px, 22%) minmax(0, 1fr);
    gap: 12px;
    padding: 10px 20px;
  }

  .case-mobile-overview-label {
    font-size: 12px;
  }

  .case-mobile-overview-value {
    font-size: 14px;
  }

  .case-activity-feed-mobile .case-activity-feed-head,
  .case-activity-feed-mobile .case-activity-note-composer,
  .case-activity-feed-mobile .case-activity-feed-filters,
  .case-activity-feed-item {
    padding-left: 20px;
    padding-right: 20px;
  }

  .case-resources-mobile .case-resources-section-head,
  .case-resources-mobile .case-resources-section-body {
    padding-left: 20px;
    padding-right: 20px;
  }

  .case-obs-workflow-head,
  .case-obs-stepper {
    padding-left: 20px;
    padding-right: 20px;
  }

  .case-obs-step-body {
    padding-left: 20px;
    padding-right: 20px;
  }
}

@media (min-width: 960px) {
  .case-mobile-overview-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 0;
  }

  .case-mobile-overview-meta .case-mobile-overview-row:nth-child(odd) {
    border-right: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  }
}
`;

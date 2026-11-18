/**
 * Portal-wide mobile-native rules (≤640px primary, tablet tweaks ≤1024px).
 * Complements surgicalCasesListMobileCss + salesCommandNativeCss.
 */
export const salesPortalMobileCss = `
.portal-contentWrap:has(.provider-workspace-page),
.portal-contentWrap:has(.org-workspace-page),
.portal-contentWrap:has(.create-provider-root),
.portal-contentWrap:has(.create-engagement-root),
.portal-contentWrap:has(.create-case-native-root),
.portal-contentWrap:has(.case-workspace-page),
.portal-contentWrap:has(.engagement-detail-mobile),
.portal-contentWrap:has(.prepare-for-meeting-page) {
  padding: 0 !important;
  padding-top: 0 !important;
}
.portal-content:has(.provider-workspace-page),
.portal-content:has(.org-workspace-page),
.portal-content:has(.create-provider-root),
.portal-content:has(.create-engagement-root),
.portal-content:has(.create-case-native-root),
.portal-content:has(.case-workspace-page),
.portal-content:has(.engagement-detail-mobile),
.portal-content:has(.prepare-for-meeting-page) {
  gap: 0 !important;
  max-width: none !important;
  width: 100% !important;
}
.crm-sales-page-bg:has(.provider-workspace-page),
.crm-sales-page-bg:has(.org-workspace-page),
.crm-sales-page-bg:has(.create-provider-root),
.crm-sales-page-bg:has(.create-engagement-root),
.crm-sales-page-bg:has(.create-case-native-root),
.crm-sales-page-bg:has(.case-workspace-page),
.crm-sales-page-bg:has(.engagement-detail-mobile),
.crm-sales-page-bg:has(.prepare-for-meeting-page) {
  padding: 0 !important;
  gap: 0 !important;
  max-width: none !important;
  width: 100% !important;
}

/* Hide legacy desktop tables inside native shells */
.sc-native-page .sales-cmd-table-wrap--desktop-only,
.sc-native-page .opps-table-desktop-only {
  display: none !important;
}

/* KPI strips → horizontal scroll on phones */
.sc-native-page .opps-kpis,
.sc-native-page .sc-native-metric-scroll.opps-kpis-scroll {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 8px !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
  padding: 8px 12px !important;
  margin: 0 !important;
  grid-template-columns: unset !important;
}
.sc-native-page .opps-kpis > *,
.sc-native-page .opps-kpi-chip {
  flex: 0 0 auto;
  min-width: 118px;
  max-width: 148px;
}

@media (max-width: 640px) {
  .sc-native-page .sales-cmd-panel-native,
  .sc-native-page .sales-cmd-panel-native > div:first-child {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  .sc-native-page .opps-toolbar {
    grid-template-columns: 1fr !important;
    gap: 6px !important;
  }
  .sc-native-page .opps-toolbar-compact [style*="grid-template-columns"] {
    grid-template-columns: 1fr !important;
  }
  .sc-native-page .sc-mobile-list-header-actions .sales-cmd-link,
  .sc-native-page .sc-mobile-list-header-actions button {
    min-height: 44px !important;
    padding: 6px 12px !important;
    font-size: 12px !important;
  }
  .sc-native-page .sc-mobile-list-header-actions {
    max-width: 100%;
  }
  .sc-native-page .sc-pipeline-board-header-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
  }
  .sc-native-page .sc-pipeline-board-header-actions > a,
  .sc-native-page .sc-pipeline-board-header-actions > button,
  .sc-native-page .sc-pipeline-board-header-actions > select {
    min-height: 44px !important;
  }
  .sc-native-page:has(.sc-pipeline-board-header-actions) .sc-mobile-list-header-top {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
  }
  .sc-native-page:has(.sc-pipeline-board-header-actions) .sc-mobile-list-header-actions {
    grid-column: 1 / -1;
    width: 100%;
    max-width: none;
  }
  .sc-native-page:has(.sc-pipeline-board-header-actions) .sc-pipeline-board-header-actions > a {
    flex: 0 0 auto;
  }
  .sc-native-page:has(.sc-pipeline-board-header-actions) .sc-pipeline-board-header-actions > select {
    flex: 1 1 auto;
    min-width: 0;
  }
  .sc-native-page .SalesMetricCard,
  .sc-native-page [class*="metric-card"] {
    min-height: unset !important;
  }
  .sales-dash-shell .sales-dash-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 4px !important;
  }
  .sales-dash-shell .sales-dash-two,
  .sales-dash-shell .sales-dash-triple,
  .sales-dash-shell .sales-dash-funnel-grid,
  .sales-dash-shell .needs-attention-grid {
    grid-template-columns: 1fr !important;
  }
  .sales-dash-shell .sales-dash-triple > :nth-child(3) {
    grid-column: auto !important;
  }
  .sales-dash-shell .sales-dash-op-bar {
    flex-direction: column;
    align-items: stretch !important;
  }
  .sales-dash-shell .sales-dash-op-bar button {
    width: 100%;
    justify-content: center;
  }
  .org-cmd-page .org-card-grid {
    grid-template-columns: 1fr !important;
  }
  .org-cmd-page .org-account-card:hover {
    transform: none !important;
    box-shadow: none !important;
  }
  .provider-workspace-page .provider-profile-actions {
    grid-template-columns: 1fr 1fr !important;
  }
  .provider-workspace-page .provider-profile-action--primary {
    grid-column: 1 / -1;
  }
  .provider-workspace-page .provider-profile-at-a-glance,
  .provider-workspace-page .provider-profile-planning-grid {
    grid-template-columns: 1fr !important;
  }
  .org-account-detail-native .org-tab-content {
    padding: 0 12px 10px;
    min-width: 0;
  }
  .org-account-detail-native .sales-cmd-panel-native {
    border-radius: 12px;
    box-shadow: none;
  }
  .org-account-detail-native .org-account-metrics {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    gap: 8px !important;
    grid-template-columns: unset !important;
    scrollbar-width: none;
  }
  .org-account-detail-native .org-account-metrics > div {
    flex: 0 0 auto;
    min-width: 118px;
    max-width: 148px;
  }
}

/* ── Workspace mobile polish (390–768): compact chrome, no content overlap ── */
/* Hide global sales action bar when page has its own bottom chrome */
body:has(.create-provider-root) .sales-mobile-action-bar-shell,
body:has(.create-engagement-root) .sales-mobile-action-bar-shell,
body:has(.engagement-detail-mobile) .sales-mobile-action-bar-shell,
body:has(.prepare-for-meeting-page) .sales-mobile-action-bar-shell,
body:has(.case-bottom-action-shell--mobile) .sales-mobile-action-bar-shell {
  display: none !important;
}

@media (max-width: 1024px) {
  body:has(.sales-mobile-action-bar-shell) .sc-native-page {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  }
  body:has(.sales-mobile-action-bar-shell) .portal-contentWrap:not(:has(.provider-workspace-page)):not(:has(.case-workspace-page)) {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
  body:has(.org-directory-root) .org-directory-root .org-directory-list-body {
    padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }
}

@media (max-width: 768px) {
  /* Add Provider */
  .create-provider-root .create-provider-header {
    padding: 8px 12px 6px !important;
  }
  .create-provider-root .create-provider-title {
    font-size: 16px !important;
  }
  .create-provider-root .create-provider-body {
    padding: 8px 12px calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }
  .create-provider-root .create-provider-footer {
    padding: 4px 10px calc(4px + env(safe-area-inset-bottom, 0px)) !important;
    box-shadow: 0 -1px 0 color-mix(in srgb, var(--foreground) 6%, var(--border)) !important;
  }
  .create-provider-root .create-provider-footer button,
  .create-provider-root .create-provider-footer a {
    min-height: 44px !important;
    font-size: 13px !important;
  }
  .create-provider-root .create-provider-grid-2 {
    grid-template-columns: 1fr !important;
  }

  /* Engagement create — footer in document flow; body scrolls above it */
  .create-engagement-root .create-engagement-body {
    padding-bottom: 8px !important;
    gap: 5px !important;
  }
  .create-engagement-root .create-engagement-type-chips {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 4px !important;
  }
  .create-engagement-root .create-engagement-type-chip {
    width: 100% !important;
    max-width: none !important;
    border-radius: 8px !important;
    text-align: left !important;
  }
  .create-engagement-root .create-engagement-segment {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    padding: 6px 4px !important;
    font-size: 11px !important;
    text-align: center !important;
  }
  .create-engagement-root .ew-prep-more-options {
    display: none !important;
  }
  .create-engagement-root .ew-prep-intro,
  .create-engagement-root .ew-prep-step-hint {
    display: none !important;
  }
  .create-engagement-root .ew-prep-guidance {
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
  }
  .create-engagement-root .create-engagement-footer--prep .create-engagement-footer-tools {
    display: none !important;
  }
  .create-engagement-root .create-engagement-footer {
    padding: 3px 8px calc(3px + env(safe-area-inset-bottom, 0px)) !important;
    position: static !important;
  }
  .create-engagement-root .create-engagement-footer button,
  .create-engagement-root .create-engagement-footer a {
    min-height: 44px !important;
    font-size: 13px !important;
  }
  .create-engagement-root .create-engagement-footer--prep .create-engagement-footer-actions .primary {
    max-width: none !important;
    flex: 1 1 auto !important;
  }
  .create-engagement-root .create-engagement-step-fields,
  .create-engagement-root .create-engagement-plan-fields .case-pre-call-plan-fields,
  .create-engagement-root .eng-workflow-fields {
    grid-template-columns: 1fr !important;
  }
  .create-engagement-root .create-engagement-review-card {
    grid-template-columns: 1fr !important;
  }

  /* Engagement detail — spacing owned by engagementDetailMobileCss (footer spacer only) */
  .engagement-detail-mobile-body {
    padding-bottom: 12px !important;
  }

  /* Provider detail */
  .provider-workspace-page .provider-profile-header {
    padding: 6px 12px 4px !important;
  }
  .provider-workspace-page .provider-profile-name {
    font-size: 16px !important;
  }
  .provider-workspace-page .provider-profile-tabs {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 3px !important;
    padding: 4px 8px 5px !important;
  }
  .provider-workspace-page .provider-profile-tabs::-webkit-scrollbar {
    display: none;
  }
  .provider-workspace-page .provider-profile-tab {
    min-height: 44px !important;
    padding: 0 11px !important;
    font-size: 11px !important;
  }
  .provider-workspace-page .provider-profile-body {
    padding: 10px 14px calc(60px + env(safe-area-inset-bottom, 0px)) !important;
    gap: 14px !important;
  }
  .provider-workspace-page .provider-profile-root--intelligence-tab .provider-profile-body,
  .provider-workspace-page .provider-profile-root--planning-tab .provider-profile-body {
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
  }
  .provider-workspace-page .provider-at-a-glance {
    padding: 7px 9px !important;
    border-radius: 8px !important;
  }
  .provider-workspace-page .provider-profile-card {
    padding: 7px 9px !important;
    border-radius: 8px !important;
  }
  .provider-workspace-page .provider-planning-save-bar--mobile {
    padding: 5px 10px calc(5px + env(safe-area-inset-bottom, 0px)) !important;
    box-shadow: 0 -1px 0 color-mix(in srgb, var(--foreground) 6%, var(--border)) !important;
  }
  .provider-workspace-page .provider-planning-save-bar--mobile .provider-profile-action--primary {
    min-height: 44px !important;
  }
  .provider-workspace-page .provider-profile-actions {
    gap: 4px !important;
    margin-top: 6px !important;
  }
  .provider-workspace-page .provider-profile-action {
    min-height: 44px !important;
    font-size: 12px !important;
  }
  .provider-workspace-page .provider-compact-row {
    padding: 7px 9px !important;
  }

  /* Case detail */
  .case-workspace-page .case-detail-page-pad {
    padding-bottom: calc(46px + env(safe-area-inset-bottom, 0px)) !important;
  }
  .case-workspace-page .case-engagement-strategy-card {
    padding: 8px 10px !important;
    gap: 8px !important;
    border-radius: 8px !important;
  }
  .case-workspace-page .case-mobile-bottom-bar {
    min-height: 44px !important;
  }
  .case-workspace-page .case-provider-intel-snapshot--compact {
    padding: 8px 12px !important;
    margin: 0 !important;
  }
  .case-workspace-page .case-obs-step-header {
    min-height: 44px !important;
    padding: 6px 12px 6px 8px !important;
  }
  .case-workspace-page .case-workspace-tabbar .case-workspace-tab {
    min-height: 44px !important;
    font-size: 11px !important;
    padding: 5px 3px 3px !important;
  }
}

@media (max-width: 400px) {
  .provider-workspace-page .provider-profile-actions {
    grid-template-columns: 1fr !important;
  }
  .sc-native-page .opps-kpis > * {
    min-width: 108px;
  }
}

@media (max-width: 768px) {
  .org-cmd-page .org-card-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 641px) and (max-width: 1023px) {
  .org-cmd-page.sc-native-page .org-card-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 1024px) {
  .org-cmd-page .org-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .org-cmd-page .org-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
`;

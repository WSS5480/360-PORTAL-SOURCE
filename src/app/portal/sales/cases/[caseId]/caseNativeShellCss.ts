/** Native mobile case workspace layout at all viewport widths. */
export const caseNativeShellCss = `
.portal-shell:has(.case-workspace-page) {
  background: var(--background) !important;
}
.portal-contentWrap:has(.case-workspace-page) {
  padding: 0 !important;
  padding-top: 0 !important;
}
.portal-content:has(.case-workspace-page) {
  gap: 0 !important;
  max-width: none !important;
}
.crm-sales-page-bg:has(.case-workspace-page) {
  gap: 0 !important;
  padding: 0 !important;
  max-width: none !important;
  background: var(--background) !important;
}
.case-detail-page-pad {
  padding-bottom: calc(46px + env(safe-area-inset-bottom, 0px));
  overflow-x: clip;
  max-width: 100%;
  box-sizing: border-box;
}
.case-workspace-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}
.case-workspace-shell {
  gap: 0;
  margin: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
  min-width: 0;
}
.case-workspace-body {
  display: grid;
  gap: 0;
}
.case-workspace-sticky {
  position: sticky;
  top: 0;
  gap: 0;
  background: #fff;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  z-index: 40;
}
.case-workspace-header {
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  background: transparent;
  border-left: none !important;
}
.case-workspace-header-main,
.case-workspace-actions {
  display: none !important;
}
.case-workspace-tabbar {
  display: flex;
  gap: 0;
  overflow-x: hidden;
  padding: 0;
  border: none;
  border-radius: 0;
  background: var(--surface);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  max-width: 100%;
}
.case-workspace-tabbar .case-workspace-tab {
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
  padding: 5px 3px 3px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  border: none !important;
  border-radius: 0 !important;
  border-bottom: 2px solid transparent !important;
  background: transparent !important;
  color: var(--muted) !important;
  box-shadow: none !important;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.case-workspace-tabbar .case-workspace-tab[aria-selected="true"] {
  color: var(--brand-600) !important;
  border-bottom: 2px solid var(--brand-600) !important;
  background: transparent !important;
  font-weight: 800 !important;
}
.case-detail-surface {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  background: transparent !important;
  border-left: none !important;
}
.case-detail-surface:hover {
  box-shadow: none !important;
  border-color: transparent !important;
}
.case-overview-layout,
.case-overview-meta-grid,
.case-workspace-field-grid,
.case-workspace-stat-grid {
  grid-template-columns: 1fr;
}
.case-mobile-header-top.case-mobile-only {
  display: flex !important;
}
.case-mobile-bottom-bar {
  display: grid !important;
}
.case-bottom-action-shell--mobile {
  display: block;
  padding: 0;
  pointer-events: none;
}
.case-bottom-action-shell--desktop {
  display: none !important;
}
.case-workspace-banner {
  padding: 6px 10px !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  font-size: 11px !important;
  line-height: 1.35 !important;
}
.case-workspace-banner--reminders ul,
.case-workspace-banner--reminders .case-workspace-banner-sub {
  display: none;
}
.case-workspace-banner--reminders {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.case-mobile-only.case-activity-feed-mobile,
.case-mobile-only.case-mobile-overview-panel,
.case-mobile-only.case-obs-overview-panel,
.case-mobile-only.case-obs-tab-panel,
.case-mobile-only.case-ps-workflow-panel,
.case-mobile-only.case-resources-mobile,
.case-mobile-only.case-mobile-header,
.case-obs-workflow {
  display: grid;
}
.case-mobile-only.case-mobile-header {
  display: block;
}
`;

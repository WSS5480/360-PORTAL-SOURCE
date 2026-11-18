/** Mobile-native shell for Sales Command pages (flat panels, edge-to-edge). */
export const salesCommandNativeCss = `
.portal-contentWrap:has(.sc-native-page),
.portal-contentWrap:has(.surgical-cases-crm-page),
.portal-contentWrap:has(.case-workspace-page) {
  padding: 0 !important;
  padding-top: 0 !important;
}
.portal-content:has(.sc-native-page),
.portal-content:has(.surgical-cases-crm-page),
.portal-content:has(.case-workspace-page) {
  gap: 0 !important;
  max-width: none !important;
}
.crm-sales-page-bg:has(.sc-native-page),
.crm-sales-page-bg:has(.surgical-cases-crm-page),
.crm-sales-page-bg:has(.org-cmd-page),
.crm-sales-page-bg:has(.case-workspace-page) {
  padding: 0 !important;
  gap: 0 !important;
  max-width: 100% !important;
  background: var(--background) !important;
}
.sales-cmd-native-wrap {
  padding: 0 !important;
  gap: 0 !important;
  max-width: 100% !important;
}
.sc-native-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef4fb 100%);
  min-height: calc(100dvh - 52px);
}
.sc-native-page .sales-cmd-panel-native {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  background: linear-gradient(180deg, #fff 0%, #fbfdff 100%) !important;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border)) !important;
}
.sc-native-page .sales-cmd-panel-native > div:first-child {
  padding: 8px 12px 6px !important;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border)) !important;
}
.sc-native-page .sales-cmd-panel-native [style*="panelTitle"],
.sc-native-page .sales-cmd-panel-native h2,
.sc-native-page .sales-cmd-panel-native h3 {
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}
.sc-native-page .sales-cmd-table-wrap {
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
}
.sc-native-page .sales-cmd-table thead {
  display: none;
}
.sc-native-page .sales-cmd-table,
.sc-native-page .sales-cmd-table tbody {
  display: block;
  width: 100%;
}
.sc-native-page .sales-cmd-table tbody tr {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--brand-600) 2%, #fff) 100%);
}
.sc-native-page .sales-cmd-table tbody tr:hover {
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}
.sc-native-page .sales-cmd-table tbody td {
  display: block;
  padding: 0 !important;
  border: none !important;
}
.sc-native-page .sales-cmd-table tbody td::before {
  content: attr(data-label);
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.sc-native-page .sales-cmd-table tbody td:first-child::before {
  display: none;
}
.sc-native-page .sc-native-board-track {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 10px 12px 16px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}
.sc-native-page .sc-native-board-col {
  flex: 0 0 min(280px, 82vw);
  scroll-snap-align: start;
  display: grid;
  gap: 8px;
  align-content: start;
  max-height: min(70vh, 640px);
  overflow-y: auto;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--brand-600) 4%, #fff) 100%);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--foreground) 6%, transparent);
}
.sc-native-page .sc-native-board-col-head {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.sc-native-page .sc-native-board-card {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 3%, #fff) 100%);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--foreground) 4%, transparent);
  font-size: 12px;
}
.sc-native-page .sc-native-task-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: linear-gradient(180deg, #fff 0%, color-mix(in srgb, var(--brand-600) 2.5%, #fff) 100%);
}
.sc-native-page .sc-native-metric-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 12px;
  -webkit-overflow-scrolling: touch;
}
.sc-native-page .sc-native-metric-scroll > * {
  flex: 0 0 auto;
  min-width: 120px;
}
.sc-native-page button:not(.sc-mobile-list-segment):not(.sc-mobile-list-icon-btn):not(.sc-mobile-list-tool-btn):not(.case-workspace-tab):not(.case-mobile-tab-action) {
  max-width: 100%;
}
.sc-native-page .sc-mobile-list-segment,
.sc-native-page button.sc-mobile-list-segment {
  flex: 0 0 auto !important;
  flex-shrink: 0 !important;
  max-width: none !important;
  width: auto !important;
}
`;

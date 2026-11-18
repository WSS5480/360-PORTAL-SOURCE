/** Shared surgical case detail shell — desktop 70/30 overview + mobile stack. */
export const surgicalCaseDetailShellCss = `
.portal-shell:has(.surgical-case-detail-shell) {
  background: var(--background) !important;
}
.portal-contentWrap:has(.surgical-case-detail-shell) {
  padding: 0 !important;
  padding-top: 0 !important;
}
.portal-content:has(.surgical-case-detail-shell) {
  gap: 0 !important;
  max-width: none !important;
}
.crm-sales-page-bg:has(.surgical-case-detail-shell) {
  gap: 0 !important;
  padding: 0 !important;
  max-width: none !important;
  background: var(--background) !important;
}

.surgical-case-detail-shell {
  --cod-pad-x: 16px;
  --cod-gap: 10px;
  --cod-card-radius: 10px;
  --cod-border: color-mix(in srgb, var(--foreground) 8%, var(--border));
  --cod-muted: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  /* The 100% term keeps a wide tab strip from stretching the shell past the screen. */
  max-width: min(1180px, 100%);
  margin: 0 auto;
  min-width: 0;
  padding: 0 var(--cod-pad-x) 24px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  box-sizing: border-box;
}

.surgical-case-detail-shell .case-obs-detail-header {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--cod-border);
  background: #fff;
  min-width: 0;
}

.surgical-case-detail-shell .case-obs-detail-header-main {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.surgical-case-detail-shell .case-obs-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 650;
  color: var(--cod-muted);
  text-decoration: none;
  width: fit-content;
  flex-shrink: 0;
  white-space: nowrap;
}
.surgical-case-detail-shell .case-obs-detail-back:hover {
  color: var(--foreground);
}

.surgical-case-detail-shell .case-obs-detail-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-700);
  line-height: 1.3;
}

.surgical-case-detail-shell .case-obs-detail-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.surgical-case-detail-shell .case-obs-detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.surgical-case-detail-shell .case-obs-detail-status-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  border: 1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
}

.surgical-case-detail-shell .case-obs-detail-status-badge--in_progress {
  border-color: color-mix(in srgb, #d97706 28%, var(--border));
  background: color-mix(in srgb, #d97706 10%, var(--surface));
  color: #b45309;
}

.surgical-case-detail-shell .case-obs-detail-status-badge--completed,
.surgical-case-detail-shell .case-obs-detail-status-badge--debrief_planned {
  border-color: color-mix(in srgb, #059669 28%, var(--border));
  background: color-mix(in srgb, #059669 10%, var(--surface));
  color: #047857;
}

.surgical-case-detail-shell .case-obs-detail-status-badge--rescheduled {
  border-color: color-mix(in srgb, #6366f1 28%, var(--border));
  background: color-mix(in srgb, #6366f1 10%, var(--surface));
  color: #4338ca;
}

.surgical-case-detail-shell .case-obs-detail-status-badge--cancelled,
.surgical-case-detail-shell .case-obs-detail-status-badge--closed {
  border-color: color-mix(in srgb, var(--foreground) 14%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 50%, var(--surface));
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.surgical-case-detail-shell .case-obs-detail-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.surgical-case-detail-shell .case-obs-detail-provider-link,
.surgical-case-detail-shell .case-obs-detail-title-link {
  color: inherit;
  font-weight: 750;
  text-decoration: none;
}

.surgical-case-detail-shell .case-obs-detail-provider-link:hover,
.surgical-case-detail-shell .case-obs-detail-title-link:hover {
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.surgical-case-detail-shell .case-obs-detail-meta {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--cod-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.surgical-case-detail-shell .case-obs-detail-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-top: 2px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 0;
}

.surgical-case-detail-shell .case-obs-detail-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  border: 1px solid var(--cod-border);
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  color: var(--foreground);
  white-space: nowrap;
  flex-shrink: 0;
}
.surgical-case-detail-shell .case-obs-detail-chip--signal {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-800, var(--brand-700));
}
.surgical-case-detail-shell .case-obs-detail-chip--questions {
  border-color: color-mix(in srgb, #b45309 28%, var(--border));
  background: color-mix(in srgb, #b45309 8%, #fff);
  color: #92400e;
}
.surgical-case-detail-shell .case-obs-detail-chip--brand {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-800, var(--brand-700));
}
.surgical-case-detail-shell .case-obs-detail-chip--debrief {
  border-color: color-mix(in srgb, #166534 28%, var(--border));
  background: color-mix(in srgb, #166534 8%, #fff);
  color: #166534;
}

.surgical-case-detail-shell .case-obs-detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 16px;
  margin: 0;
}
.surgical-case-detail-shell .case-obs-detail-meta-item {
  min-width: 0;
}
.surgical-case-detail-shell .case-obs-detail-meta-item dt {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--cod-muted);
}
.surgical-case-detail-shell .case-obs-detail-meta-item dd {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.surgical-case-detail-shell .case-obs-detail-header-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.surgical-case-detail-shell .case-obs-detail-btn {
  min-height: 36px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--cod-border);
  background: #fff;
  color: var(--foreground);
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.surgical-case-detail-shell .case-obs-detail-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.surgical-case-detail-shell .case-obs-detail-btn--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}
.surgical-case-detail-shell .case-obs-detail-btn--more {
  min-width: 40px;
  padding-inline: 10px;
  font-size: 18px;
  line-height: 1;
}

.surgical-case-detail-shell .case-obs-detail-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--cod-border);
  background: #fff;
  margin: 0 calc(-1 * var(--cod-pad-x));
  padding: 0 var(--cod-pad-x);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.surgical-case-detail-shell .case-obs-detail-tab {
  flex: 0 0 auto;
  padding: 10px 14px 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--cod-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  margin-bottom: -1px;
  white-space: nowrap;
}
.surgical-case-detail-shell .case-obs-detail-tab[aria-selected="true"] {
  color: var(--brand-700, var(--brand-600));
  border-bottom-color: var(--brand-600);
}

.surgical-case-detail-shell .case-obs-detail-banners {
  display: grid;
  gap: 0;
  margin: 0 calc(-1 * var(--cod-pad-x));
}
.surgical-case-detail-shell .case-obs-detail-banners > * {
  padding: 8px var(--cod-pad-x);
  border-bottom: 1px solid var(--cod-border);
  font-size: 12px;
  font-weight: 700;
  background: #fff;
}

.surgical-case-detail-shell .case-obs-detail-panel {
  padding-top: var(--cod-gap);
  min-width: 0;
}

.surgical-case-detail-shell .case-obs-detail-overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--cod-gap);
  align-items: start;
}

.surgical-case-detail-shell .case-obs-detail-overview-main {
  display: grid;
  gap: var(--cod-gap);
  min-width: 0;
}

.surgical-case-detail-shell .case-obs-detail-card {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--cod-border);
  border-radius: var(--cod-card-radius);
  background: #fff;
  min-width: 0;
}
.surgical-case-detail-shell .case-obs-detail-card--compact {
  gap: 6px;
  padding: 8px 10px;
}

.surgical-case-detail-shell .case-obs-detail-card-head {
  display: grid;
  gap: 4px;
}

.surgical-case-detail-shell .case-obs-detail-card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.surgical-case-detail-shell .case-obs-detail-card-lead {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 550;
  color: var(--cod-muted);
}

.surgical-case-detail-shell .case-obs-detail-card-body {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--foreground);
}

.surgical-case-detail-shell .case-obs-detail-card-empty {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--cod-muted);
  line-height: 1.4;
}

.surgical-case-detail-shell .case-obs-detail-list {
  margin: 0;
  padding: 0 0 0 16px;
  display: grid;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
.surgical-case-detail-shell .case-obs-detail-list--compact {
  font-size: 12px;
  gap: 3px;
}
.surgical-case-detail-shell .case-obs-detail-list--briefing {
  gap: 6px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
}
.surgical-case-detail-shell .case-obs-detail-list--briefing li::marker {
  color: var(--brand-600);
}

.surgical-case-detail-shell .case-obs-detail-brief-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-700);
}
.surgical-case-detail-shell .case-obs-detail-mission-lead {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}
.surgical-case-detail-shell .case-obs-detail-hint-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}
.surgical-case-detail-shell .case-obs-detail-hint-list li {
  position: relative;
  padding-left: 12px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 55%, var(--cod-muted));
}
.surgical-case-detail-shell .case-obs-detail-hint-list li::before {
  content: "—";
  position: absolute;
  left: 0;
  color: color-mix(in srgb, var(--brand-600) 70%, var(--cod-muted));
}

.surgical-case-detail-shell .case-obs-detail-overview-stack {
  display: grid;
  gap: var(--cod-gap);
  min-width: 0;
}
.surgical-case-detail-shell .case-obs-detail-overview-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--cod-gap);
}
.surgical-case-detail-shell .case-obs-detail-intelligence-collapse {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 12px;
  background: var(--surface, #fff);
  overflow: hidden;
}
.surgical-case-detail-shell .case-obs-detail-intelligence-collapse-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  list-style: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.surgical-case-detail-shell .case-obs-detail-intelligence-collapse-summary::-webkit-details-marker {
  display: none;
}
.surgical-case-detail-shell .case-obs-detail-intelligence-collapse-note {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: normal;
  text-transform: none;
  color: color-mix(in srgb, var(--foreground) 48%, var(--muted));
}
.surgical-case-detail-shell .case-obs-detail-intelligence-collapse-body {
  padding: 0 14px 14px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-obs-mission-opportunity-summary {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.5;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}
.case-obs-debrief-workflow {
  display: grid;
  gap: 14px;
}
.case-obs-debrief-hypotheses-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.case-obs-debrief-hypotheses-lead {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
}
.surgical-case-detail-shell .case-obs-detail-feed-collapse {
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: 12px;
  background: var(--surface, #fff);
  overflow: hidden;
}
.surgical-case-detail-shell .case-obs-detail-feed-collapse-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}
.surgical-case-detail-shell .case-obs-detail-feed-collapse-summary::-webkit-details-marker {
  display: none;
}
.surgical-case-detail-shell .case-obs-detail-feed-collapse-note {
  font-size: 10px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: var(--cod-muted, var(--muted));
}
.surgical-case-detail-shell .case-obs-detail-feed-collapse-body {
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
@media (min-width: 720px) {
  .surgical-case-detail-shell .case-obs-detail-overview-split {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.surgical-case-detail-shell .case-obs-detail-timeline {
  display: grid;
  gap: 0;
}
.surgical-case-detail-shell .case-obs-detail-timeline-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.surgical-case-detail-shell .case-obs-detail-timeline-item:first-child {
  border-top: none;
  padding-top: 0;
}
.surgical-case-detail-shell .case-obs-detail-timeline-time {
  font-size: 11px;
  font-weight: 700;
  color: var(--cod-muted);
  line-height: 1.35;
}
.surgical-case-detail-shell .case-obs-detail-timeline-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.surgical-case-detail-shell .case-obs-detail-timeline-label {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
}
.surgical-case-detail-shell .case-obs-detail-timeline-preview {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--cod-muted);
  line-height: 1.35;
}

.surgical-case-detail-shell .case-obs-detail-sidebar {
  display: grid;
  gap: var(--cod-gap);
  min-width: 0;
}
.surgical-case-detail-shell .case-obs-detail-sidebar-list {
  margin: 0;
  padding: 6px 12px 10px;
  list-style: none;
  display: grid;
  gap: 4px;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}
.surgical-case-detail-shell .case-obs-detail-sidebar-empty {
  margin: 0;
  padding: 6px 12px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cod-muted);
  line-height: 1.35;
}
.surgical-case-detail-shell .case-obs-detail-sidebar-engagement {
  display: grid;
  gap: 4px;
  padding: 6px 12px 10px;
}
.surgical-case-detail-shell .case-obs-detail-sidebar-engagement-link {
  font-size: 13px;
  font-weight: 800;
  color: var(--brand-700, var(--brand-600));
  text-decoration: none;
}
.surgical-case-detail-shell .case-obs-detail-sidebar-engagement-link:hover {
  text-decoration: underline;
}
.surgical-case-detail-shell .case-obs-detail-sidebar-engagement-meta {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  color: var(--cod-muted);
}
.surgical-case-detail-shell .case-obs-plan-debrief-btn.case-obs-detail-btn {
  min-height: 36px;
}

.surgical-case-detail-shell .case-obs-detail-link-btn {
  justify-self: start;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-700, var(--brand-600));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.surgical-case-detail-shell .case-obs-detail-link-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.surgical-case-detail-shell .case-obs-detail-activity-item {
  display: grid;
  gap: 2px;
  padding: 8px 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.surgical-case-detail-shell .case-obs-detail-activity-item:first-child {
  border-top: none;
  padding-top: 0;
}
.surgical-case-detail-shell .case-obs-detail-activity-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  font-size: 13px;
  font-weight: 700;
}
.surgical-case-detail-shell .case-obs-detail-activity-time {
  font-size: 12px;
  font-weight: 600;
  color: var(--cod-muted);
}
.surgical-case-detail-shell .case-obs-detail-activity-preview {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--cod-muted);
  line-height: 1.4;
}

.surgical-case-detail-shell .case-obs-detail-snapshot {
  display: grid;
  gap: 0;
  padding: 0;
  border: 1px solid var(--cod-border);
  border-radius: var(--cod-card-radius);
  background: #fff;
  overflow: hidden;
}
.surgical-case-detail-shell .case-obs-detail-snapshot-title {
  margin: 0;
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cod-muted);
  border-bottom: 1px solid var(--cod-border);
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}
.surgical-case-detail-shell .case-obs-detail-snapshot-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  font-size: 12px;
  line-height: 1.3;
  min-width: 0;
}
.surgical-case-detail-shell .case-obs-detail-snapshot-row:last-child {
  border-bottom: none;
}
.surgical-case-detail-shell .case-obs-detail-snapshot-label {
  font-weight: 700;
  color: var(--cod-muted);
}
.surgical-case-detail-shell .case-obs-detail-snapshot-value {
  font-weight: 650;
  color: var(--foreground);
  min-width: 0;
  word-break: break-word;
}
.surgical-case-detail-shell .case-obs-detail-snapshot-value a {
  color: var(--brand-700, var(--brand-600));
  text-decoration: none;
  font-weight: 700;
}
.surgical-case-detail-shell .case-obs-detail-snapshot-value a:hover {
  text-decoration: underline;
}

.surgical-case-detail-shell .case-obs-detail-bottom-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  pointer-events: none;
}
.surgical-case-detail-shell .case-obs-detail-bottom-wrap .case-mobile-bottom-bar {
  pointer-events: auto;
}

body:has(.surgical-case-detail-shell) .sales-log-update-desktop-btn,
body:has(.surgical-case-detail-shell) .sales-log-update-fab {
  display: none !important;
}
body:has(.surgical-case-detail-shell) .sales-mobile-action-bar-shell {
  display: none !important;
}

@media (min-width: 900px) {
  .surgical-case-detail-shell {
    --cod-pad-x: 24px;
    padding-bottom: 32px;
  }

  .surgical-case-detail-shell .case-obs-detail-overview-grid {
    grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
    gap: 20px;
  }

  .surgical-case-detail-shell .case-obs-detail-bottom-wrap {
    display: none !important;
  }

  .surgical-case-detail-shell .case-obs-detail-snapshot {
    position: sticky;
    top: 12px;
  }

  .surgical-case-detail-shell .case-obs-detail-sidebar {
    position: sticky;
    top: 12px;
  }
}

@media (max-width: 899px) {
  .surgical-case-detail-shell {
    padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px));
  }

  .surgical-case-detail-shell .case-obs-detail-bottom-wrap .case-bottom-action-shell--mobile {
    display: block;
    padding: 0;
    left: 0;
    right: 0;
    width: 100%;
  }

  .surgical-case-detail-shell .case-obs-detail-header {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .surgical-case-detail-shell .case-obs-detail-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .surgical-case-detail-shell .case-obs-detail-header-actions {
    width: 100%;
    flex-wrap: nowrap;
  }
  .surgical-case-detail-shell .case-obs-detail-header-actions .case-obs-detail-btn {
    flex: 1 1 0;
    min-width: 0;
  }

  .surgical-case-detail-shell .case-obs-detail-snapshot {
    order: -1;
  }
}

.surgical-case-detail-shell .case-obs-debrief-next-step {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.surgical-case-detail-shell .case-obs-plan-debrief-btn {
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700, var(--brand-600));
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}

.surgical-case-detail-shell .case-obs-plan-debrief-btn--primary {
  background: var(--brand-600);
  border-color: var(--brand-600);
  color: #fff;
}

.surgical-case-detail-shell .case-obs-plan-debrief-btn--secondary {
  background: transparent;
  color: var(--foreground);
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.surgical-case-detail-shell .case-obs-plan-debrief-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

`;

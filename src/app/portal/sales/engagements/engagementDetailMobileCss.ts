/** Engagement detail — mobile-native layout (aligned with prepare-for-meeting polish). */
export const engagementDetailMobileCss = `
.engagement-detail-mobile {
  --edm-pad-x: 12px;
  --edm-section-gap: 8px;
  --edm-footer-h: calc(60px + env(safe-area-inset-bottom, 0px));
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface, #f8fafc);
  overflow-x: clip;
  max-width: 100vw;
}

.engagement-detail-mobile *,
.engagement-detail-mobile *::before,
.engagement-detail-mobile *::after {
  box-sizing: border-box;
}

.engagement-detail-mobile--loading {
  padding: 0;
}

/* —— Header —— */
.engagement-detail-mobile-header {
  position: sticky;
  top: 0;
  z-index: 40;
  flex-shrink: 0;
  padding: 8px var(--edm-pad-x) 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, #fff 94%, transparent);
  backdrop-filter: blur(10px);
}

.engagement-detail-mobile-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  min-width: 0;
}

.engagement-detail-mobile-header-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.engagement-detail-mobile-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  min-width: 0;
}

/* Single operational status banner (not multi-chip lifecycle) */
.edm-op-banner {
  margin: 6px 0 8px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  display: grid;
  gap: 3px;
}

.edm-op-banner-kicker {
  display: block;
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.edm-op-banner-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.25;
  color: var(--foreground);
}

.edm-op-banner-subtitle {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--muted);
}

.edm-op-banner--ready {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.edm-op-banner--ready .edm-op-banner-title {
  color: var(--brand-800, var(--brand-700));
}

.edm-op-banner--attention,
.edm-op-banner--debrief {
  border-color: color-mix(in srgb, #d97706 30%, var(--border));
  background: color-mix(in srgb, #d97706 8%, #fff);
}

.edm-op-banner--attention .edm-op-banner-title,
.edm-op-banner--debrief .edm-op-banner-title {
  color: #92400e;
}

.edm-op-banner--closed {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background: color-mix(in srgb, #16a34a 7%, #fff);
}

.edm-op-banner--closed .edm-op-banner-title {
  color: #166534;
}

.edm-op-banner--discovery {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.edm-op-banner--discovery .edm-op-banner-title {
  color: var(--brand-800, var(--brand-700));
}

.edm-readiness-sections {
  display: grid;
  gap: 10px;
  margin: 0 0 10px;
}

.edm-readiness-section {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.edm-readiness-section--blockers {
  border-color: color-mix(in srgb, #d97706 28%, var(--border));
  background: color-mix(in srgb, #d97706 6%, #fff);
}

.edm-readiness-section-title {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--foreground);
}

.edm-readiness-section-lead {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.edm-readiness-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.edm-readiness-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  line-height: 1.35;
}

.edm-readiness-item-label {
  font-weight: 700;
  color: var(--foreground);
  min-width: 0;
}

.edm-readiness-item-state {
  font-weight: 500;
  color: var(--muted);
}

.edm-readiness-item-summary {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 500;
  color: var(--muted);
}

.edm-readiness-item--objective {
  flex-direction: column;
  align-items: stretch;
}

.edm-readiness-item-action {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
  white-space: nowrap;
}

.edm-readiness-item-action:hover {
  text-decoration: underline;
}

.edm-readiness-item-action--muted {
  color: var(--muted);
  font-weight: 600;
}

/* —— Engagement detail hub (management-only) —— */
.engagement-detail-page {
  max-width: 720px;
  max-width: 560px;
  margin: 0 auto;
  padding: 20px 24px 40px;
}

.engagement-detail-page--loading {
  min-height: 200px;
}

.engagement-detail-page-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.engagement-detail-page-back,
.engagement-detail-page-provider-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.engagement-detail-page-back:hover,
.engagement-detail-page-provider-link:hover {
  text-decoration: underline;
}

.engagement-detail-page-alert {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--danger) 8%, #fff);
  color: var(--danger);
  font-size: 13px;
}

.engagement-detail-page-muted {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--muted);
}

.engagement-detail-hub {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.engagement-detail-hub-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding-bottom: 4px;
}

.engagement-detail-hub-type {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.engagement-detail-hub-provider {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.engagement-detail-hub-provider-link {
  color: inherit;
  text-decoration: none;
}

.engagement-detail-hub-provider-link:hover {
  color: var(--brand-700);
}

.engagement-detail-hub-organization {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.engagement-detail-hub-status {
  display: inline-flex;
  margin-top: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.engagement-detail-hub-status--planned {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  color: var(--brand-800);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.engagement-detail-hub-status--in_progress {
  background: color-mix(in srgb, #d97706 14%, #fff);
  color: #92400e;
  border: 1px solid color-mix(in srgb, #d97706 28%, var(--border));
}

.engagement-detail-hub-status--completed {
  background: color-mix(in srgb, #059669 12%, #fff);
  color: #065f46;
  border: 1px solid color-mix(in srgb, #059669 24%, var(--border));
}

.engagement-detail-hub-status--other {
  background: var(--surface-2, #f4f4f5);
  color: var(--muted);
  border: 1px solid var(--border);
}

.engagement-detail-hub-card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent);
}

.engagement-detail-hub-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.engagement-detail-hub-card-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.engagement-detail-hub-card-save {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.engagement-detail-hub-card-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.engagement-detail-hub-schedule-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.engagement-detail-hub-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.engagement-detail-hub-field--full {
  grid-column: 1 / -1;
}

.engagement-detail-hub-field > span {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.engagement-detail-hub-field input {
  width: 100%;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  background: #fff;
}

.engagement-detail-hub-field input:disabled {
  opacity: 0.65;
}

.engagement-detail-hub-goal {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
}

.engagement-detail-hub-summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px 20px;
  margin: 0;
}

.engagement-detail-hub-summary-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.engagement-detail-hub-summary-grid dt {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.engagement-detail-hub-summary-grid dd {
  margin: 0;
}

.engagement-detail-hub-summary-span {
  grid-column: 1 / -1;
}

.engagement-detail-hub-summary-value {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--foreground);
  white-space: pre-wrap;
}

.engagement-detail-hub-prep {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.engagement-detail-hub-prep--not_started {
  color: var(--muted);
}

.engagement-detail-hub-prep--ready {
  color: var(--brand-700);
}

.engagement-detail-hub-prep--completed {
  color: #065f46;
}

.engagement-detail-hub-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-top: 4px;
}

.engagement-detail-hub-actions .engagement-edit-trigger {
  margin-right: auto;
}

.engagement-detail-hub-secondary {
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.engagement-detail-hub-delete {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--danger);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.engagement-detail-hub-delete:hover:not(:disabled) {
  color: color-mix(in srgb, var(--danger) 80%, #000);
}

.engagement-detail-hub-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.engagement-detail-mobile .engagement-detail-hub {
  padding: 0 var(--edm-pad-x, 12px) calc(24px + env(safe-area-inset-bottom, 0px));
}

.engagement-detail-mobile .engagement-detail-hub-provider {
  font-size: 22px;
}

/* —— Engagement hub (legacy grid) —— */
.engagement-record-hub-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin: 0 0 18px;
}

.engagement-record-hub-grid dt {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 4px;
}

.engagement-record-hub-grid dd {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.engagement-record-hub-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.engagement-record-hub-actions .engagement-edit-trigger {
  margin-right: auto;
}

/* —— Engagement workspace —— */
.edm-workspace {
  display: grid;
  gap: 10px;
  padding: 10px var(--edm-pad-x, 12px);
  margin: 0 calc(-1 * var(--edm-pad-x, 12px));
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.edm-workspace-head {
  display: grid;
  gap: 2px;
}

.edm-workspace-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.edm-workspace-lead {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--foreground);
}

/* —— Engagement record sections —— */
.edm-record-summary {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}

.edm-record-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin: 0;
}

.edm-record-summary-grid dt {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.edm-record-summary-grid dd {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
}

.edm-record-summary-span {
  grid-column: 1 / -1;
}

.edm-record-section {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}

.edm-record-section--compact {
  padding: 8px 10px;
}

.edm-record-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.edm-record-section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
}

.edm-record-section-lead {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.edm-record-section-link {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  white-space: nowrap;
}

.edm-record-outcome {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 85%, var(--muted));
}

.edm-record-debrief {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}

.edm-record-debrief-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.edm-record-debrief-status {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 700;
}

.edm-record-debrief-hint {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
}

.edm-record-debrief-cta {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  background: var(--brand-600, #2563eb);
  color: #fff;
}

.edm-record-debrief--needed {
  border-color: color-mix(in srgb, #d97706 30%, var(--border));
  background: color-mix(in srgb, #d97706 6%, #fff);
}

.edm-record-briefing {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.edm-record-briefing--not_planned {
  border-style: dashed;
}

.edm-record-briefing--planned {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background: color-mix(in srgb, #16a34a 5%, #fff);
}

.edm-record-briefing--planning_in_progress {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.edm-record-briefing-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.edm-record-briefing-empty-title {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.edm-record-briefing-empty-lead,
.edm-record-briefing-hint {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.edm-record-briefing-status {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.edm-record-briefing-error {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--danger);
}

.edm-record-briefing-cta {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  background: var(--brand-600, #2563eb);
  color: #fff;
}

.edm-record-debrief--completed {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
}

.edm-record-compact-list {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.edm-record-compact-item {
  display: grid;
  gap: 1px;
}

.edm-record-compact-label {
  font-size: 11px;
  font-weight: 700;
}

.edm-record-compact-meta {
  font-size: 10px;
  color: var(--muted);
}

.edm-record-bullet-list {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.4;
}

.edm-record-bullet-list--actions li {
  font-weight: 600;
}

.edm-record-link-list {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.edm-record-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.edm-record-link-chevron {
  font-size: 11px;
  opacity: 0.7;
}

.edm-record-timeline {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.edm-record-timeline li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
}

.edm-record-timeline-label {
  font-weight: 600;
}

.edm-record-timeline-at {
  color: var(--muted);
  white-space: nowrap;
}

.edm-workspace-next {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: #fff;
  display: grid;
  gap: 6px;
}

.edm-workspace-section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
}

.edm-workspace-next-body {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.edm-workspace-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.edm-workspace-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  font-family: inherit;
}

.edm-workspace-cta.primary {
  background: var(--brand-600, #2563eb);
  color: #fff;
}

.edm-workspace-cta.secondary {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--brand-700);
}

.edm-workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.edm-workspace-card {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  display: grid;
  gap: 2px;
  min-width: 0;
}

.edm-workspace-card-kicker {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.edm-workspace-card-value {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}

.edm-workspace-card-value--muted {
  font-weight: 600;
  color: var(--muted);
}

.edm-workspace-card-meta {
  margin: 0;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.35;
}

.edm-workspace-card-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.edm-workspace-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.edm-workspace-quick-btn {
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.engagement-detail-mobile-title-row {
  min-width: 0;
}

.engagement-detail-mobile-title-block {
  min-width: 0;
}

.engagement-detail-mobile-title {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--foreground);
}

.engagement-detail-mobile-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.engagement-detail-mobile-context {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-top: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 1px;
}

.engagement-detail-mobile-context::-webkit-scrollbar {
  display: none;
}

.engagement-detail-mobile-context-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  max-width: 72vw;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engagement-detail-mobile-context-chip:active {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

/* —— Prepared banner —— */
.engagement-detail-mobile-prepared {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px var(--edm-pad-x) 0;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #16a34a 24%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, #fff);
}

.engagement-detail-mobile-prepared-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  background: color-mix(in srgb, #16a34a 18%, #fff);
  color: #166534;
}

.engagement-detail-mobile-prepared-text {
  min-width: 0;
  flex: 1;
}

.engagement-detail-mobile-prepared-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #166534;
}

.engagement-detail-mobile-prepared-at {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

/* —— Scroll body —— */
.engagement-detail-mobile-body {
  flex: 1;
  padding: 8px var(--edm-pad-x) 12px;
  display: grid;
  gap: var(--edm-section-gap);
  align-content: start;
  min-width: 0;
  overflow-x: clip;
}

.engagement-detail-mobile-alert {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  border: 1px solid color-mix(in srgb, #dc2626 28%, var(--border));
  background: color-mix(in srgb, #dc2626 8%, #fff);
  color: #b91c1c;
}

/* —— Refine Prep section (flat, no nested card chrome) —— */
.engagement-detail-mobile-section {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  padding: 10px var(--edm-pad-x) 12px;
  background: #fff;
  min-width: 0;
}

.engagement-detail-mobile-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  min-width: 0;
}

.engagement-detail-mobile-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.engagement-detail-mobile-progress {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.engagement-detail-mobile-progress--complete {
  color: #166534;
  border-color: color-mix(in srgb, #16a34a 22%, var(--border));
  background: color-mix(in srgb, #16a34a 10%, #fff);
}

/* Legacy card classes (loading/error shells) */
.engagement-detail-mobile-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  padding: 10px var(--edm-pad-x);
  background: #fff;
  min-width: 0;
}

/* —— Drawers —— */
.engagement-detail-mobile-drawer {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}

.engagement-detail-mobile-drawer-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px var(--edm-pad-x);
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.engagement-detail-mobile-drawer-summary::-webkit-details-marker {
  display: none;
}

.engagement-detail-mobile-drawer-summary::after {
  content: "▾";
  font-size: 11px;
  color: var(--muted);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.engagement-detail-mobile-drawer[open] > .engagement-detail-mobile-drawer-summary::after {
  transform: rotate(180deg);
}

.engagement-detail-mobile-drawer-meta {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-align: right;
}

.engagement-detail-mobile-drawer-body {
  padding: 0 var(--edm-pad-x) 12px;
  display: grid;
  gap: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.engagement-detail-mobile-field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.engagement-detail-mobile-field > span:first-child {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.engagement-detail-mobile-field textarea,
.engagement-detail-mobile-field select,
.engagement-detail-mobile-field input {
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-family: inherit;
  background: #fff;
  line-height: 1.35;
}

.engagement-detail-mobile-field textarea {
  resize: vertical;
  min-height: 72px;
  max-height: 160px;
}

.engagement-detail-mobile-link-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  text-decoration: none;
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  min-width: 0;
}

.engagement-detail-mobile-link-row:active {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.engagement-detail-mobile-link-row span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engagement-detail-mobile-link-row span:last-child {
  flex-shrink: 0;
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 800;
}

.engagement-detail-mobile-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

/* Related opportunity — flatten nested panel chrome */
.engagement-detail-mobile-drawer-body > div[style] > div[style] {
  padding: 10px 12px !important;
  border-radius: 8px !important;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border)) !important;
  background: color-mix(in srgb, var(--foreground) 2%, #fff) !important;
}

.engagement-detail-mobile-drawer-body select {
  width: 100%;
  min-height: 40px;
  font-size: 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  padding: 8px 10px;
  font-family: inherit;
  background: #fff;
}

.engagement-detail-mobile-drawer-body button {
  min-height: 38px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

.engagement-detail-mobile-drawer-body a {
  font-size: 12px;
  font-weight: 800;
}

/* Refine Prep — tactical briefing editor */
.engagement-detail-mobile-section--refine-prep {
  padding: 0;
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
}

.engagement-detail-mobile-section--refine-prep .engagement-detail-mobile-section-head {
  padding: 10px var(--edm-pad-x) 8px;
  margin-bottom: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.engagement-detail-tactical-panel .edm-tactical-briefing,
.engagement-detail-mobile .edm-tactical-briefing {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.engagement-detail-tactical-panel .edm-tactical-playbook,
.engagement-detail-mobile .edm-tactical-playbook {
  padding: 8px var(--edm-pad-x);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.engagement-detail-tactical-panel .edm-tactical-section,
.engagement-detail-mobile .edm-tactical-section {
  padding: 9px var(--edm-pad-x) 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.engagement-detail-tactical-panel .edm-tactical-section:last-child,
.engagement-detail-mobile .edm-tactical-section:last-child {
  border-bottom: none;
}

.engagement-detail-tactical-panel .edm-tactical-section-head,
.engagement-detail-mobile .edm-tactical-section-head {
  margin-bottom: 6px;
}

.engagement-detail-tactical-panel .edm-tactical-section-title,
.engagement-detail-mobile .edm-tactical-section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--foreground);
}

.edm-tactical-section--ai-highlight {
  animation: edm-section-highlight 2.4s ease-out;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.edm-tactical-field--ai-highlight textarea {
  animation: edm-field-highlight 2.4s ease-out;
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

@keyframes edm-section-highlight {
  0% {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 50%, transparent);
  }
  100% {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 0%, transparent);
  }
}

@keyframes edm-field-highlight {
  0% {
    background: color-mix(in srgb, #16a34a 12%, #fff);
  }
  100% {
    background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  }
}

.engagement-detail-tactical-panel .pfm-ai-assist-wrap,
.engagement-detail-mobile .pfm-ai-assist-wrap {
  margin-bottom: 6px;
}

.engagement-detail-tactical-panel .pfm-ai-assist-applied,
.engagement-detail-mobile .pfm-ai-assist-applied {
  flex: 1 1 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #16a34a 32%, var(--border));
  background: color-mix(in srgb, #16a34a 7%, #fff);
}

.engagement-detail-tactical-panel .pfm-ai-assist-applied-revert,
.engagement-detail-mobile .pfm-ai-assist-applied-revert {
  margin-left: auto;
  min-height: 24px;
  padding: 2px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  color: var(--brand-700);
  cursor: pointer;
}

.edm-tactical-field-ai-badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-700);
}

.engagement-detail-tactical-panel .pfm-ai-assist,
.engagement-detail-mobile .pfm-ai-assist {
  margin: 4px 0 8px;
}

.engagement-detail-tactical-panel .edm-tactical-section-hint,
.engagement-detail-mobile .edm-tactical-section-hint {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 500;
}

.engagement-detail-tactical-panel .edm-tactical-section-body,
.engagement-detail-mobile .edm-tactical-section-body {
  display: grid;
  gap: 6px;
}

.engagement-detail-tactical-panel .edm-tactical-section-body--split,
.engagement-detail-mobile .edm-tactical-section-body--split {
  gap: 8px;
}

.engagement-detail-tactical-panel .edm-tactical-field,
.engagement-detail-mobile .edm-tactical-field {
  display: grid;
  gap: 4px;
  min-width: 0;
  width: 100%;
}

.engagement-detail-tactical-panel .edm-tactical-field-sublabel,
.engagement-detail-mobile .edm-tactical-field-sublabel {
  display: block;
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--muted);
}

.engagement-detail-tactical-panel .edm-tactical-field textarea,
.engagement-detail-mobile .edm-tactical-field textarea {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-family: inherit;
  line-height: 1.38;
  background: color-mix(in srgb, var(--surface, #f8fafc) 40%, #fff);
  resize: vertical;
  min-height: 44px;
  max-height: 120px;
  overflow-x: hidden;
  overflow-y: auto;
  overflow-wrap: break-word;
}

.engagement-detail-tactical-panel .edm-tactical-field textarea::placeholder,
.engagement-detail-mobile .edm-tactical-field textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 85%, transparent);
  font-weight: 500;
}

.engagement-detail-tactical-panel .edm-tactical-head h3,
.engagement-detail-mobile .edm-tactical-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

/* Legacy flat workflow fields (wizard / non-tactical) */
.engagement-detail-mobile .eng-workflow-fields {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.engagement-detail-mobile .eng-workflow-fields--compact {
  gap: 6px;
}

.engagement-detail-mobile .eng-workflow-field-label {
  font-size: 12px;
  font-weight: 800;
}

.engagement-detail-mobile .eng-workflow-field-helper {
  display: none;
}

.engagement-detail-mobile .eng-workflow-field textarea {
  min-height: 40px;
  max-height: 96px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 16px;
}

.engagement-detail-mobile .case-pre-call-plan-fields {
  gap: 6px;
}

.engagement-detail-mobile .case-pre-call-plan-fields label,
.engagement-detail-mobile .case-pre-call-plan-label {
  font-size: 12px;
  font-weight: 800;
}

.engagement-detail-mobile .case-pre-call-plan-field textarea {
  min-height: 40px;
  max-height: 96px;
  font-size: 16px;
  padding: 8px 10px;
  border-radius: 8px;
}

.engagement-detail-mobile .pcp-template-embedded {
  margin-bottom: 4px;
  min-width: 0;
}

.engagement-detail-mobile .pcp-template-embedded .pcp-template-body {
  padding: 0;
}

.engagement-detail-mobile .pcp-template-picker--wizard-minimal .pcp-template-search-wrap input {
  font-size: 16px;
  min-height: 40px;
}

.engagement-detail-mobile .pcp-template-actions-row button {
  min-height: 36px;
  font-size: 12px;
}

.engagement-detail-mobile .office-visit-360-plan > p {
  display: none;
}

.engagement-detail-mobile .office-visit-360-section {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.engagement-detail-mobile .office-visit-360-section-summary {
  padding: 8px 0;
  font-size: 12px;
  font-weight: 800;
}

.engagement-detail-mobile .office-visit-360-section-body {
  padding: 0 0 8px;
}

.engagement-detail-mobile .office-visit-360-section textarea {
  min-height: 40px;
  max-height: 96px;
  font-size: 16px;
}

/* —— Tactical action tray (compact sticky footer) —— */
.engagement-detail-mobile-footer-spacer {
  flex-shrink: 0;
  height: var(--edm-footer-h);
  pointer-events: none;
}

.edm-action-tray {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 4px var(--edm-pad-x) calc(4px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, #fff 97%, transparent);
  backdrop-filter: blur(10px);
  max-width: 100vw;
  box-shadow: 0 -2px 12px color-mix(in srgb, #000 5%, transparent);
}

.edm-action-tray-inner {
  display: flex;
  align-items: stretch;
  gap: 4px;
  min-height: 52px;
  max-height: 56px;
}

.edm-action-tray-primary {
  flex: 1.1 1 0;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.edm-action-tray-primary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edm-action-tray-primary-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edm-action-tray-seg {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 2px;
}

.edm-action-tray-seg-btn {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 2px 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--foreground);
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.edm-action-tray-seg-btn:active {
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
}

.edm-action-tray-seg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  color: var(--foreground);
}

.edm-action-tray-seg-label {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
}

.edm-action-tray-more-wrap {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}

.edm-action-tray-seg-btn--more[aria-expanded="true"] .edm-action-tray-seg-icon {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700);
}

.edm-action-tray-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 168px;
  max-width: min(240px, calc(100vw - 16px));
  padding: 4px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 14%, transparent);
  z-index: 60;
}

.edm-action-tray-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.edm-action-tray-menu-item:hover,
.edm-action-tray-menu-item:focus-visible {
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.edm-action-tray-primary:disabled,
.edm-action-tray-seg-btn:disabled,
.edm-action-tray-menu-item:disabled,
.edm-action-tray-primary[aria-disabled="true"],
.edm-action-tray-seg-btn[aria-disabled="true"],
.edm-action-tray-menu-item[aria-disabled="true"] {
  opacity: 0.55;
  pointer-events: none;
}

/* Outcome sheet */
.engagement-outcome-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, #000 35%, transparent);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.engagement-outcome-sheet {
  width: 100%;
  max-width: 520px;
  max-height: 85dvh;
  overflow: auto;
  border-radius: 16px 16px 0 0;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow: 0 -8px 32px color-mix(in srgb, #000 12%, transparent);
}

.engagement-outcome-sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.engagement-outcome-sheet-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.engagement-outcome-sheet-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.engagement-outcome-sheet-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.engagement-outcome-sheet-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.engagement-outcome-sheet-actions button {
  flex: 1;
  min-height: 42px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}

.engagement-outcome-sheet-actions button.primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

/* Narrow phones */
@media (max-width: 480px) {
  .engagement-detail-mobile {
    --edm-pad-x: 10px;
    --edm-footer-h: calc(58px + env(safe-area-inset-bottom, 0px));
  }

  .engagement-detail-mobile-title {
    font-size: 16px;
  }

  .engagement-detail-mobile-sub {
    font-size: 11px;
  }

  .engagement-detail-mobile-section {
    padding: 9px 10px 11px;
  }

  .engagement-detail-mobile .eng-workflow-field textarea {
    min-height: 36px;
    max-height: 80px;
  }

  .edm-action-tray-inner {
    min-height: 48px;
    max-height: 52px;
  }

  .edm-action-tray-primary {
    font-size: 12px;
  }

  .edm-action-tray-seg-icon {
    width: 26px;
    height: 26px;
  }

  .edm-action-tray-seg-label {
    font-size: 9px;
  }
}

/* ~400px: compact header, refine prep fits viewport */
@media (max-width: 430px) {
  .engagement-detail-mobile {
    --edm-pad-x: 8px;
    --edm-section-gap: 6px;
  }

  .engagement-detail-mobile-header {
    padding: 5px var(--edm-pad-x) 6px;
  }

  .engagement-detail-mobile-header-top {
    margin-bottom: 4px;
  }

  .engagement-detail-mobile-title {
    font-size: 14px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .engagement-detail-mobile-sub {
    font-size: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .engagement-detail-mobile-context {
    display: none;
  }

  .edm-op-banner {
    margin: 4px 0 6px;
    padding: 8px 10px;
  }

  .edm-op-banner-kicker {
    font-size: 8px;
  }

  .edm-op-banner-title {
    font-size: 12px;
  }

  .engagement-detail-mobile-body {
    padding: 6px var(--edm-pad-x) 8px;
    padding-bottom: calc(var(--edm-footer-h) + 8px);
  }

  .engagement-detail-mobile-section--refine-prep .engagement-detail-mobile-section-head {
    padding: 7px var(--edm-pad-x) 6px;
  }

  .engagement-detail-mobile-section-title {
    font-size: 11px;
  }

  .engagement-detail-mobile .edm-tactical-playbook {
    padding: 6px var(--edm-pad-x);
  }

  .engagement-detail-mobile .edm-tactical-section {
    padding: 7px var(--edm-pad-x) 8px;
  }

  .engagement-detail-mobile .edm-tactical-section-title {
    font-size: 11px;
  }

  .engagement-detail-mobile .edm-tactical-section-hint {
    font-size: 9px;
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .engagement-detail-mobile .edm-tactical-field textarea {
    min-height: 40px;
    max-height: 88px;
    padding: 7px 8px;
    font-size: 16px;
  }

  .engagement-detail-mobile .pfm-ai-assist {
    margin: 2px 0 5px;
    gap: 4px;
  }

  .engagement-detail-mobile .pfm-ai-assist-chip {
    font-size: 9px;
    padding: 2px 6px;
    min-height: 20px;
  }

  .engagement-detail-mobile .pcp-template-embedded,
  .engagement-detail-mobile .pcp-template-picker--wizard-minimal {
    min-width: 0;
    max-width: 100%;
    overflow-x: clip;
  }

  .engagement-detail-mobile .pcp-template-actions-row {
    flex-wrap: wrap;
    gap: 6px;
  }

  .edm-action-tray {
    padding: 3px var(--edm-pad-x) calc(3px + env(safe-area-inset-bottom, 0px));
  }

  .edm-action-tray-inner {
    min-height: 46px;
    max-height: 50px;
  }

}

/* Tablet: centered column */
@media (min-width: 481px) and (max-width: 768px) {
  .engagement-detail-mobile {
    --edm-pad-x: 14px;
  }
}

@media (min-width: 769px) {
  .engagement-detail-mobile {
    max-width: 440px;
    margin: 0 auto;
    border-left: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
    border-right: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  }

  .edm-action-tray {
    left: 50%;
    transform: translateX(-50%);
    width: min(440px, 100vw);
  }

  .engagement-detail-mobile-title {
    font-size: 18px;
    white-space: normal;
  }

  .engagement-detail-mobile-sub {
    white-space: normal;
  }
}

/* —— Simplified engagement record panel —— */
.engagement-record-panel {
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: 720px;
}

.engagement-record-header {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  display: grid;
  gap: 10px;
}

.engagement-record-type {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.engagement-record-header-grid,
.engagement-record-details-grid {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.engagement-record-header-grid dt,
.engagement-record-details-grid dt,
.engagement-record-linked-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted, #64748b);
}

.engagement-record-header-grid dd,
.engagement-record-details-grid dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.engagement-record-details,
.engagement-record-linked {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  display: grid;
  gap: 12px;
}

.engagement-record-section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted, #64748b);
}

.engagement-record-details-span {
  grid-column: 1 / -1;
}

.engagement-record-linked-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.engagement-record-linked-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
}

.engagement-record-link {
  color: var(--brand-700);
  font-weight: 700;
  text-decoration: none;
}

.engagement-record-link:hover {
  text-decoration: underline;
}

.engagement-record-muted {
  color: var(--muted, #64748b);
  font-size: 13px;
}

.engagement-record-panel--pathway-mission {
  max-width: 640px;
  gap: 18px;
}

.engagement-record-mission-intel,
.engagement-record-execution,
.engagement-record-edit {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  display: grid;
  gap: 12px;
}

.engagement-record-mission-intel {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.engagement-record-action-row--edit {
  gap: 8px;
}

.engagement-record-action--ghost {
  background: transparent;
  color: var(--brand-700);
  border: 1px dashed color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.engagement-record-action--ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.engagement-record-panel--empty-planned {
  max-width: 560px;
  gap: 18px;
}

.engagement-record-empty-head {
  display: grid;
  gap: 6px;
}

.engagement-record-empty-type {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.engagement-record-empty-status {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted, #64748b);
}

.engagement-record-empty-grid {
  margin: 0;
  display: grid;
  gap: 14px;
}

.engagement-record-empty-grid dt {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted, #64748b);
}

.engagement-record-empty-grid dd {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.45;
}

.engagement-record-next-step {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  display: grid;
  gap: 6px;
}

.engagement-record-next-step-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted, #64748b);
}

.engagement-record-next-step-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.engagement-record-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.engagement-record-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
}

.engagement-record-action--primary {
  background: var(--brand-600);
  color: #fff;
  border: 1px solid var(--brand-600);
}

.engagement-record-action--secondary {
  background: #fff;
  color: var(--brand-700);
  border: 1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.engagement-record-danger-zone {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.engagement-record-danger-btn {
  appearance: none;
  border: 1px solid color-mix(in srgb, #dc2626 28%, var(--border));
  background: color-mix(in srgb, #dc2626 6%, #fff);
  color: #b91c1c;
  border-radius: 8px;
  min-height: 44px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.engagement-record-danger-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #dc2626 10%, #fff);
}

.engagement-record-danger-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.engagement-detail-mobile-alert--muted {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
}

@media (max-width: 768px) {
  .engagement-record-action-row {
    flex-direction: column;
  }

  .engagement-record-action {
    width: 100%;
  }

  .engagement-record-panel {
    max-width: none;
    gap: 10px;
  }

  .engagement-detail-mobile .engagement-record-header {
    display: none;
  }

  .engagement-record-details,
  .engagement-record-linked {
    padding: 12px;
    border-radius: 10px;
    border-left: none;
    border-right: none;
  }

  .engagement-record-header-grid,
  .engagement-record-details-grid {
    grid-template-columns: 1fr;
  }
}
`;

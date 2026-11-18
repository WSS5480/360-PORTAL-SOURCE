export const prepareForMeetingMobileCss = `
.prepare-for-meeting-page {
  --pfm-pad-x: 10px;
  --pfm-section-gap: 6px;
  --pfm-footer-h: calc(56px + env(safe-area-inset-bottom, 0px));
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface, #f8fafc);
  overflow-x: clip;
  max-width: 100vw;
}

.prepare-for-meeting-page *,
.prepare-for-meeting-page *::before,
.prepare-for-meeting-page *::after {
  box-sizing: border-box;
}

.prepare-for-meeting-page--mission .prepare-for-meeting-header,
.prepare-for-meeting-page--briefing .prepare-for-meeting-header {
  position: static;
  top: auto;
  z-index: auto;
  padding: 4px var(--pfm-pad-x) 6px;
}

.prepare-for-meeting-header {
  position: sticky;
  top: 0;
  z-index: 40;
  flex-shrink: 0;
  padding: 6px var(--pfm-pad-x) 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, #fff 94%, transparent);
  backdrop-filter: blur(10px);
}

.prepare-for-meeting-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  margin-bottom: 4px;
}

.prepare-for-meeting-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.prepare-for-meeting-title-block {
  min-width: 0;
  flex: 1;
}

.prepare-for-meeting-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prepare-for-meeting-sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prepare-for-meeting-status-chip {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.2;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
}

.prepare-for-meeting-status-chip--prepared {
  border-color: color-mix(in srgb, #16a34a 28%, var(--border));
  background: color-mix(in srgb, #16a34a 10%, #fff);
  color: #166534;
}

.prepare-for-meeting-regenerate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.prepare-for-meeting-regenerate-btn:active:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
}

.prepare-for-meeting-regenerate-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Prepared banner + checklist */
.pfm-prepared-banner {
  border: 1px solid color-mix(in srgb, #16a34a 24%, var(--border));
  border-radius: 10px;
  padding: 8px var(--pfm-pad-x);
  background: color-mix(in srgb, #16a34a 6%, #fff);
}

.pfm-prepared-banner-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.pfm-prepared-banner-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  background: #16a34a;
  color: #fff;
  line-height: 1;
}

.pfm-prepared-banner-text {
  min-width: 0;
}

.pfm-prepared-banner-title {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #166534;
  line-height: 1.3;
}

.pfm-prepared-banner-at {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.35;
}

.pfm-prepared-checklist {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
}

.pfm-prepared-checklist-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  min-width: 0;
}

.pfm-prepared-checklist-item--done {
  color: #166534;
}

.pfm-prepared-checklist-mark {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.prepare-for-meeting-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--pfm-section-gap);
  padding: 6px var(--pfm-pad-x) 8px;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  overflow-x: clip;
}

/* Compact section shell — shared across prepare cards */
.pfm-snapshot,
.pfm-upcoming,
.pfm-glance,
.pfm-intel,
.pfm-activity,
.pfm-talking,
.pfm-goal,
.pfm-risks,
.pfm-next {
  min-width: 0;
  max-width: 100%;
  border-radius: 10px;
  padding: 8px var(--pfm-pad-x);
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: #fff;
  box-shadow: none;
}

.pfm-section-title,
.pfm-snapshot-title,
.pfm-upcoming-title,
.pfm-glance-title,
.pfm-intel-sub {
  margin: -2px 0 8px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.pfm-intel-title,
.pfm-activity-title,
.pfm-talking-title,
.pfm-goal-title,
.pfm-risks-title,
.pfm-next-title {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  line-height: 1.2;
}

.prepare-for-meeting-alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  background: color-mix(in srgb, var(--danger) 8%, #fff);
  color: var(--danger);
  border: 1px solid color-mix(in srgb, var(--danger) 20%, var(--border));
}

.prepare-for-meeting-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  padding: 12px 12px 10px;
  background: #fff;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
}

.prepare-for-meeting-card--accent {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.prepare-for-meeting-card-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

/* Provider snapshot — compact, no avatar */
.pfm-snapshot {
}

.pfm-snapshot-body {
  display: grid;
  gap: 2px;
}

.pfm-snapshot-name {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.pfm-snapshot-line {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.pfm-snapshot-line--org {
  color: var(--foreground);
  font-weight: 600;
}

.pfm-snapshot-line--location {
  font-size: 11px;
}

.pfm-snapshot-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.pfm-snapshot-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  color: var(--foreground);
  line-height: 1.2;
}

.pfm-snapshot-chip--brand {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
}

.pfm-snapshot-last-eng {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.pfm-snapshot-last-eng a {
  color: var(--brand-700);
  font-weight: 700;
  text-decoration: none;
}

.pfm-snapshot-profile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  max-width: 100%;
  margin-top: 8px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

/* Upcoming engagement — compact, action-oriented */
.pfm-upcoming {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
}

.pfm-upcoming-head {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}

.pfm-upcoming-chip {
  display: inline-flex;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.2;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--foreground);
}

.pfm-upcoming-chip--type {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-800);
  font-size: 10px;
}

.pfm-upcoming-chip--status {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.pfm-upcoming-datetime {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: var(--foreground);
}

.pfm-upcoming-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
}

.pfm-upcoming-org {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--muted);
}

.pfm-upcoming-opp {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  display: grid;
  gap: 2px;
}

.pfm-upcoming-opp-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.pfm-upcoming-opp a {
  color: var(--brand-700);
  font-weight: 700;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.pfm-upcoming-office {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.pfm-upcoming-office-label {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brand-700);
}

.pfm-upcoming-office-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pfm-upcoming-office-list li {
  display: grid;
  gap: 1px;
}

.pfm-upcoming-office-k {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.pfm-upcoming-office-v {
  font-size: 12px;
  line-height: 1.35;
  color: var(--foreground);
  word-break: break-word;
}

.pfm-upcoming-office-empty {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}

.pfm-upcoming-open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid color-mix(in srgb, var(--brand-600) 80%, black);
}

/* At a glance — compact 2×2 stat cards */
.pfm-glance {
}

.pfm-glance-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.pfm-glance-stat {
  display: grid;
  gap: 2px;
  padding: 8px 8px 7px;
  min-height: 0;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.pfm-glance-stat-value {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfm-glance-stat:nth-child(4) .pfm-glance-stat-value {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.pfm-glance-stat-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-glance-stat-link {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

/* Known intelligence — scannable bullets */
.pfm-intel {
}

.pfm-intel-bullets {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pfm-intel-bullets li {
  display: grid;
  gap: 2px;
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.pfm-intel-bullet-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-intel-bullet-value {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.pfm-intel-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.pfm-intel-inline-link {
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.pfm-intel-insight {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.pfm-intel-insight-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.pfm-intel-insight-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brand-700);
}

.pfm-intel-insight-meta {
  font-size: 9px;
  font-weight: 700;
  color: var(--muted);
}

.pfm-intel-insight-body {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
}

.pfm-intel-insight-body a {
  color: var(--brand-700);
  text-decoration: none;
}

/* Recent activity — compact rows */
.pfm-activity {
}

.pfm-activity-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.pfm-activity-title {
  margin: 0;
}

.pfm-activity-timeline-link {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
  flex-shrink: 0;
}

.pfm-activity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pfm-activity-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 14px;
  gap: 6px;
  align-items: center;
  padding: 6px 6px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  text-decoration: none;
  color: inherit;
}

.pfm-activity-row--static {
  grid-template-columns: 28px 1fr;
}

.pfm-activity-row:active {
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
}

.pfm-activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.pfm-activity-icon--engagement {
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.pfm-activity-icon--case {
  color: #0f766e;
  background: color-mix(in srgb, #0f766e 8%, #fff);
}

.pfm-activity-icon--opportunity {
  color: #7c3aed;
  background: color-mix(in srgb, #7c3aed 8%, #fff);
}

.pfm-activity-icon--note {
  color: var(--muted);
}

.pfm-activity-icon--product_discussion {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 10%, #fff);
}

.pfm-activity-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.pfm-activity-row-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}

.pfm-activity-row-title {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
  min-width: 0;
}

.pfm-activity-row-date {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
}

.pfm-activity-row-summary {
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfm-activity-chevron {
  font-size: 18px;
  font-weight: 700;
  color: var(--muted);
  line-height: 1;
  text-align: center;
}

.pfm-activity-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

/* Suggested talking points */
.pfm-talking {
}

.pfm-talking-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  min-width: 0;
}

.pfm-talking-title {
  margin: 0;
}

.pfm-talking-context {
  margin: 3px 0 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--brand-700);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.pfm-talking-copy-btn {
  flex-shrink: 0;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
}

.pfm-talking-copy-btn:active {
  background: color-mix(in srgb, var(--brand-600) 14%, #fff);
}

.pfm-talking-copy-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Copy success / error toast — fixed above footer (mobile + desktop) */
.pfm-toast-stack {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--pfm-footer-h, 56px) + 10px);
  z-index: 60;
  width: min(420px, calc(100vw - 20px));
  pointer-events: none;
}

.pfm-toast {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  text-align: center;
  box-shadow: 0 10px 28px color-mix(in srgb, #000 18%, transparent);
}

.pfm-toast--success {
  color: #f0fdf4;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #15803d 92%, #14532d),
    #166534
  );
  border: 1px solid color-mix(in srgb, #4ade80 40%, transparent);
}

.pfm-toast--error {
  color: #fff;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #b45309 90%, #92400e),
    #92400e
  );
  border: 1px solid color-mix(in srgb, #fbbf24 35%, transparent);
}

.pfm-toast--with-action {
  display: grid;
  gap: 8px;
  text-align: left;
  pointer-events: auto;
}

.pfm-toast-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: #14532d;
  background: #f0fdf4;
  border: 1px solid color-mix(in srgb, #4ade80 45%, transparent);
}

.pfm-toast--error .pfm-toast-action {
  color: #92400e;
  background: #fffbeb;
  border-color: color-mix(in srgb, #fbbf24 45%, transparent);
}

.pfm-talking-list {
  margin: 0;
  padding: 0 0 0 14px;
  display: grid;
  gap: 6px;
}

.pfm-talking-list li {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.pfm-talking-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.pfm-talking-inline-link {
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.pfm-talking-footnote,
.pfm-goal-footnote,
.pfm-risks-footnote,
.pfm-next-footnote {
  margin: 6px 0 0;
  font-size: 9px;
  color: var(--muted);
  line-height: 1.3;
}

/* Suggested goal */
.pfm-goal {
  border-color: color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
}

.pfm-goal-title {
  margin: 0 0 6px;
}

.pfm-goal-statement {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.pfm-goal-why {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pfm-goal-why-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--brand-700);
}

.pfm-goal-why-body {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-goal-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.pfm-goal-inline-link {
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

/* Risks / barriers */
.pfm-risks {
  border-color: color-mix(in srgb, #b45309 20%, var(--border));
  background: color-mix(in srgb, #b45309 4%, #fff);
}

.pfm-risks-title {
  color: #92400e;
}

.pfm-risks-list {
  margin: 0;
  padding: 0 0 0 14px;
  display: grid;
  gap: 6px;
}

.pfm-risks-list li {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.pfm-risks-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

/* Recommended next action */
.pfm-next {
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pfm-next-title {
  color: var(--brand-700);
}

.pfm-next-list {
  margin: 0;
  padding: 0 0 0 14px;
  display: grid;
  gap: 6px;
}

.pfm-next-list li {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.pfm-next-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.pfm-next-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  border: 1px solid var(--brand-600);
  max-width: 100%;
}

.pfm-next-cta:active {
  background: var(--brand-700);
}

.prepare-for-meeting-provider-name {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.prepare-for-meeting-meta-line {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.prepare-for-meeting-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.prepare-for-meeting-chip {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  color: var(--foreground);
}

.prepare-for-meeting-chip--status {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
}

.prepare-for-meeting-kv {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.prepare-for-meeting-kv li {
  display: grid;
  gap: 2px;
}

.prepare-for-meeting-kv-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.prepare-for-meeting-kv-value {
  font-size: 13px;
  line-height: 1.45;
  color: var(--foreground);
  word-break: break-word;
}

.prepare-for-meeting-bullets {
  margin: 0;
  padding: 0 0 0 16px;
  display: grid;
  gap: 6px;
}

.prepare-for-meeting-bullets li {
  font-size: 13px;
  line-height: 1.45;
  color: var(--foreground);
}

.prepare-for-meeting-goal {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--brand-800);
}

.prepare-for-meeting-action-callout {
  margin: 0;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  color: var(--brand-800);
}

.prepare-for-meeting-risk {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  background: color-mix(in srgb, var(--warning, #f59e0b) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 24%, var(--border));
  color: #92400e;
}

.prepare-for-meeting-risk + .prepare-for-meeting-risk {
  margin-top: 6px;
}

.prepare-for-meeting-activity {
  display: grid;
  gap: 8px;
}

.prepare-for-meeting-activity-item {
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.prepare-for-meeting-activity-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.prepare-for-meeting-activity-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}

.prepare-for-meeting-activity-title {
  font-size: 12px;
  font-weight: 800;
}

.prepare-for-meeting-activity-at {
  font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}

.prepare-for-meeting-activity-body {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.prepare-for-meeting-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.prepare-for-meeting-inline-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.prepare-for-meeting-footer-spacer {
  flex-shrink: 0;
  height: var(--pfm-footer-h);
  min-height: var(--pfm-footer-h);
  pointer-events: none;
}

.prepare-for-meeting-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  gap: 6px;
  padding: 8px var(--pfm-pad-x) calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, #fff 96%, transparent);
  backdrop-filter: blur(10px);
  max-width: 100vw;
  box-shadow: 0 -4px 16px color-mix(in srgb, #000 6%, transparent);
}

.prepare-for-meeting-footer--bar {
  align-items: stretch;
}

.prepare-for-meeting-footer-btn {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  font-family: inherit;
  line-height: 1.2;
}

.prepare-for-meeting-footer-btn--primary {
  flex: 1.25;
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

.prepare-for-meeting-footer--post-meeting .prepare-for-meeting-footer-btn--complete-call {
  flex: 1.45;
  order: -1;
  font-weight: 800;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.prepare-for-meeting-footer-btn--complete-call {
  border-color: color-mix(in srgb, #16a34a 40%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, #fff);
  color: #14532d;
}

.prepare-for-meeting-footer--post-meeting .prepare-for-meeting-footer-btn--complete-call.prepare-for-meeting-footer-btn--primary {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}

.prepare-for-meeting-footer--post-meeting .prepare-for-meeting-footer-btn--record-outcome {
  flex: 1.45;
  order: -1;
  font-weight: 800;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.prepare-for-meeting-footer-btn--record-outcome {
  border-color: color-mix(in srgb, #16a34a 40%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, #fff);
  color: #14532d;
}

.prepare-for-meeting-footer--post-meeting .prepare-for-meeting-footer-btn--record-outcome.prepare-for-meeting-footer-btn--primary {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}

.prepare-for-meeting-footer-btn--compact {
  flex: 0.75;
}

/* Tactical debrief sheet */
.pfm-debrief-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

.pfm-debrief-sheet {
  width: 100%;
  max-width: min(100%, 520px);
  height: 100dvh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 0;
  box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.18);
  animation: pfm-debrief-slide-up 0.32s ease-out;
}

.pfm-debrief-sheet--review {
  max-width: min(100%, 560px);
}

.pfm-debrief-context-banner {
  margin: 0 12px 8px;
  flex-shrink: 0;
}

.pfm-debrief-propagation {
  margin-bottom: 10px;
}

.pfm-debrief-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border);
}

.pfm-debrief-kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-700);
}

.pfm-debrief-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.pfm-debrief-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--muted);
}

.pfm-debrief-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--border) 40%, #fff);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.pfm-debrief-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 8px;
  -webkit-overflow-scrolling: touch;
}

.pfm-debrief-prompts {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pfm-debrief-prompts li {
  position: relative;
  padding-left: 14px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
}

.pfm-debrief-prompts li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--brand-600);
  font-weight: 900;
}

.pfm-debrief-compose {
  display: grid;
  gap: 8px;
}

.pfm-debrief-compose textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 148px;
  max-height: min(42dvh, 420px);
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  font-size: 15px;
  line-height: 1.45;
  font-family: inherit;
  resize: vertical;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  field-sizing: content;
}

.pfm-debrief-compose-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pfm-debrief-mic {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  color: var(--brand-700);
  cursor: pointer;
}

.pfm-debrief-mic--active {
  border-color: #dc2626;
  background: color-mix(in srgb, #dc2626 10%, #fff);
  color: #b91c1c;
  animation: pfm-debrief-mic-pulse 1.2s ease-in-out infinite;
}

.pfm-debrief-mic-icon {
  font-size: 11px;
  line-height: 1;
}

.pfm-debrief-mic-live {
  font-size: 11px;
  font-weight: 700;
  color: #b91c1c;
}

.pfm-debrief-compose-error {
  margin: 0;
  font-size: 11px;
  color: #b91c1c;
  line-height: 1.35;
}

@keyframes pfm-debrief-mic-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, #dc2626 0%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, #dc2626 18%, transparent);
  }
}

.pfm-debrief-processing {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 32px 16px 40px;
  text-align: center;
  min-height: 200px;
  align-content: center;
}

.pfm-debrief-processing-headline {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--foreground);
}

.pfm-debrief-processing-step {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  min-height: 1.35em;
  transition: opacity 0.2s ease;
}

.pfm-debrief-ops-review {
  display: grid;
  gap: 10px;
}

.pfm-debrief-ops-section {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface, #f8fafc) 35%, #fff);
  padding: 8px 10px 10px;
}

.pfm-debrief-ops-section--confirmed {
  border-color: color-mix(in srgb, #15803d 22%, var(--border));
  background: color-mix(in srgb, #15803d 5%, #fff);
}

.pfm-debrief-ops-section--where_this_updates {
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pfm-debrief-ops-section-title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.pfm-debrief-ops-lines {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pfm-debrief-ops-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--foreground);
}

.pfm-debrief-ops-marker {
  flex-shrink: 0;
  width: 16px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.35;
  text-align: center;
  color: #15803d;
}

.pfm-debrief-ops-line--partial .pfm-debrief-ops-marker {
  color: #b45309;
}

.pfm-debrief-ops-line--pending .pfm-debrief-ops-marker {
  color: var(--muted);
}

.pfm-debrief-ops-line--risk .pfm-debrief-ops-marker {
  color: #b91c1c;
}

.pfm-debrief-ops-line--opportunity .pfm-debrief-ops-marker,
.pfm-debrief-ops-line--action .pfm-debrief-ops-marker {
  color: var(--brand-700);
}

.pfm-debrief-ops-text {
  flex: 1;
  min-width: 0;
}

.pfm-debrief-conversation-result {
  display: grid;
  gap: 14px;
}

.pfm-debrief-conversation-result__head {
  display: grid;
  gap: 6px;
}

.pfm-debrief-conversation-result__kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-700);
}

.pfm-debrief-conversation-result__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.pfm-debrief-conversation-result__lead {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-debrief-conversation-result__card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--border) 18%, #fff);
}

.pfm-debrief-conversation-result__card--success {
  border-color: color-mix(in srgb, #059669 35%, var(--border));
  background: color-mix(in srgb, #059669 8%, #fff);
}

.pfm-debrief-conversation-result__card--neutral {
  border-color: color-mix(in srgb, var(--brand-700) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-700) 6%, #fff);
}

.pfm-debrief-conversation-result__card--negative {
  border-color: color-mix(in srgb, #dc2626 28%, var(--border));
  background: color-mix(in srgb, #dc2626 6%, #fff);
}

.pfm-debrief-conversation-result__label {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
}

.pfm-debrief-conversation-result__rationale {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-debrief-conversation-result__evidence {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
  font-style: italic;
}

.pfm-debrief-sheet--confirmed {
  max-height: min(92vh, 720px);
}

.pfm-debrief-confirm-head {
  margin-bottom: 14px;
}

.pfm-debrief-confirm-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
}

.pfm-debrief-confirm-sub {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-debrief-confirm-categories {
  display: grid;
  gap: 14px;
}

.pfm-debrief-confirm-category-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfm-debrief-confirm-lines {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.pfm-debrief-confirm-line {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.4;
}

.pfm-debrief-confirm-marker {
  flex-shrink: 0;
  width: 18px;
  font-weight: 800;
  text-align: center;
}

.pfm-debrief-confirm-line--confirmed .pfm-debrief-confirm-marker {
  color: #15803d;
}

.pfm-debrief-confirm-line--warning .pfm-debrief-confirm-marker {
  color: #b45309;
}

.pfm-debrief-confirm-line--new .pfm-debrief-confirm-marker {
  color: var(--brand-700);
}

.pfm-debrief-confirm-text {
  flex: 1;
  min-width: 0;
}

.pfm-debrief-confirm-propagation {
  margin-top: 16px;
}

.pfm-mission-zone-wrap.pfm-mission-zone--ai-highlight {
  animation: pfm-zone-highlight 2.4s ease-out;
  border-radius: 12px;
}

.prepare-for-meeting-body--intel-updated {
  animation: pfm-intel-body-highlight 2.6s ease-out;
}

@keyframes pfm-intel-body-highlight {
  0% {
    box-shadow: inset 0 0 0 0 color-mix(in srgb, #15803d 0%, transparent);
  }
  18% {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, #15803d 35%, transparent);
  }
  100% {
    box-shadow: inset 0 0 0 0 color-mix(in srgb, #15803d 0%, transparent);
  }
}

.pfm-debrief-processing-spinner {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 3px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  border-top-color: var(--brand-600);
  animation: pfm-debrief-spin 0.8s linear infinite;
}

@keyframes pfm-debrief-spin {
  to {
    transform: rotate(360deg);
  }
}

.pfm-debrief-analyze-summary {
  margin: 10px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.pfm-debrief-review-sections {
  display: grid;
  gap: 10px;
}

.pfm-debrief-review-section {
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface, #f8fafc) 40%, #fff);
  padding: 8px 10px 10px;
}

.pfm-debrief-review-section-title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.pfm-debrief-review-section-items {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--foreground);
}

.pfm-debrief-review-section-items li + li {
  margin-top: 4px;
}

.pfm-debrief-review-section-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  font-style: italic;
}

.pfm-debrief-review-section--suggested_system_updates {
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.pfm-debrief-system-review {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
}

.pfm-debrief-system-review-lead {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.pfm-debrief-system-checklist {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.pfm-debrief-system-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  cursor: pointer;
}

.pfm-debrief-conflict {
  margin: 6px 0 0 24px;
  padding: 8px;
  border-radius: 8px;
  background: color-mix(in srgb, #f59e0b 8%, #fff);
  border: 1px solid color-mix(in srgb, #f59e0b 25%, var(--border));
}

.pfm-debrief-conflict-line {
  margin: 0 0 4px;
  font-size: 10px;
  line-height: 1.35;
}

.pfm-debrief-conflict-kicker {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 9px;
}

.pfm-debrief-conflict-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.pfm-debrief-conflict-btn {
  min-height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 10px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}

.pfm-debrief-conflict-btn--secondary {
  background: color-mix(in srgb, var(--border) 30%, #fff);
}

.pfm-debrief-footer:has(.pfm-debrief-post-touch-footer) {
  flex-direction: column;
}

.pfm-debrief-footer:has(.pfm-debrief-footer-approval) {
  flex-direction: column;
}

.pfm-debrief-footer > .pfm-debrief-footer-approval {
  flex: 1 1 100%;
  min-width: 100%;
}

.pfm-debrief-footer-approval {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.pfm-debrief-footer-approval .pfm-debrief-footer-primary {
  width: 100%;
  flex: none;
}
.pfm-debrief-footer-secondary-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.pfm-debrief-footer-secondary-row .pfm-debrief-footer-secondary {
  flex: 1;
}

.pfm-debrief-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  background: #fff;
}

.pfm-debrief-footer-apply-selected {
  width: 100%;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}

.pfm-debrief-footer-secondary,
.pfm-debrief-footer-primary {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
}

.pfm-debrief-footer-secondary {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
}

.pfm-debrief-footer-primary {
  flex: 1.35;
  border: none;
  background: #15803d;
  color: #fff;
}

.pfm-debrief-footer-primary:disabled,
.pfm-debrief-footer-secondary:disabled,
.pfm-debrief-footer-apply-selected:disabled,
.pfm-debrief-mic:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pfm-debrief-post-touch {
  display: grid;
  gap: 12px;
}

.pfm-debrief-post-touch-progress {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  color: #15803d;
}

.pfm-debrief-post-touch-sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-debrief-post-touch-block {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 92%, #fff);
}

.pfm-debrief-post-touch-block--blockers {
  border-color: color-mix(in srgb, #b45309 35%, var(--border));
  background: color-mix(in srgb, #fef3c7 40%, var(--surface));
}

.pfm-debrief-post-touch-block--next {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.pfm-debrief-post-touch-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfm-debrief-post-touch-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.45;
}

.pfm-debrief-post-touch-next {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.pfm-debrief-confirm-categories--compact {
  gap: 8px;
}

.pfm-debrief-post-touch-footer {
  display: grid;
  gap: 10px;
  width: 100%;
}

.pfm-debrief-post-touch-footer .pfm-debrief-footer-primary {
  flex: unset;
  width: 100%;
}

.pfm-debrief-post-touch-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pfm-debrief-post-touch-action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  text-decoration: none;
  color: var(--text);
}

.pfm-debrief-post-touch-engagement-link {
  justify-self: center;
  font-size: 12px;
}

@media (min-width: 769px) {
  .pfm-debrief-backdrop {
    align-items: center;
    padding: 16px;
  }

  .pfm-debrief-sheet,
  .pfm-debrief-sheet--review {
    max-width: min(640px, 100%);
    height: auto;
    max-height: min(90dvh, 860px);
    border-radius: 14px;
    animation: pfm-debrief-fade-in 0.22s ease-out;
  }

  .pfm-debrief-review-sections {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .pfm-debrief-review-section--detected_signals,
  .pfm-debrief-review-section--suggested_system_updates {
    grid-column: 1 / -1;
  }
}

@keyframes pfm-debrief-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pfm-debrief-slide-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prepare-for-meeting-footer-btn--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.prepare-for-meeting-footer-cta {
  flex: 1.4;
}

.prepare-for-meeting-footer-icon {
  flex: 0.85;
  font-size: 11px;
}

.prepare-for-meeting-page--mission .prepare-for-meeting-footer-btn,
.prepare-for-meeting-page--briefing .prepare-for-meeting-footer-btn {
  min-height: 44px;
  font-size: 11px;
}

.prepare-for-meeting-footer a:not(.prepare-for-meeting-footer-btn),
.prepare-for-meeting-footer button:not(.prepare-for-meeting-footer-btn) {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  font-family: inherit;
  cursor: pointer;
}

.prepare-for-meeting-footer button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.prepare-for-meeting-footer .primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

.prepare-for-meeting-footer button.primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

/* Narrow phones (390–400px) */
@media (max-width: 480px) {
  .prepare-for-meeting-page {
    --pfm-pad-x: 10px;
    --pfm-section-gap: 6px;
  }

  .pfm-talking-head {
    flex-direction: column;
    align-items: stretch;
  }

  .pfm-talking-copy-btn {
    width: 100%;
  }

  .pfm-talking-footnote,
  .pfm-goal-footnote,
  .pfm-risks-footnote,
  .pfm-next-footnote {
    display: none;
  }

  .pfm-prepared-checklist {
    grid-template-columns: 1fr;
  }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 768px) {
  .prepare-for-meeting-page {
    --pfm-pad-x: 14px;
    --pfm-section-gap: 8px;
  }

  .prepare-for-meeting-title {
    font-size: 16px;
  }

  .prepare-for-meeting-body {
    padding-top: 8px;
    padding-bottom: 10px;
  }
}

/* Desktop — full-width workspace */
@media (min-width: 769px) {
  .prepare-for-meeting-page {
    --pfm-pad-x: clamp(20px, 3vw, 48px);
    --pfm-section-gap: 10px;
    width: 100%;
    max-width: none;
    margin: 0;
    border: none;
    min-height: 100dvh;
    background: var(--surface, #f8fafc);
  }

  .prepare-for-meeting-header {
    padding-left: var(--pfm-pad-x);
    padding-right: var(--pfm-pad-x);
  }

  .prepare-for-meeting-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-top: 10px;
    padding-bottom: 12px;
  }

  .prepare-for-meeting-body:not(.prepare-for-meeting-body--mission):not(.prepare-for-meeting-body--briefing) {
    padding-left: var(--pfm-pad-x);
    padding-right: var(--pfm-pad-x);
  }

  .prepare-for-meeting-footer {
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    padding-left: var(--pfm-pad-x);
    padding-right: var(--pfm-pad-x);
  }

  .pfm-toast-stack {
    width: min(420px, calc(100% - 48px));
    right: var(--pfm-pad-x);
  }

  .prepare-for-meeting-title {
    font-size: 20px;
    white-space: normal;
  }

  .prepare-for-meeting-sub {
    font-size: 12px;
    white-space: normal;
  }

  .pfm-glance-stat-value {
    font-size: 16px;
  }

  .pfm-glance-stat:nth-child(4) .pfm-glance-stat-value {
    white-space: normal;
  }

  .pfm-mission-today-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .pfm-today-cards {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
}

@media (min-width: 1024px) {
  .prepare-for-meeting-page--mission .pfm-mission,
  .prepare-for-meeting-page--briefing .pfm-mission {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(10.5rem, 14rem);
    column-gap: 18px;
    align-items: start;
  }

  .prepare-for-meeting-page--mission .pfm-mission > .pfm-scope-header,
  .prepare-for-meeting-page--briefing .pfm-mission > .pfm-scope-header,
  .prepare-for-meeting-page--mission .pfm-mission > .pfm-mission-reference,
  .prepare-for-meeting-page--briefing .pfm-mission > .pfm-mission-reference,
  .prepare-for-meeting-page--mission .pfm-mission > .pfm-mission-reference-links,
  .prepare-for-meeting-page--briefing .pfm-mission > .pfm-mission-reference-links {
    grid-column: 1 / -1;
  }

  .prepare-for-meeting-page--mission .pfm-mission-stack--primary,
  .prepare-for-meeting-page--briefing .pfm-mission-stack--primary,
  .prepare-for-meeting-page--mission .pfm-mission-stack--secondary,
  .prepare-for-meeting-page--briefing .pfm-mission-stack--secondary {
    grid-column: 1;
  }

  .prepare-for-meeting-page--mission .pfm-mission-stack--primary,
  .prepare-for-meeting-page--briefing .pfm-mission-stack--primary {
    grid-row: 2;
  }

  .prepare-for-meeting-page--mission .pfm-mission-stack--secondary,
  .prepare-for-meeting-page--briefing .pfm-mission-stack--secondary {
    grid-row: 3;
  }

  .prepare-for-meeting-page--mission .pfm-mission-stack--tertiary,
  .prepare-for-meeting-page--briefing .pfm-mission-stack--tertiary {
    grid-column: 2;
    grid-row: 2 / span 2;
    align-self: start;
  }

  .prepare-for-meeting-page--mission .pfm-field-briefing {
    grid-template-columns: minmax(0, 1fr) minmax(8.5rem, 10.5rem);
    column-gap: 20px;
  }

  .prepare-for-meeting-page--mission .pfm-briefing-doc {
    grid-template-columns: minmax(0, 1fr) minmax(8.5rem, 10rem);
    column-gap: 22px;
  }
}

/* —— Mission prep workspace —— */
.prepare-for-meeting-page--mission,
.prepare-for-meeting-page--briefing {
  --pfm-section-gap: 0;
  --pfm-footer-h: calc(56px + env(safe-area-inset-bottom, 0px));
  --pfm-header-h: 56px;
  --pfm-hero-bg: linear-gradient(152deg, #0a0f1a 0%, #0f172a 42%, #162033 100%);
  --pfm-hero-accent: #2563eb;
  --pfm-hero-muted: #94a3b8;
  --pfm-page-bg: #dfe5ed;
  background: var(--pfm-page-bg);
}

/* —— Field Briefing mission deck (Provider Overview parity) —— */
.pfm-mission-deck {
  position: relative;
  isolation: isolate;
  flex-shrink: 0;
  background: var(--pfm-hero-bg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 14px 44px rgba(15, 23, 42, 0.16);
}

.pfm-mission-deck::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 88% -10%, color-mix(in srgb, var(--pfm-hero-accent) 22%, transparent), transparent 58%),
    radial-gradient(ellipse 45% 40% at 4% 100%, color-mix(in srgb, var(--pfm-hero-accent) 10%, transparent), transparent 52%);
  z-index: 0;
}

.pfm-mission-deck__inner {
  position: relative;
  z-index: 1;
  max-width: var(--pfm-read-max, 100%);
  margin: 0 auto;
  width: 100%;
  padding: 4px var(--pfm-pad-x) 6px;
  box-sizing: border-box;
}

.pfm-mission-deck__bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 10px;
  flex-wrap: wrap;
}

.pfm-mission-deck__nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 0;
}

.pfm-mission-deck__identity {
  flex: 1 1 180px;
  min-width: 0;
}

.pfm-mission-deck__name {
  margin: 0;
  font-size: clamp(17px, 2.1vw, 22px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.pfm-mission-deck__visit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 3px;
}

.pfm-mission-deck__type {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: color-mix(in srgb, var(--pfm-hero-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--pfm-hero-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 12px color-mix(in srgb, var(--pfm-hero-accent) 30%, transparent);
}

.pfm-mission-deck__when {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}

.pfm-mission-deck__meta-chip {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pfm-mission-deck__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  flex: 0 1 auto;
  margin-left: auto;
}

.pfm-mission-deck .sales-cmd-mobile-menu {
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
}

.prepare-for-meeting-back--mission {
  margin-bottom: 0;
  color: color-mix(in srgb, var(--pfm-hero-accent) 72%, #fff);
}

.prepare-for-meeting-back--mission:hover {
  color: #fff;
}

.prepare-for-meeting-ready-btn--mission {
  color: #fff;
  background: linear-gradient(180deg, #16a34a, #15803d);
  border: 1px solid color-mix(in srgb, #16a34a 70%, #000);
  box-shadow: 0 4px 14px color-mix(in srgb, #16a34a 28%, transparent);
}

.prepare-for-meeting-ready-btn--mission:disabled {
  opacity: 0.7;
}

.prepare-for-meeting-refresh-link--mission {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.prepare-for-meeting-refresh-link--mission:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.pfm-mission-hero__kicker {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pfm-hero-muted);
}

.pfm-mission-hero__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.pfm-mission-hero__identity {
  min-width: 0;
  flex: 1 1 240px;
}

.pfm-mission-hero__name {
  margin: 0;
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.pfm-mission-hero__engagement {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 8px;
}

.pfm-mission-hero__engagement-type {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: color-mix(in srgb, var(--pfm-hero-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--pfm-hero-accent) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 18px color-mix(in srgb, var(--pfm-hero-accent) 35%, transparent);
}

.pfm-mission-hero__engagement-when {
  font-size: 13px;
  font-weight: 700;
  color: #cbd5e1;
}

.pfm-mission-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.pfm-mission-hero__meta-chip {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pfm-mission-hero__lead {
  margin: 8px 0 0;
  max-width: 52ch;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: #94a3b8;
}

.pfm-mission-hero__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.pfm-mission-hero__status-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pfm-hero-muted);
}

.pfm-mission-hero__status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-align: right;
  line-height: 1.25;
  white-space: nowrap;
}

@media (min-width: 720px) {
  .pfm-mission-deck__bar {
    flex-wrap: nowrap;
    align-items: center;
  }

  .pfm-mission-deck__identity {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .pfm-mission-deck__visit {
    margin-top: 0;
  }

  .pfm-mission-deck__actions {
    flex-shrink: 0;
  }
}

.pfm-mission-hero__status-pill--ready {
  color: #ecfdf5;
  background: color-mix(in srgb, #16a34a 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #16a34a 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 18px color-mix(in srgb, #16a34a 35%, transparent);
}

.pfm-mission-hero__status-pill--pending {
  color: #fef3c7;
  background: color-mix(in srgb, #d97706 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, #d97706 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 18px color-mix(in srgb, #d97706 30%, transparent);
}

.pfm-mission-command-zone {
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  overflow: hidden;
  margin: 12px var(--pfm-pad-x) 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.18);
  background: linear-gradient(165deg, #0a101a 0%, #111827 38%, #0f172a 100%);
}

.pfm-mission-command-zone::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 55% 70% at 100% 0%, color-mix(in srgb, var(--pfm-hero-accent) 16%, transparent), transparent 55%);
  z-index: 0;
}

.pfm-mission-command-zone__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pfm-mission-command-zone__head-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.pfm-mission-command-zone__status-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pfm-hero-accent) 85%, #fff);
  box-shadow: 0 0 12px color-mix(in srgb, var(--pfm-hero-accent) 65%, transparent);
}

.pfm-mission-command-zone__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.92);
}

.pfm-mission-command-zone__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
}

.pfm-mission-command-zone__body {
  position: relative;
  z-index: 1;
  padding: var(--pfm-rhythm-sm, 8px) var(--pfm-pad-x) var(--pfm-rhythm-mission, 22px);
  background: #fff;
}

.pfm-mission-command-zone__body .pfm-mission-zone-wrap {
  padding: 0;
}

.pfm-field-briefing .pfm-mission-command-zone.pfm-mission-stack--primary,
.pfm-briefing-doc .pfm-mission-command-zone.pfm-mission-stack--primary {
  padding: 0;
  background: linear-gradient(165deg, #0a101a 0%, #111827 38%, #0f172a 100%);
  border-bottom: none;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.18);
}

.pfm-field-briefing .pfm-mission-command-zone .pfm-mission-stack--primary,
.pfm-field-briefing .pfm-mission-command-zone.pfm-mission-stack--primary {
  background: transparent;
  border-bottom: none;
  box-shadow: none;
}

.pfm-field-briefing .pfm-mission-command-zone__body .pfm-mission-focus--primary,
.pfm-field-briefing .pfm-mission-command-zone__body .pfm-today-cards--primary,
.pfm-briefing-doc .pfm-mission-command-zone__body .pfm-mission-focus--primary {
  background: #fff;
}

.pfm-briefing-doc .pfm-mission-command-zone.pfm-mission-stack--primary {
  padding: 0;
}

.prepare-for-meeting-page--mission .pfm-mission-deck__inner,
.prepare-for-meeting-page--mission .prepare-for-meeting-body--mission,
.prepare-for-meeting-page--mission .prepare-for-meeting-footer--mission {
  max-width: var(--pfm-read-max);
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  box-sizing: border-box;
}

.prepare-for-meeting-page--mission .prepare-for-meeting-body--mission {
  padding-top: 4px;
  flex: 1;
}

.prepare-for-meeting-page--mission .pfm-mission-stack--primary {
  margin-top: 4px;
}

.prepare-for-meeting-page--mission .pfm-mission-stack--secondary {
  margin-top: 6px;
}

.prepare-for-meeting-page--mission .pfm-field-briefing {
  background: transparent;
}

.prepare-for-meeting-page--mission .pfm-mission-stack--primary,
.prepare-for-meeting-page--mission .pfm-mission-stack--secondary,
.prepare-for-meeting-page--mission .pfm-mission-stack--tertiary,
.prepare-for-meeting-page--mission .pfm-briefing-supplement {
  margin-left: var(--pfm-pad-x);
  margin-right: var(--pfm-pad-x);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, #0f172a 10%, var(--border));
  background: #fff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
}

.prepare-for-meeting-page--mission .pfm-mission-stack--tertiary {
  margin-top: 6px;
}

.prepare-for-meeting-page--mission .pfm-briefing-supplement {
  margin-top: 6px;
  margin-bottom: 6px;
}

.prepare-for-meeting-kicker {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--brand-700);
  line-height: 1.2;
}

.prepare-for-meeting-mission-lead {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.prepare-for-meeting-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.prepare-for-meeting-meta-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  color: var(--muted);
}

.prepare-for-meeting-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  min-width: 0;
}

.prepare-for-meeting-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.prepare-for-meeting-ready-btn {
  font-size: 11px;
  font-weight: 800;
  font-family: inherit;
  color: #166534;
  background: color-mix(in srgb, #16a34a 10%, #fff);
  border: 1px solid color-mix(in srgb, #16a34a 28%, var(--border));
  border-radius: 999px;
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.prepare-for-meeting-ready-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.prepare-for-meeting-header-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

.prepare-for-meeting-refresh-link {
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  color: var(--brand-700);
  background: none;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.prepare-for-meeting-refresh-link:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.prepare-for-meeting-scan-hint {
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 88%, transparent);
}

.prepare-for-meeting-body--mission,
.prepare-for-meeting-body--briefing {
  gap: 0;
  padding: 0;
  overflow-x: clip;
}

/* Scope header — folded by default (mission prep) */
.pfm-scope-header {
  flex-shrink: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  min-width: 0;
}

.pfm-scope-header--fold {
  max-height: none;
  overflow: visible;
}

.pfm-scope-header-summary {
  margin: 0;
  padding: 5px var(--pfm-pad-x);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.25;
  color: var(--muted);
  list-style: none;
  cursor: pointer;
  user-select: none;
}

.pfm-scope-header-summary::-webkit-details-marker {
  display: none;
}

.pfm-scope-header-summary::after {
  content: " ▾";
  font-weight: 700;
}

.pfm-scope-header--fold[open] .pfm-scope-header-summary::after {
  content: " ▴";
}

.pfm-scope-header-sub {
  margin: 0;
  padding: 0 var(--pfm-pad-x) 6px;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.32;
  color: var(--muted);
}

.pfm-brief {
  display: flex;
  flex-direction: column;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pfm-brief-block {
  padding: 10px var(--pfm-pad-x) 11px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.pfm-brief-block--why {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pfm-brief-block--risks {
  background: color-mix(in srgb, #f59e0b 5%, #fff);
}

.pfm-brief-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 6px;
}

.pfm-brief-step {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.pfm-brief-block-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.25;
  color: var(--text);
}

.pfm-brief-inline-action {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
}

.pfm-brief-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.pfm-brief-lead {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.pfm-brief-meta {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
}

.pfm-brief-meeting {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-800);
  line-height: 1.35;
}

.pfm-brief-goal {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text);
}

.pfm-brief-context {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.pfm-brief-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pfm-brief-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  color: var(--brand-800);
}

.pfm-brief-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 2px;
}

.pfm-brief-metric {
  min-width: 0;
  padding: 6px 4px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--surface, #f8fafc) 60%, #fff);
  text-align: center;
}

.pfm-brief-metric-value {
  display: block;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--text);
}

.pfm-brief-metric-label {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-brief-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}

.pfm-brief-list--numbered {
  padding-left: 1.25rem;
}

.pfm-brief-list--risks li {
  color: color-mix(in srgb, #b45309 85%, var(--text));
}

.pfm-brief-intel {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pfm-brief-intel li {
  display: grid;
  grid-template-columns: minmax(0, 34%) minmax(0, 1fr);
  gap: 6px;
  font-size: 12px;
  line-height: 1.35;
}

.pfm-brief-intel-k {
  font-weight: 700;
  color: var(--muted);
}

.pfm-brief-intel-v {
  color: var(--text);
  min-width: 0;
}

.pfm-brief-dl {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pfm-brief-dl li {
  display: grid;
  grid-template-columns: minmax(0, 38%) minmax(0, 1fr);
  gap: 6px;
  font-size: 12px;
  line-height: 1.35;
}

.pfm-brief-dl-k {
  font-weight: 700;
  color: var(--muted);
}

.pfm-brief-dl-v {
  color: var(--text);
}

.pfm-brief-foot {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.pfm-brief-foot a {
  color: var(--brand-700);
  font-weight: 600;
}

.pfm-brief-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.pfm-brief-empty--ok {
  color: color-mix(in srgb, #16a34a 70%, var(--muted));
}

.pfm-brief-empty a,
.pfm-brief-context a {
  color: var(--brand-700);
  font-weight: 600;
}

.pfm-brief-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  margin-top: 2px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600, #2563eb);
  border: 1px solid color-mix(in srgb, var(--brand-700) 40%, transparent);
  align-self: flex-start;
}

.pfm-brief-recent {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 8%, var(--border));
  padding-top: 8px;
}

.pfm-brief-recent a {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.pfm-brief-recent-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfm-brief-recent-date {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--muted);
}

@media (max-width: 480px) {
  .pfm-brief-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .pfm-brief-metric-value {
    font-size: 13px;
  }
}

/* Scan-first field briefing */
.pfm-brief--scan {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pfm-matters {
  padding: 8px var(--pfm-pad-x) 9px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 12%, #fff),
    color-mix(in srgb, var(--brand-600) 4%, #fff)
  );
  border-bottom: 2px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.pfm-matters-title {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--brand-800);
  line-height: 1.2;
}

.pfm-matters-lines {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pfm-matters-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1px;
  padding-left: 8px;
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.pfm-matters-row--relationship_risk {
  border-left-color: color-mix(in srgb, #f59e0b 55%, var(--border));
}

.pfm-matters-row--next_step_opportunity {
  border-left-color: color-mix(in srgb, #16a34a 45%, var(--border));
}

.pfm-matters-label {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-matters-value {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
}

.pfm-matters-row--relationship_risk .pfm-matters-value {
  color: color-mix(in srgb, #b45309 92%, var(--text));
}

.pfm-matters-row--next_step_opportunity .pfm-matters-value {
  color: color-mix(in srgb, #166534 90%, var(--text));
}

.pfm-scan-hero {
  padding: 8px var(--pfm-pad-x) 10px;
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  border-bottom: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.pfm-scan-hero-name {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfm-scan-hero-meta {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfm-scan-hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 4px;
}

.pfm-scan-hero-meeting {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-800);
  line-height: 1.3;
}

.pfm-scan-hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-top: 8px;
}

.pfm-scan-hero-cell {
  display: grid;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
  min-width: 0;
}

.pfm-scan-hero-cell--risk {
  border-color: color-mix(in srgb, #f59e0b 22%, var(--border));
  background: color-mix(in srgb, #f59e0b 4%, #fff);
}

.pfm-scan-kicker {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-scan-hero-value {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pfm-scan-hero-value--risk {
  color: color-mix(in srgb, #b45309 90%, var(--text));
  -webkit-line-clamp: 2;
}

.pfm-scan-hero-more {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.pfm-scan-hero-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: var(--muted);
}

.pfm-scan-hero-empty--ok {
  color: color-mix(in srgb, #16a34a 75%, var(--muted));
  font-weight: 700;
}

.pfm-scan-hero-empty a {
  color: var(--brand-700);
  font-weight: 700;
}

.pfm-scan-strip {
  padding: 8px var(--pfm-pad-x) 9px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.pfm-scan-strip--risks {
  padding-top: 6px;
  padding-bottom: 8px;
  background: color-mix(in srgb, #f59e0b 4%, #fff);
}

.pfm-scan-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
  min-width: 0;
}

.pfm-scan-strip-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
}

.pfm-scan-strip-count {
  font-size: 9px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: color-mix(in srgb, var(--muted) 80%, transparent);
}

.pfm-scan-ask-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pfm-scan-ask-list li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 6px;
  align-items: start;
}

.pfm-scan-ask-n {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.pfm-scan-ask-text {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.38;
  color: var(--text);
  min-width: 0;
}

.pfm-scan-risk-list {
  margin: 0;
  padding: 0 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, #b45309 88%, var(--text));
}

.pfm-scan-risk-list--more {
  margin-top: 6px;
  color: color-mix(in srgb, #b45309 75%, var(--text));
}

.pfm-scan-risk-list li + li {
  margin-top: 3px;
}

.pfm-scan-details {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--surface, #f8fafc) 50%, #fff);
}

.pfm-scan-details-summary {
  padding: 8px var(--pfm-pad-x);
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.pfm-scan-details-summary::-webkit-details-marker {
  display: none;
}

.pfm-scan-details-summary::after {
  content: " ▸";
  font-weight: 700;
  color: var(--muted);
}

.pfm-scan-details[open] .pfm-scan-details-summary::after {
  content: " ▾";
}

.pfm-scan-details-body {
  padding: 0 var(--pfm-pad-x) 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pfm-scan-detail-line {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--text);
}

.pfm-scan-detail-line--muted {
  color: var(--muted);
}

.pfm-scan-detail-line a {
  color: var(--brand-700);
  font-weight: 600;
}

.pfm-scan-next-more {
  margin: 0;
  padding-left: 14px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--text);
}

.pfm-scan-details-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.pfm-scan-details-links a {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.pfm-brief-metrics--compact {
  margin-top: 0;
}

.pfm-brief-metrics--compact .pfm-brief-metric {
  padding: 4px 2px;
}

.pfm-brief-metrics--compact .pfm-brief-metric-value {
  font-size: 12px;
}

.pfm-brief--scan .pfm-brief-recent {
  padding-top: 4px;
  margin-top: 0;
  border-top: none;
}

/* One-screen hero: 3-up grid on taller phones */
@media (min-height: 640px) and (max-width: 768px) {
  .pfm-scan-hero-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
  }

  .pfm-scan-hero-value {
    font-size: 11px;
    -webkit-line-clamp: 4;
  }
}

@media (max-width: 480px) {
  .prepare-for-meeting-page--mission .prepare-for-meeting-title,
  .prepare-for-meeting-page--briefing .prepare-for-meeting-title {
    font-size: 14px;
  }

  .prepare-for-meeting-page--mission .prepare-for-meeting-back,
  .prepare-for-meeting-page--briefing .prepare-for-meeting-back {
    min-height: 44px;
    margin-bottom: 2px;
  }

  .pfm-scan-hero {
    padding: 6px var(--pfm-pad-x) 8px;
  }

  .pfm-scan-hero-name {
    display: none;
  }

  .pfm-scan-hero-meta {
    display: none;
  }

  .pfm-scan-hero-chips {
    display: none;
  }

  .pfm-scan-hero-meeting {
    display: none;
  }

  .pfm-scan-strip {
    padding: 6px var(--pfm-pad-x) 7px;
  }
}

@media (min-width: 769px) {
  .pfm-scan-hero-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.pfm-support-zone {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface, #f8fafc) 70%, #fff);
}

.pfm-support-zone-label {
  margin: 0;
  padding: 6px var(--pfm-pad-x) 4px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.pfm-support-drawer {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pfm-support-drawer-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px var(--pfm-pad-x);
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.pfm-support-drawer-summary::-webkit-details-marker {
  display: none;
}

.pfm-support-drawer-summary::before {
  content: "▸";
  margin-right: 6px;
  font-size: 10px;
  color: var(--muted);
}

.pfm-support-drawer[open] .pfm-support-drawer-summary::before {
  content: "▾";
}

.pfm-support-drawer-title {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.pfm-support-drawer-meta {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  color: var(--muted);
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pfm-support-drawer-body {
  padding: 0 var(--pfm-pad-x) 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pfm-support-drawer-link {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.pfm-support-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 8px var(--pfm-pad-x) 10px;
}

.pfm-support-links a {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

/* Mission workspace — tactical zones */
.pfm-mission {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.pfm-mission-today {
  padding: 10px var(--pfm-pad-x) 10px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 14%, #fff),
    color-mix(in srgb, var(--brand-600) 5%, #fff)
  );
  border-bottom: 2px solid color-mix(in srgb, var(--brand-600) 30%, var(--border));
}

.pfm-mission-today-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.pfm-mission-tile {
  display: grid;
  gap: 3px;
  padding-left: 9px;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 40%, var(--border));
  min-width: 0;
}

.pfm-mission-tile-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-mission-tile-value {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.38;
  color: var(--foreground);
}

/* Editable tactical priorities cards */
.pfm-mission-today--editable .pfm-mission-zone-title {
  margin-bottom: 8px;
}

.pfm-today-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.pfm-today-card {
  display: grid;
  gap: 4px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.pfm-today-card:active:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
}

.pfm-today-card:disabled {
  opacity: 0.65;
  cursor: wait;
}

.pfm-today-card--empty .pfm-today-card-value {
  color: var(--muted);
  font-weight: 600;
  font-style: italic;
}

.pfm-today-card--relationship_risk {
  border-left: 3px solid color-mix(in srgb, #f59e0b 50%, var(--border));
}

.pfm-today-card--next_step_opportunity {
  border-left: 3px solid color-mix(in srgb, #16a34a 45%, var(--border));
}

.pfm-today-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.pfm-today-card-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  line-height: 1.2;
}

.pfm-today-card-edit {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1;
  color: var(--brand-700);
  opacity: 0.85;
}

.pfm-today-card-value {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.38;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pfm-today-card-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pfm-today-card-badge {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-700) 10%, transparent);
  border-radius: 999px;
  padding: 2px 8px;
}

.pfm-today-card--suggested {
  border-style: dashed;
}

.pfm-today-card-suggestion-actions {
  display: flex;
  gap: 8px;
  padding: 0 2px;
}

.pfm-today-card-suggestion-btn {
  border: none;
  background: transparent;
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
}

.pfm-today-card-suggestion-btn--accept {
  color: var(--foreground);
}

.pfm-today-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: color-mix(in srgb, #000 35%, transparent);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.pfm-today-sheet {
  width: 100%;
  max-width: 520px;
  max-height: 70dvh;
  overflow: auto;
  border-radius: 16px 16px 0 0;
  padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow: 0 -8px 32px color-mix(in srgb, #000 12%, transparent);
}

.pfm-today-sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.pfm-today-sheet-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.pfm-today-sheet-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.pfm-today-sheet-field {
  display: grid;
  gap: 6px;
}

.pfm-today-sheet-field > span {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.pfm-today-sheet-field textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 88px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 16px;
  font-family: inherit;
  line-height: 1.4;
  resize: vertical;
  overflow-x: hidden;
  overflow-wrap: break-word;
}

.pfm-today-sheet-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.pfm-today-sheet-actions button {
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

.pfm-today-sheet-actions button.primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
}

.pfm-today-sheet-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pfm-mission-zone {
  padding: 9px var(--pfm-pad-x) 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.pfm-mission-zone--asks {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pfm-today-head {
  margin-bottom: 0;
}

/* Inline AI assist — small chips, not a panel */
.pfm-ai-assist,
.edm-tactical-section .pfm-ai-assist {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 6px;
  padding: 0;
}

.pfm-ai-assist-chip {
  flex: 0 0 auto;
  min-height: 22px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px dashed color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  color: var(--brand-700);
  cursor: pointer;
  line-height: 1.2;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.pfm-ai-assist-chip:disabled {
  opacity: 0.5;
  cursor: wait;
}

.pfm-ai-assist-chip:active:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
}

.pfm-ai-assist-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
}

.pfm-ai-assist-applied {
  flex: 1 1 100%;
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #16a34a 32%, var(--border));
  background: color-mix(in srgb, #16a34a 7%, #fff);
  animation: pfm-ai-feedback-in 0.28s ease-out;
}

.pfm-ai-assist-applied-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pfm-ai-assist-applied-check {
  font-size: 11px;
  font-weight: 900;
  color: #15803d;
}

.pfm-ai-assist-applied-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.pfm-ai-assist-applied-badge {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  color: var(--brand-700);
}

.pfm-ai-assist-applied-badge--added {
  background: color-mix(in srgb, #16a34a 14%, #fff);
  color: #166534;
}

.pfm-ai-assist-applied-revert {
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

.pfm-ai-assist-applied-added {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pfm-ai-assist-diff {
  display: grid;
  gap: 6px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--text);
}

.pfm-ai-assist-diff--tighten {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 8px;
}

.pfm-ai-assist-diff-col ul {
  margin: 4px 0 0;
  padding-left: 14px;
}

.pfm-ai-assist-diff-col li + li {
  margin-top: 3px;
}

.pfm-ai-assist-diff-kicker {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.pfm-ai-assist-diff-before {
  text-decoration: line-through;
  color: var(--muted);
}

.pfm-ai-assist-diff-after {
  font-weight: 700;
  color: var(--foreground);
}

.pfm-ai-assist-diff-arrow {
  align-self: center;
  font-weight: 900;
  color: var(--muted);
}

.pfm-ai-assist-diff-goal {
  margin: 0;
  display: grid;
  gap: 2px;
}

.pfm-ai-assist-diff-note {
  margin: 0;
  color: var(--muted);
}

.pfm-mission-zone--ai-highlight {
  animation: pfm-zone-highlight 2.4s ease-out;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.pfm-today-card--ai-highlight {
  animation: pfm-card-highlight 2.4s ease-out;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 40%, transparent);
}

.pfm-today-card-ai-badge {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  color: var(--brand-700);
}

.pfm-ask-guide-row--ai-new {
  animation: pfm-ask-slide-in 0.45s ease-out;
  background: color-mix(in srgb, #16a34a 10%, #fff);
}

.pfm-ask-guide-row--ai-changed {
  animation: pfm-zone-highlight 2.4s ease-out;
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.pfm-ask-guide-badge--added {
  background: color-mix(in srgb, #16a34a 14%, #fff);
  color: #166534;
}

.pfm-ask-guide-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #15803d;
  padding: 2px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, #16a34a 14%, #fff);
}

.pfm-ask-guide-badge--changed {
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
}

@keyframes pfm-ai-feedback-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pfm-zone-highlight {
  0% {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 55%, transparent);
  }
  100% {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--brand-600) 0%, transparent);
  }
}

@keyframes pfm-card-highlight {
  0% {
    background: color-mix(in srgb, var(--brand-600) 14%, #fff);
  }
  100% {
    background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  }
}

@keyframes pfm-ask-slide-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pfm-mission-zone--risks {
  background: color-mix(in srgb, #f59e0b 5%, #fff);
}

.pfm-mission-zone--next {
  background: color-mix(in srgb, #16a34a 5%, #fff);
  border-bottom-width: 2px;
  border-bottom-color: color-mix(in srgb, #16a34a 22%, var(--border));
}

.pfm-mission-zone-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  min-width: 0;
}

.pfm-mission-zone-title {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
}

.pfm-mission-zone--next .pfm-mission-zone-title {
  color: color-mix(in srgb, #166534 85%, var(--muted));
}

.pfm-mission-zone-count {
  font-size: 9px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  color: color-mix(in srgb, var(--muted) 75%, transparent);
}

.pfm-ask-guide-head {
  margin-bottom: 4px;
}

.pfm-ask-guide-copy-all {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  font-family: inherit;
  color: var(--brand-700);
  background: transparent;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pfm-ask-guide-copy-all:disabled {
  opacity: 0.55;
  cursor: wait;
}

.pfm-ask-guide {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pfm-ask-guide-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 6px 8px;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pfm-ask-guide-row:active {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.pfm-ask-guide-row--copied {
  border-color: color-mix(in srgb, #16a34a 30%, var(--border));
  background: color-mix(in srgb, #16a34a 6%, #fff);
}

.pfm-ask-guide-num {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 900;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.pfm-ask-guide-q {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pfm-ask-guide-copy-hint {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.pfm-ask-zone-hint {
  margin: 0 0 6px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.pfm-ask-generate-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0 4px;
}

.pfm-ask-generate-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfm-ask-generate-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pfm-ask-add-custom {
  align-self: flex-start;
  margin: 2px 0 6px;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 800;
  font-family: inherit;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pfm-ask-add-custom:disabled {
  opacity: 0.5;
  cursor: wait;
}

.pfm-ask-guide--structured {
  gap: 6px;
}

.pfm-ask-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  position: relative;
}

.pfm-ask-row--copied {
  border-color: color-mix(in srgb, #16a34a 30%, var(--border));
  background: color-mix(in srgb, #16a34a 6%, #fff);
}

.pfm-ask-row--answered,
.pfm-ask-row--handled {
  opacity: 0.92;
}

.pfm-ask-row--later {
  border-style: dashed;
}

.pfm-ask-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px 6px 8px;
  margin: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pfm-ask-row-main:active {
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.pfm-ask-row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pfm-ask-source-tag {
  align-self: flex-start;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
}

.pfm-ask-source-tag--ai {
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.pfm-ask-source-tag--custom {
  color: color-mix(in srgb, #7c3aed 90%, var(--foreground));
  background: color-mix(in srgb, #7c3aed 8%, #fff);
  border: 1px solid color-mix(in srgb, #7c3aed 22%, var(--border));
}

.pfm-ask-status-tag {
  font-size: 9px;
  font-weight: 700;
  color: var(--muted);
}

.pfm-ask-overflow-btn {
  flex-shrink: 0;
  width: 36px;
  min-height: 44px;
  margin: 0;
  padding: 0;
  border: none;
  border-left: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  font-size: 16px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
}

.pfm-ask-overflow-btn:disabled {
  opacity: 0.5;
}

.pfm-ask-menu-wrap {
  position: absolute;
  right: 4px;
  top: calc(100% + 2px);
  z-index: 20;
}

.pfm-ask-menu {
  margin: 0;
  padding: 4px 0;
  list-style: none;
  min-width: 200px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--foreground) 12%, transparent);
}

.pfm-ask-menu button {
  display: block;
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--foreground);
  cursor: pointer;
}

.pfm-ask-menu button:hover {
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.pfm-ask-menu--muted {
  color: var(--muted) !important;
  font-size: 11px !important;
}

.pfm-ask-menu--danger {
  color: #b91c1c !important;
}

.pfm-ask-menu-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--border);
  list-style: none;
}

.pfm-ask-handled {
  margin-top: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pfm-ask-handled-summary {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  list-style: none;
}

.pfm-ask-handled-summary::-webkit-details-marker {
  display: none;
}

.pfm-ask-handled-list {
  margin: 0;
  padding: 0 10px 8px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pfm-ask-handled-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pfm-ask-handled-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pfm-ask-handled-q {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 75%, transparent);
}

.pfm-ask-handled-status {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.pfm-ask-handled-answer {
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  font-style: italic;
}

.pfm-ask-quick-sheet textarea {
  font-size: 16px;
}

.pfm-ask-guide-row--copied .pfm-ask-guide-copy-hint {
  color: #166534;
}

.pfm-mission-risks {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: color-mix(in srgb, #b45309 90%, var(--foreground));
}

.pfm-mission-risks--more {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.pfm-mission-risks li + li {
  margin-top: 4px;
}

.pfm-mission-next-list {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pfm-mission-next-list li {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.38;
  color: var(--foreground);
  padding-left: 10px;
  border-left: 2px solid color-mix(in srgb, #16a34a 35%, var(--border));
}

.pfm-mission-next-lead {
  font-size: 13px;
  font-weight: 800;
  color: color-mix(in srgb, #166534 92%, var(--foreground));
  border-left-width: 3px;
}

.pfm-mission-next-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid var(--brand-600);
}

.pfm-mission-next-cta:active {
  filter: brightness(0.95);
}

.pfm-mission-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.pfm-mission-empty--ok {
  color: color-mix(in srgb, #16a34a 80%, var(--muted));
  font-weight: 700;
}

.pfm-mission-empty a {
  color: var(--brand-700);
  font-weight: 700;
}

.pfm-mission-reference--secondary {
  margin-top: 2px;
}

.pfm-mission-reference {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface, #f8fafc) 80%, #fff);
  flex-shrink: 0;
}

.pfm-mission-reference-summary {
  padding: 8px var(--pfm-pad-x);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.pfm-mission-reference-summary::-webkit-details-marker {
  display: none;
}

.pfm-mission-reference-summary::after {
  content: " ▾";
  font-weight: 700;
}

.pfm-mission-reference[open] .pfm-mission-reference-summary::after {
  content: " ▴";
}

.pfm-mission-reference-body {
  padding: 0;
}

.pfm-reference-flags-group + .pfm-reference-flags-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pfm-reference-flags-kicker {
  margin: 0 0 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfm-mission-reference-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 10px var(--pfm-pad-x);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pfm-mission-reference-links a {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

@media (min-height: 680px) and (max-width: 768px) {
  .pfm-mission-today-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .pfm-today-cards {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .prepare-for-meeting-page--mission .prepare-for-meeting-title {
    font-size: 15px;
  }

  .pfm-mission-tile-value {
    font-size: 12px;
  }

  .pfm-ask-guide-q {
    font-size: 12px;
  }
}

/* Narrow mobile (~400px): above-fold essentials, no overflow */
@media (max-width: 430px) {
  .prepare-for-meeting-page--mission,
  .prepare-for-meeting-page--briefing {
    --pfm-pad-x: 8px;
    --pfm-footer-h: calc(50px + env(safe-area-inset-bottom, 0px));
  }

  .prepare-for-meeting-page--mission .prepare-for-meeting-header,
  .prepare-for-meeting-page--briefing .prepare-for-meeting-header {
    padding: 3px var(--pfm-pad-x) 5px;
  }

  .prepare-for-meeting-page--mission .prepare-for-meeting-kicker {
    display: none;
  }

  .prepare-for-meeting-header-top {
    margin-bottom: 2px;
    gap: 4px;
  }

  .prepare-for-meeting-header-nav .prepare-for-meeting-back {
    margin-bottom: 0;
    min-height: 26px;
    font-size: 11px;
  }

  .prepare-for-meeting-header-actions {
    gap: 6px;
  }

  .prepare-for-meeting-ready-btn {
    padding: 3px 8px;
    font-size: 10px;
  }

  .prepare-for-meeting-refresh-link {
    font-size: 10px;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .prepare-for-meeting-title-row {
    gap: 6px;
    align-items: center;
  }

  .prepare-for-meeting-title {
    font-size: 14px;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }

  .prepare-for-meeting-sub {
    font-size: 10px;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .prepare-for-meeting-meta-chips {
    margin-top: 3px;
    gap: 3px;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .prepare-for-meeting-meta-chips::-webkit-scrollbar {
    display: none;
  }

  .prepare-for-meeting-meta-chip {
    flex-shrink: 0;
    font-size: 9px;
    padding: 2px 6px;
  }

  .prepare-for-meeting-status-chip {
    font-size: 8px;
    padding: 2px 6px;
    max-width: 44%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .prepare-for-meeting-footer-spacer {
    height: var(--pfm-footer-h);
    min-height: var(--pfm-footer-h);
  }

  .prepare-for-meeting-footer {
    padding: 6px var(--pfm-pad-x) calc(6px + env(safe-area-inset-bottom, 0px));
    gap: 5px;
  }

  .prepare-for-meeting-footer-btn {
    min-height: 36px;
    font-size: 10px;
    padding: 0 4px;
  }

  .pfm-scope-header-summary {
    padding: 4px var(--pfm-pad-x);
    font-size: 9px;
  }

  .pfm-mission-today {
    padding: 6px var(--pfm-pad-x) 7px;
  }

  .pfm-mission-today--editable .pfm-mission-zone-title {
    margin-bottom: 4px;
    font-size: 9px;
  }

  .pfm-today-head {
    margin-bottom: 2px;
  }

  .pfm-today-cards {
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }

  .pfm-today-card {
    padding: 5px 7px;
    border-radius: 8px;
    min-width: 0;
  }

  .pfm-today-card-label {
    font-size: 8px;
    letter-spacing: 0.04em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pfm-today-card-value {
    font-size: 11px;
    line-height: 1.32;
    -webkit-line-clamp: 2;
    overflow-wrap: anywhere;
  }

  .pfm-ai-assist {
    margin-bottom: 4px;
    gap: 4px;
  }

  .pfm-ai-assist-chip {
    font-size: 9px;
    padding: 2px 6px;
    min-height: 20px;
  }

  .pfm-mission-zone {
    padding: 6px var(--pfm-pad-x) 7px;
  }

  .pfm-mission-zone-head {
    margin-bottom: 4px;
    gap: 4px;
    flex-wrap: wrap;
  }

  .pfm-mission-zone-title {
    font-size: 9px;
  }

  .pfm-ask-guide-row {
    padding: 5px 6px;
    gap: 5px;
    grid-template-columns: 18px minmax(0, 1fr) auto;
  }

  .pfm-ask-guide-num {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .pfm-ask-guide-q {
    font-size: 11px;
    -webkit-line-clamp: 2;
  }

  .pfm-ask-guide-copy-hint {
    font-size: 8px;
  }

  .pfm-mission-risks,
  .pfm-mission-next-list {
    font-size: 12px;
    padding-left: 12px;
  }

  .pfm-mission-empty {
    font-size: 11px;
    line-height: 1.35;
  }

  .pfm-mission,
  .pfm-mission-reference,
  .pfm-support-drawer {
    min-width: 0;
    max-width: 100%;
  }

  .pfm-support-drawer-summary {
    min-width: 0;
  }

  .pfm-support-drawer-title,
  .pfm-support-drawer-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pfm-today-sheet {
    max-height: min(65dvh, 520px);
    padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .pfm-today-sheet-field textarea {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    font-size: 16px;
    line-height: 1.35;
    resize: none;
    min-height: 72px;
    max-height: 28dvh;
  }
}

/* —— Field briefing execution workspace (hierarchy polish) —— */
.prepare-for-meeting-page--mission {
  --pfm-read-max: 54rem;
  --pfm-footer-h: calc(50px + env(safe-area-inset-bottom, 0px));
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) {
  /* Centered editorial container (1150–1250px) */
  --pfm-read-max: 74rem; /* ~1184px */
}

@media (min-width: 1280px) {
  .prepare-for-meeting-page--mission {
    --pfm-read-max: 56rem;
  }

  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) {
    --pfm-read-max: 78rem; /* ~1248px */
  }
}

.pfm-mission--execution {
  gap: 0;
}

.pfm-field-briefing {
  --pfm-brief-content: min(48ch, 100%);
  --pfm-rhythm-xs: 4px;
  --pfm-rhythm-sm: 8px;
  --pfm-rhythm-md: 14px;
  --pfm-rhythm-lg: 20px;
  --pfm-rhythm-mission: 22px;
  --pfm-rhythm-unknowns: 12px;
}

@media (min-width: 768px) {
  .pfm-field-briefing {
    --pfm-brief-content: 50ch;
  }
}

@media (min-width: 1024px) {
  .pfm-field-briefing {
    --pfm-brief-content: 52ch;
  }
}

.pfm-mission-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.pfm-mission-stack--primary {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-600) 5%, #fff),
    #fff 72%
  );
  border-bottom: none;
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--brand-600) 8%, var(--border));
}

.pfm-field-briefing .pfm-mission-stack--primary {
  background: color-mix(in srgb, var(--brand-600) 3.5%, #fff);
  box-shadow: none;
  padding: 6px var(--pfm-pad-x) 10px;
}

.pfm-field-briefing .pfm-mission-stack--primary,
.pfm-field-briefing .pfm-mission-stack--secondary {
  padding-left: var(--pfm-pad-x);
  padding-right: var(--pfm-pad-x);
}

.pfm-field-briefing .pfm-mission-stack--secondary {
  box-shadow: none;
  padding-top: 6px;
  padding-bottom: 6px;
}

.pfm-mission-stack--secondary {
  padding-bottom: 4px;
  border-bottom: none;
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pfm-mission-stack--tertiary {
  padding: 6px var(--pfm-pad-x) 8px;
  background: transparent;
  border-bottom: none;
  gap: 8px;
}

.pfm-mission-focus {
  padding: 10px var(--pfm-pad-x) 10px;
  border: none;
  background: transparent;
}

.pfm-field-briefing .pfm-mission-focus {
  padding: 8px 0;
}

.pfm-mission-focus--primary {
  padding-top: 10px;
  padding-bottom: 10px;
}

.pfm-field-briefing .pfm-mission-focus--primary {
  padding: 6px 0 4px 14px;
  margin: 0;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 52%, var(--border));
}

.pfm-field-briefing .pfm-mission-focus--primary .pfm-mission-focus-title {
  font-size: 9px;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
  color: var(--brand-800);
}

.pfm-field-briefing .pfm-mission-focus--primary .pfm-mission-focus-kicker {
  font-size: 9px;
  margin-bottom: 8px;
  max-width: var(--pfm-brief-content);
  color: color-mix(in srgb, var(--muted) 85%, var(--foreground));
}

.pfm-field-briefing .pfm-today-cards--primary .pfm-today-card-value {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.022em;
  max-width: none;
  -webkit-line-clamp: unset;
}

.pfm-field-briefing .pfm-today-cards--primary .pfm-today-card-edit {
  top: 3px;
  opacity: 0.35;
}

.pfm-mission-focus--primary .pfm-mission-focus-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--brand-700);
  line-height: 1.15;
}

.pfm-mission-focus--primary .pfm-mission-focus-kicker {
  margin: 2px 0 0;
  font-size: 10px;
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
  line-height: 1.32;
  max-width: 36ch;
}

.pfm-mission-focus--secondary {
  padding-top: 6px;
  padding-bottom: 4px;
}

.pfm-mission-focus--secondary .pfm-mission-focus-title {
  margin: 0;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.pfm-mission-focus-head {
  margin-bottom: 4px;
}

.pfm-mission-stack--secondary > * + * {
  margin-top: 2px;
}

.pfm-today-cards--primary {
  display: block;
  max-width: 36ch;
}

.pfm-field-briefing .pfm-today-cards--primary,
.pfm-field-briefing .pfm-today-cards--secondary,
.pfm-field-briefing .pfm-touch-queue-list,
.pfm-field-briefing .pfm-mission-asks-tools,
.pfm-field-briefing .pfm-mission-focus--primary .pfm-ai-assist-wrap {
  max-width: var(--pfm-brief-content);
}

.pfm-today-cards--primary .pfm-today-card {
  border: none;
  border-radius: 0;
  padding: 0 22px 0 0;
  background: transparent;
  position: relative;
  transition: opacity 0.15s ease;
}

.pfm-today-cards--primary .pfm-today-card:hover:not(:disabled) {
  opacity: 0.9;
}

.pfm-today-cards--primary .pfm-today-card-value {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.28;
  letter-spacing: -0.015em;
  -webkit-line-clamp: 4;
  max-width: 36ch;
}

.pfm-today-cards--primary .pfm-today-card-edit {
  position: absolute;
  right: 0;
  top: 1px;
  font-size: 11px;
  opacity: 0.45;
  transition: opacity 0.15s ease;
}

.pfm-today-cards--primary .pfm-today-card:hover .pfm-today-card-edit {
  opacity: 0.85;
}

.pfm-today-cards--secondary {
  gap: 3px;
  max-width: 36ch;
}

.pfm-today-cards--secondary .pfm-today-card {
  border: none;
  border-radius: 6px;
  padding: 5px 20px 5px 6px;
  background: color-mix(in srgb, var(--foreground) 2.5%, #fff);
  position: relative;
  transition: background 0.15s ease;
}

.pfm-field-briefing .pfm-mission-focus--secondary {
  padding: 8px 0 10px 12px;
  margin: 0 0 var(--pfm-rhythm-xs);
  border-left: 2px solid color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.pfm-field-briefing .pfm-mission-focus--secondary .pfm-mission-focus-title {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--brand-700);
  margin-bottom: 5px;
}

.pfm-field-briefing .pfm-today-cards--secondary .pfm-today-card-value {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.36;
  color: color-mix(in srgb, var(--foreground) 94%, var(--muted));
}

.pfm-field-briefing .pfm-today-cards--secondary .pfm-today-card {
  border-radius: 0;
  padding: 5px 18px 5px 0;
  background: transparent;
}

.pfm-field-briefing .pfm-today-cards--secondary .pfm-today-card + .pfm-today-card {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 3%, var(--border));
}

.pfm-field-briefing .pfm-today-cards--secondary .pfm-today-card:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 2%, transparent);
}

.pfm-today-cards--secondary .pfm-today-card:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pfm-today-cards--secondary .pfm-today-card-value {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.34;
  -webkit-line-clamp: 2;
}

.pfm-mission-focus--primary .pfm-ai-assist-wrap {
  margin: 0 0 6px;
  max-width: 36ch;
}

.pfm-mission-focus--primary .pfm-ai-assist-chip {
  font-size: 9px;
  padding: 3px 7px;
  min-height: 20px;
  border-color: color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  color: color-mix(in srgb, var(--foreground) 65%, var(--muted));
}

.pfm-mission-asks {
  padding: 6px var(--pfm-pad-x) 8px;
  border: none;
  background: transparent;
}

.pfm-field-briefing .pfm-mission-asks {
  padding: 4px 0 6px;
}

.pfm-mission-asks .pfm-mission-zone-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

/* —— Live-touch question queue (Field Briefing) —— */
.pfm-touch-queue-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.pfm-touch-queue-head-copy {
  min-width: 0;
  flex: 1;
}

.pfm-touch-queue-kicker {
  margin: 1px 0 0;
  font-size: 10px;
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 88%, transparent);
  line-height: 1.3;
  max-width: 36ch;
}

.pfm-touch-queue-copy-all {
  flex-shrink: 0;
  margin: 1px 0 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
  color: color-mix(in srgb, var(--muted) 92%, var(--brand-700));
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: color-mix(in srgb, var(--foreground) 12%, transparent);
}

.pfm-touch-queue-copy-all:hover:not(:disabled) {
  color: var(--brand-700);
}

.pfm-touch-queue-copy-all:disabled {
  opacity: 0.45;
  cursor: wait;
}

.pfm-touch-queue-list {
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  max-width: 42ch;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pfm-field-briefing .pfm-touch-queue-list {
  max-width: var(--pfm-brief-content);
  width: 100%;
  border-top: none;
  margin-top: 0;
}

.pfm-field-briefing .pfm-touch-queue-kicker {
  max-width: var(--pfm-brief-content);
}

.pfm-field-briefing .pfm-touch-queue-item:first-child {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 2.5%, var(--border));
}

.pfm-field-briefing .pfm-touch-queue-item + .pfm-touch-queue-item {
  border-top-color: color-mix(in srgb, var(--foreground) 2%, var(--border));
}

.pfm-field-briefing .pfm-touch-queue-row {
  grid-template-columns: 1.3rem minmax(0, 1fr) auto;
  gap: 0 8px;
  padding: 5px 0;
  align-items: start;
}

.pfm-field-briefing .pfm-touch-queue-order {
  padding-top: 2px;
  font-size: 10px;
  line-height: 1.3;
}

.pfm-field-briefing .pfm-touch-queue-text {
  line-height: 1.36;
}

.pfm-field-briefing .pfm-touch-queue-actions {
  align-self: start;
  padding-top: 1px;
  gap: 0;
}

.pfm-field-briefing .pfm-touch-queue-action {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.pfm-field-briefing .pfm-touch-queue-action--more {
  font-size: 14px;
}

.pfm-field-briefing .pfm-touch-queue-row:hover,
.pfm-field-briefing .pfm-touch-queue-row--menu-open {
  background: color-mix(in srgb, var(--foreground) 1.5%, transparent);
}

.pfm-field-briefing .pfm-touch-queue-row--copied {
  background: color-mix(in srgb, #16a34a 3%, transparent);
}

.pfm-field-briefing .pfm-mission-asks-tools {
  margin-top: var(--pfm-rhythm-sm);
  padding-top: var(--pfm-rhythm-xs);
  padding-bottom: var(--pfm-rhythm-xs);
  max-width: var(--pfm-brief-content);
  width: 100%;
  border-top: none;
}

/* —— Field Briefing: mission mode vs edit brief —— */
.pfm-briefing-doc-head {
  display: flex;
  justify-content: flex-end;
  padding: 8px var(--pfm-pad-x) 0;
  min-height: 0;
}

.pfm-field-briefing--edit .pfm-briefing-doc-head {
  display: none;
}

.pfm-briefing-edit-trigger {
  appearance: none;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  color: var(--brand-800);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.pfm-briefing-edit-trigger:active:not(:disabled) {
  transform: scale(0.98);
}

.pfm-brief-mission-goal {
  padding: 6px 0 4px 14px;
  margin: 0;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 52%, var(--border));
  max-width: var(--pfm-brief-content);
}

.pfm-brief-mission-goal-label,
.pfm-brief-question-queue-label {
  margin: 0 0 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-800);
}

.pfm-brief-mission-goal-value {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.022em;
  color: var(--foreground);
}

.pfm-brief-question-queue {
  padding: 8px 0 6px;
  max-width: var(--pfm-brief-content);
}

.pfm-brief-question-queue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pfm-brief-question-queue-item {
  display: grid;
  grid-template-columns: 1.35rem minmax(0, 1fr);
  gap: 0 8px;
  align-items: start;
}

.pfm-brief-question-queue-order {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--brand-700) 55%, var(--muted));
  text-align: right;
  padding-top: 2px;
}

.pfm-brief-question-queue-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.38;
  color: var(--foreground);
}

.pfm-brief-mission-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.pfm-prep-planning {
  padding: 12px var(--pfm-pad-x) 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
}

.pfm-prep-planning-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.pfm-prep-planning-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.pfm-prep-planning-status {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.pfm-prep-planning-body {
  min-width: 0;
}

.pfm-prep-briefing {
  border-top: 2px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
}

.pfm-prep-briefing-head {
  padding: 12px var(--pfm-pad-x) 8px;
}

.pfm-prep-briefing-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
}

.pfm-prep-briefing-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.35;
}

.pfm-mission-deck__back {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  white-space: nowrap;
}

.pfm-mission-deck__back:hover {
  text-decoration: underline;
}

.pfm-field-briefing--prepare-only.pfm-mission--prepare {
  gap: 14px;
}

.prepare-for-meeting-page--briefing-only:has(.pfm-field-briefing--prepare-only) .pfm-briefing-doc,
.prepare-for-meeting-page--briefing-only:has(.pfm-exec-briefing.pfm-field-briefing--prepare-only) .pfm-exec-briefing {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 40rem;
}

.pfm-briefing-question-queue__title,
.pfm-exec-briefing__queue.pfm-briefing-question-queue .pfm-briefing-question-queue__title {
  margin: 0 0 10px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-800);
}

.pfm-briefing-primary-question {
  padding: 14px 16px;
  margin: 0 0 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent);
}

.pfm-briefing-primary-question__badge {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 14%, #fff);
}

.pfm-briefing-primary-question__text {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.pfm-briefing-secondary-questions {
  padding-top: 4px;
}

.pfm-briefing-secondary-questions__title {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfm-briefing-secondary-questions__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pfm-briefing-secondary-questions__item {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  gap: 0 8px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.pfm-briefing-secondary-questions__order {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  text-align: right;
  padding-top: 2px;
}

.pfm-briefing-secondary-questions__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.38;
  color: var(--foreground);
}

.pfm-briefing-question-queue__empty {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

.pfm-field-briefing--prepare-only .pfm-briefing-edit-trigger {
  align-self: flex-start;
}

.pfm-brief-handled {
  margin-top: 12px;
}

.pfm-brief-handled-summary {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}

.pfm-brief-handled-list {
  margin: 8px 0 0;
  padding-left: 1.1rem;
  font-size: 12px;
  color: var(--muted);
}

.pfm-brief-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 8px;
  max-width: var(--pfm-brief-content);
}

.pfm-brief-edit-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.pfm-brief-edit-btn {
  appearance: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  padding: 9px 14px;
  cursor: pointer;
}

.pfm-brief-edit-btn--primary {
  border: none;
  background: var(--brand-600);
  color: #fff;
}

.pfm-brief-edit-btn--secondary {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--foreground);
}

.pfm-brief-edit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pfm-brief-edit-section-title {
  margin: 0 0 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-800);
}

.pfm-brief-edit-goal-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  min-height: 4.5rem;
}

.pfm-brief-edit-queue {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pfm-brief-edit-queue-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 0 6px;
  align-items: start;
  padding: 8px 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.pfm-brief-edit-queue-item:first-child,
.pfm-brief-edit-queue-item--primary {
  border-top: none;
}

.pfm-brief-edit-queue-item--primary {
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 45%, transparent);
  padding-left: 6px;
  margin-left: -6px;
}

.pfm-brief-edit-queue-main {
  min-width: 0;
}

.pfm-brief-edit-primary-badge,
.pfm-brief-question-queue-primary-badge,
.pfm-exec-briefing__queue-primary-badge {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.pfm-brief-edit-set-primary {
  appearance: none;
  border: none;
  background: transparent;
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 700;
  font-family: inherit;
  color: var(--brand-700);
  cursor: pointer;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pfm-brief-edit-set-primary:hover:not(:disabled) {
  color: var(--brand-800);
}

.pfm-brief-edit-set-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pfm-brief-question-queue-item--primary,
.pfm-exec-briefing__queue-item--primary {
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 48%, transparent);
  padding-left: 10px;
  margin-left: -10px;
}

.pfm-exec-briefing__hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.pfm-exec-briefing__mode-pill {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 75%, var(--muted));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.pfm-exec-briefing__mode-pill--edit {
  color: #92400e;
  background: color-mix(in srgb, #f59e0b 12%, #fff);
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
}

.pfm-exec-briefing__doc-head {
  display: flex;
  justify-content: flex-end;
  padding: 0 var(--pfm-pad-x, 12px) 4px;
}

.pfm-field-briefing--edit .pfm-exec-briefing__doc-head,
.pfm-field-briefing--edit .pfm-exec-briefing__launch,
.pfm-field-briefing--edit .pfm-exec-briefing__known {
  display: none;
}

.pfm-brief-edit-queue-item--dragging {
  opacity: 0.55;
}

.pfm-brief-edit-drag {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: grab;
  padding: 2px 0;
  font-size: 14px;
  line-height: 1;
}

.pfm-brief-edit-queue-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.38;
  padding-top: 1px;
}

.pfm-brief-edit-queue-placeholder {
  color: var(--muted);
  font-weight: 500;
}

.pfm-brief-edit-queue-actions {
  display: flex;
  gap: 2px;
}

.pfm-brief-edit-icon-btn {
  appearance: none;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
}

.pfm-brief-edit-icon-btn--danger {
  font-size: 18px;
  line-height: 1;
}

.pfm-brief-edit-icon-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  color: var(--foreground);
}

.pfm-brief-edit-add {
  appearance: none;
  margin-top: 10px;
  border: 1px dashed color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  color: var(--brand-800);
  font-size: 12px;
  font-weight: 700;
  padding: 10px 12px;
  border-radius: 10px;
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.pfm-brief-edit-queue-empty {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--muted);
}

.pfm-touch-queue-item {
  margin: 0;
  padding: 0;
}

.pfm-touch-queue-item + .pfm-touch-queue-item {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.pfm-touch-queue-row {
  display: grid;
  grid-template-columns: 1.35rem minmax(0, 1fr) auto;
  gap: 0 6px;
  align-items: start;
  padding: 4px 0;
  position: relative;
  transition: background 0.1s ease;
}

.pfm-touch-queue-row:hover,
.pfm-touch-queue-row--menu-open,
.pfm-touch-queue-row--copied {
  background: color-mix(in srgb, var(--brand-600) 3%, transparent);
}

.pfm-touch-queue-row--copied {
  background: color-mix(in srgb, #16a34a 4%, transparent);
}

.pfm-touch-queue-order {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--brand-700) 55%, var(--muted));
  text-align: right;
  padding-top: 1px;
  user-select: none;
}

.pfm-touch-queue-prompt {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 2px 0 0;
}

.pfm-touch-queue-text {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.33;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.pfm-touch-queue-flag {
  align-self: flex-start;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--muted) 90%, transparent);
  line-height: 1.2;
}

.pfm-touch-queue-flag--new,
.pfm-touch-queue-flag--changed {
  padding: 0;
  border: none;
  background: none;
  color: color-mix(in srgb, var(--brand-700) 70%, var(--muted));
}

.pfm-touch-queue-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  position: relative;
  align-self: center;
  opacity: 0.35;
  transition: opacity 0.12s ease;
}

.pfm-touch-queue-row:hover .pfm-touch-queue-actions,
.pfm-touch-queue-row:focus-within .pfm-touch-queue-actions,
.pfm-touch-queue-row--menu-open .pfm-touch-queue-actions,
.pfm-touch-queue-row--copied .pfm-touch-queue-actions {
  opacity: 1;
}

.pfm-touch-queue-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-size: 13px;
  line-height: 1;
  color: color-mix(in srgb, var(--muted) 85%, var(--foreground));
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.pfm-touch-queue-action--copy {
  font-size: 12px;
}

.pfm-touch-queue-action--more {
  font-size: 15px;
  letter-spacing: -0.08em;
}

.pfm-touch-queue-action:hover:not(:disabled),
.pfm-touch-queue-action:focus-visible {
  background: color-mix(in srgb, var(--foreground) 5%, #fff);
  color: var(--foreground);
}

.pfm-touch-queue-action:disabled {
  opacity: 0.45;
  cursor: wait;
}

.pfm-touch-queue-row--copied .pfm-touch-queue-action--copy {
  color: color-mix(in srgb, #16a34a 80%, var(--foreground));
}

.pfm-touch-queue-actions .pfm-ask-menu-wrap {
  right: 0;
  top: calc(100% + 2px);
}

.pfm-touch-queue-item.pfm-ask-row--later .pfm-touch-queue-text {
  opacity: 0.88;
}

.pfm-touch-queue-item.pfm-ask-row--later .pfm-touch-queue-order {
  font-style: italic;
}

.pfm-touch-queue-item--new .pfm-touch-queue-row {
  background: color-mix(in srgb, #16a34a 4%, transparent);
}

.pfm-touch-queue-item--changed .pfm-touch-queue-row {
  background: color-mix(in srgb, var(--brand-600) 4%, transparent);
}

@media (hover: none) {
  .pfm-touch-queue-actions {
    opacity: 0.55;
  }
}

@media (max-width: 480px) {
  .pfm-touch-queue-list {
    max-width: none;
  }

  .pfm-touch-queue-row {
    grid-template-columns: 1.2rem minmax(0, 1fr) auto;
    gap: 0 4px;
    padding: 5px 0;
  }

  .pfm-touch-queue-text {
    font-size: 12px;
    line-height: 1.36;
  }

  .pfm-touch-queue-action {
    width: 32px;
    height: 32px;
  }
}

.pfm-mission-asks-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 6px;
  padding-top: 6px;
  max-width: 36ch;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pfm-ask-add-custom {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pfm-ask-add-custom:hover:not(:disabled) {
  color: var(--brand-600);
}

.pfm-mission-refine {
  margin: 0;
  min-width: 0;
}

.pfm-mission-refine-summary {
  list-style: none;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--muted) 90%, transparent);
  user-select: none;
}

.pfm-mission-refine-summary::-webkit-details-marker {
  display: none;
}

.pfm-mission-refine-summary::after {
  content: " ▾";
  font-size: 9px;
}

.pfm-mission-refine[open] .pfm-mission-refine-summary::after {
  content: " ▴";
}

.pfm-mission-refine-body {
  margin-top: 8px;
  padding: 8px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pfm-mission-refine-body .pfm-ai-assist-chip {
  font-size: 10px;
  padding: 4px 8px;
}

.pfm-mission-refine-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pfm-mission-refine-chip {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  font-size: 10px;
  font-weight: 700;
  color: var(--foreground);
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.pfm-mission-refine-chip:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.pfm-mission-tertiary-block {
  padding: 4px 0 2px;
}

.pfm-mission-tertiary-block + .pfm-mission-tertiary-block {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pfm-mission-tertiary-block--caution {
  border-left: 2px solid color-mix(in srgb, #d97706 40%, transparent);
  padding-left: 7px;
}

.pfm-mission-tertiary-block--followup {
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 32%, transparent);
  padding-left: 7px;
}

.pfm-mission-tertiary-title {
  margin: 0 0 3px;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: color-mix(in srgb, var(--muted) 88%, transparent);
  line-height: 1.15;
}

.pfm-mission-tertiary-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.32;
  color: var(--foreground);
  max-width: none;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.pfm-mission-tertiary-list li {
  position: relative;
  padding-left: 9px;
}

.pfm-mission-tertiary-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--foreground) 35%, var(--border));
}

.pfm-mission-tertiary-list li + li {
  margin-top: 2px;
}

.pfm-mission-tertiary-empty {
  margin: 0;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.32;
  color: var(--muted);
  max-width: 26ch;
}

.pfm-reference-flags-kicker {
  margin: 0 0 4px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.prepare-for-meeting-footer--mission {
  padding-top: 6px;
  padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
  gap: 5px;
}

.prepare-for-meeting-footer--mission .prepare-for-meeting-footer-btn {
  min-height: 36px;
  font-size: 10px;
}

.prepare-for-meeting-footer--mission .prepare-for-meeting-footer-btn--primary {
  flex: 1.5;
  font-size: 11px;
  font-weight: 800;
}

.prepare-for-meeting-footer--mission .prepare-for-meeting-footer-btn--secondary {
  flex: 0.95;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  font-weight: 700;
}

.prepare-for-meeting-footer--mission .prepare-for-meeting-footer-btn--secondary.prepare-for-meeting-footer-btn--compact {
  flex: 0.75;
  max-width: 5.5rem;
}

.prepare-for-meeting-page--mission {
  --pfm-footer-h: calc(96px + env(safe-area-inset-bottom, 0px));
}

.pfm-mission-deck__bar--menu-only {
  justify-content: flex-start;
  padding: 4px var(--pfm-pad-x);
}

.prepare-for-meeting-footer--execution {
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}

.prepare-for-meeting-footer--execution .prepare-for-meeting-footer-btn--primary {
  flex: none;
  width: 100%;
  min-height: 44px;
  font-size: 12px;
}

.prepare-for-meeting-footer__actions-row {
  display: flex;
  gap: 5px;
  width: 100%;
}

.prepare-for-meeting-footer--execution .prepare-for-meeting-footer-btn--secondary {
  flex: 1;
}

.prepare-for-meeting-footer-btn--tertiary {
  flex: 1;
  min-height: 36px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.prepare-for-meeting-footer--execution .prepare-for-meeting-footer-btn--tertiary:hover {
  color: var(--foreground);
}

@media (min-width: 1024px) {
  .prepare-for-meeting-page--mission .pfm-mission,
  .prepare-for-meeting-page--briefing .pfm-mission {
    max-width: var(--pfm-read-max);
    margin-left: auto;
    margin-right: auto;
  }

  .pfm-mission-stack--tertiary {
    padding: 4px 0 6px 14px;
    margin-top: 0;
    border-bottom: none;
    border-left: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
    gap: 0;
    align-self: stretch;
    position: sticky;
    top: calc(var(--pfm-header-h, 56px) + 6px);
  }

  .pfm-mission-stack--secondary {
    border-bottom: none;
    padding-bottom: 6px;
  }

  .pfm-mission-asks {
    padding-bottom: 10px;
  }

  .pfm-mission-stack--primary .pfm-mission-focus--primary {
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .pfm-field-briefing .pfm-mission-stack--primary .pfm-mission-focus--primary {
    padding: 6px 0 4px 14px;
  }

  .pfm-field-briefing .pfm-mission-stack--tertiary {
    padding: 0 0 2px 14px;
    border-top: none;
    border-left: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
    gap: 0;
    top: calc(var(--pfm-header-h, 56px) + 4px);
    align-self: start;
  }

  .pfm-field-briefing .pfm-mission-stack--tertiary::before {
    margin: 0 0 3px;
    padding-bottom: 3px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 3%, var(--border));
  }

  .pfm-field-briefing .pfm-mission-tertiary-block {
    padding: 2px 0 1px;
  }

  .pfm-field-briefing .pfm-mission-tertiary-block + .pfm-mission-tertiary-block {
    margin-top: 3px;
    padding-top: 3px;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 3%, var(--border));
  }

  .pfm-field-briefing .pfm-mission-tertiary-title {
    font-size: 7px;
    margin-bottom: 1px;
  }

  .pfm-field-briefing .pfm-mission-tertiary-list {
    font-size: 10px;
    line-height: 1.28;
  }

  .pfm-field-briefing .pfm-mission-tertiary-list li {
    padding-left: 8px;
  }

  .pfm-field-briefing .pfm-mission-tertiary-list li + li {
    margin-top: 0;
  }

  .pfm-field-briefing .pfm-mission-tertiary-empty {
    font-size: 9px;
    line-height: 1.26;
  }
}

/* —— Field briefing final polish (restraint + rhythm) —— */
.prepare-for-meeting-page--mission .prepare-for-meeting-header {
  padding-bottom: 5px;
}

.prepare-for-meeting-page--mission .prepare-for-meeting-title-row {
  align-items: flex-start;
}

.prepare-for-meeting-page--mission .prepare-for-meeting-mission-lead {
  margin: 3px 0 0;
  max-width: 52ch;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.32;
  color: color-mix(in srgb, var(--muted) 90%, var(--foreground));
}

.prepare-for-meeting-page--mission .prepare-for-meeting-meta-chip {
  border: none;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  font-weight: 600;
}

.prepare-for-meeting-page--mission .prepare-for-meeting-meta-chips {
  margin-top: 4px;
  gap: 3px;
}

.pfm-field-briefing > .pfm-scope-header {
  background: transparent;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.pfm-field-briefing > .pfm-scope-header-summary {
  padding: 4px var(--pfm-pad-x);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pfm-field-briefing > .pfm-scope-header-sub {
  padding-bottom: 5px;
  font-size: 9px;
  line-height: 1.3;
}

.pfm-field-briefing .pfm-mission-focus-title,
.pfm-field-briefing .pfm-mission-asks .pfm-mission-zone-title,
.pfm-field-briefing .pfm-mission-tertiary-title {
  letter-spacing: 0.07em;
}

.pfm-field-briefing .pfm-mission-stack--secondary > .pfm-mission-focus--secondary + .pfm-mission-asks {
  margin-top: var(--pfm-rhythm-sm);
  padding-top: var(--pfm-rhythm-sm);
  padding-bottom: var(--pfm-rhythm-xs);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 3.5%, var(--border));
}

.pfm-field-briefing .pfm-mission-asks .pfm-mission-zone-title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.pfm-field-briefing .pfm-touch-queue-kicker {
  font-size: 9px;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.pfm-field-briefing .pfm-touch-queue-order {
  font-size: 9px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 75%, var(--brand-700));
}

.pfm-field-briefing .pfm-touch-queue-text {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.34;
}

.pfm-field-briefing .pfm-touch-queue-actions {
  opacity: 0.2;
}

.pfm-field-briefing .pfm-touch-queue-row:hover .pfm-touch-queue-actions,
.pfm-field-briefing .pfm-touch-queue-row:focus-within .pfm-touch-queue-actions,
.pfm-field-briefing .pfm-touch-queue-row--menu-open .pfm-touch-queue-actions,
.pfm-field-briefing .pfm-touch-queue-row--copied .pfm-touch-queue-actions {
  opacity: 0.62;
}

.pfm-field-briefing .pfm-touch-queue-action {
  color: color-mix(in srgb, var(--muted) 90%, var(--foreground));
}

.pfm-field-briefing .pfm-touch-queue-action:hover:not(:disabled),
.pfm-field-briefing .pfm-touch-queue-action:focus-visible {
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
}

.pfm-field-briefing .pfm-touch-queue-copy-all {
  font-size: 9px;
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 94%, transparent);
  text-decoration: none;
}

.pfm-field-briefing .pfm-touch-queue-copy-all:hover:not(:disabled) {
  text-decoration: underline;
  color: color-mix(in srgb, var(--brand-700) 80%, var(--muted));
}

.pfm-field-briefing .pfm-mission-zone--ai-highlight,
.pfm-field-briefing .pfm-today-card--ai-highlight {
  animation: pfm-brief-nudge 2s ease-out;
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.pfm-field-briefing .pfm-mission-reference {
  background: transparent;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.pfm-field-briefing .pfm-mission-reference-summary {
  padding: 6px var(--pfm-pad-x);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
}

.pfm-field-briefing .pfm-ask-handled {
  margin-top: 4px;
  max-width: var(--pfm-brief-content);
}

.pfm-field-briefing .pfm-ask-handled-summary {
  font-size: 9px;
  font-weight: 700;
  color: color-mix(in srgb, var(--muted) 90%, transparent);
}

.pfm-field-briefing .pfm-mission-tertiary-list,
.pfm-field-briefing .pfm-mission-tertiary-empty {
  max-width: none;
}

.pfm-field-briefing .pfm-mission-stack--tertiary {
  padding: var(--pfm-rhythm-xs) var(--pfm-pad-x);
  gap: 4px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.pfm-field-briefing .pfm-mission-stack--tertiary::before {
  content: "Tactical notes";
  display: block;
  margin: 0 0 3px;
  font-size: 7px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: color-mix(in srgb, var(--muted) 90%, transparent);
  line-height: 1.1;
}

.pfm-field-briefing .pfm-mission-tertiary-title {
  font-size: 7px;
  font-weight: 700;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.pfm-field-briefing .pfm-mission-tertiary-list {
  font-size: 9px;
  font-weight: 500;
  line-height: 1.27;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.pfm-field-briefing .pfm-mission-tertiary-list li::before {
  background: color-mix(in srgb, var(--muted) 50%, var(--border));
  width: 2px;
  height: 2px;
}

.pfm-field-briefing .pfm-mission-tertiary-empty {
  font-size: 8px;
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 94%, transparent);
}

.pfm-field-briefing .pfm-mission-tertiary-block {
  padding: 2px 0 1px;
}

.pfm-field-briefing .pfm-mission-tertiary-block + .pfm-mission-tertiary-block {
  margin-top: 3px;
  padding-top: 3px;
}

.pfm-field-briefing .pfm-mission-tertiary-block--caution,
.pfm-field-briefing .pfm-mission-tertiary-block--followup {
  border-left: none;
  padding-left: 0;
}

@media (min-width: 600px) and (max-width: 1023px) {
  .pfm-field-briefing .pfm-mission-stack--tertiary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    padding: var(--pfm-rhythm-sm) var(--pfm-pad-x);
    border-top: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
  }

  .pfm-field-briefing .pfm-mission-stack--tertiary::before {
    grid-column: 1 / -1;
    margin-bottom: 2px;
    padding-bottom: 3px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
  }

  .pfm-field-briefing .pfm-mission-tertiary-block + .pfm-mission-tertiary-block {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .pfm-field-briefing .pfm-mission-tertiary-block--caution,
  .pfm-field-briefing .pfm-mission-tertiary-block--followup {
    border-left: none;
    padding-left: 0;
  }
}

@keyframes pfm-brief-nudge {
  0%,
  100% {
    box-shadow: inset 2px 0 0 color-mix(in srgb, var(--brand-600) 0%, transparent);
  }
  18% {
    box-shadow: inset 2px 0 0 color-mix(in srgb, var(--brand-600) 32%, transparent);
  }
}

/* —— Tactical mission briefing document —— */
.pfm-briefing-doc {
  --pfm-brief-content: min(52ch, 100%);
  --pfm-rhythm-mission: 28px;
  --pfm-rhythm-unknowns: 18px;
  --pfm-rhythm-questions: 10px;
}

@media (min-width: 768px) {
  .pfm-briefing-doc {
    --pfm-brief-content: 56ch;
  }
}

@media (min-width: 1024px) {
  .pfm-briefing-doc {
    --pfm-brief-content: 58ch;
  }
}

@media (min-width: 1280px) {
  .pfm-briefing-doc {
    --pfm-brief-content: 62ch;
  }
}

.pfm-briefing-doc .pfm-mission-stack--primary {
  background: transparent;
  padding: 6px var(--pfm-pad-x) 10px;
}

.pfm-briefing-doc .pfm-mission-focus--primary {
  padding: 0 0 0 16px;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 45%, var(--border));
}

.pfm-briefing-doc .pfm-mission-focus--primary .pfm-mission-focus-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 88%, var(--muted));
  margin-bottom: 6px;
}

.pfm-briefing-doc .pfm-mission-focus--primary .pfm-mission-focus-kicker {
  font-size: 10px;
  margin-bottom: 12px;
  color: color-mix(in srgb, var(--muted) 88%, var(--foreground));
}

.pfm-briefing-doc .pfm-today-cards--primary .pfm-today-card-value {
  font-size: clamp(18px, 2.4vw, 21px);
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: -0.024em;
  color: var(--foreground);
  max-width: 54ch;
}

.pfm-briefing-doc .pfm-mission-focus--primary .pfm-ai-assist-wrap {
  margin-bottom: 10px;
  opacity: 0.92;
}

.pfm-briefing-doc .pfm-briefing-section--unknowns {
  padding-top: var(--pfm-rhythm-unknowns);
  padding-bottom: var(--pfm-rhythm-sm);
}

.pfm-briefing-doc .pfm-mission-focus--secondary {
  padding: 0 0 0 12px;
  margin-bottom: 0;
  border-left: 2px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.pfm-briefing-doc .pfm-mission-focus--secondary .pfm-mission-focus-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.09em;
  color: var(--brand-700);
  margin-bottom: 4px;
}

.pfm-briefing-doc .pfm-mission-focus--secondary .pfm-mission-focus-kicker {
  font-size: 10px;
  font-weight: 500;
  margin: 0 0 8px;
  color: color-mix(in srgb, var(--muted) 86%, var(--foreground));
}

.pfm-briefing-doc .pfm-today-cards--secondary .pfm-today-card-value {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--foreground);
}

.pfm-briefing-doc .pfm-briefing-section--questions {
  margin-top: var(--pfm-rhythm-questions);
  padding-top: var(--pfm-rhythm-md);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.pfm-briefing-doc .pfm-mission-asks {
  padding: 0 0 8px;
}

.pfm-briefing-doc .pfm-mission-asks .pfm-mission-zone-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--muted) 88%, var(--foreground));
  margin-bottom: 2px;
}

.pfm-briefing-doc .pfm-touch-queue-kicker {
  font-size: 10px;
  line-height: 1.35;
  margin-bottom: 8px;
}

.pfm-briefing-doc .pfm-touch-queue-item:first-child {
  border-top: none;
  padding-top: 0;
}

.pfm-briefing-doc .pfm-touch-queue-item + .pfm-touch-queue-item {
  border-top-color: color-mix(in srgb, var(--foreground) 1.5%, var(--border));
}

.pfm-briefing-doc .pfm-touch-queue-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 10px 0;
}

.pfm-briefing-doc .pfm-touch-queue-order {
  width: 1.25rem;
  flex-shrink: 0;
  padding-top: 3px;
  font-size: 11px;
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 70%, var(--brand-700));
  text-align: left;
}

.pfm-briefing-doc .pfm-touch-queue-prompt {
  flex: 1;
  min-width: 0;
}

.pfm-briefing-doc .pfm-touch-queue-text {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.42;
  letter-spacing: -0.012em;
}

.pfm-briefing-doc .pfm-touch-queue-actions {
  flex-shrink: 0;
  padding-top: 2px;
  opacity: 0.15;
}

.pfm-briefing-doc .pfm-touch-queue-row:hover .pfm-touch-queue-actions,
.pfm-briefing-doc .pfm-touch-queue-row:focus-within .pfm-touch-queue-actions,
.pfm-briefing-doc .pfm-touch-queue-row--menu-open .pfm-touch-queue-actions {
  opacity: 0.55;
}

.pfm-briefing-doc .pfm-touch-queue-action {
  width: 22px;
  height: 22px;
  font-size: 11px;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.pfm-briefing-doc .pfm-touch-queue-action:hover:not(:disabled),
.pfm-briefing-doc .pfm-touch-queue-action:focus-visible {
  background: transparent;
  color: var(--foreground);
}

.pfm-briefing-doc .pfm-mission-asks-tools {
  margin-top: 12px;
  padding-top: 0;
  gap: 12px 16px;
}

.pfm-briefing-doc .pfm-ask-add-custom,
.pfm-briefing-doc .pfm-mission-refine-summary {
  font-size: 10px;
  font-weight: 500;
  color: color-mix(in srgb, var(--muted) 90%, var(--brand-700));
}

.pfm-briefing-doc .pfm-briefing-section--notes {
  border-top: none;
}

.pfm-briefing-doc .pfm-mission-stack--tertiary::before {
  content: "Tactical notes";
  font-size: 7px;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
  border-bottom: none;
  margin-bottom: 4px;
}

.pfm-briefing-doc .pfm-mission-tertiary-title {
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--muted) 94%, transparent);
}

.pfm-briefing-doc .pfm-mission-tertiary-list {
  font-size: 9px;
  font-weight: 400;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));
  max-width: none;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.pfm-briefing-doc .pfm-mission-tertiary-empty {
  font-size: 9px;
  color: color-mix(in srgb, var(--muted) 95%, transparent);
}

.pfm-briefing-doc .pfm-briefing-supplement {
  grid-column: 1 / -1;
  margin-top: var(--pfm-rhythm-md);
  padding-top: var(--pfm-rhythm-sm);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 3%, var(--border));
}

.pfm-briefing-doc > .pfm-briefing-supplement .pfm-scope-header {
  border: none;
  margin: 0;
}

.pfm-briefing-doc > .pfm-briefing-supplement .pfm-scope-header-summary {
  padding: 0 var(--pfm-pad-x) 4px;
  font-size: 8px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.pfm-briefing-doc .pfm-mission-reference {
  border-top: none;
  margin-top: 0;
}

.pfm-briefing-doc .pfm-mission-reference-summary {
  padding: 4px var(--pfm-pad-x);
  font-size: 8px;
  font-weight: 600;
  color: color-mix(in srgb, var(--muted) 92%, transparent);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-mission-lead {
  max-width: var(--pfm-brief-content, 52ch);
  font-size: 11px;
  line-height: 1.4;
  color: color-mix(in srgb, var(--muted) 88%, var(--foreground));
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-meta-chips {
  display: none;
}

@media (min-width: 1024px) {
  .pfm-briefing-doc > .pfm-briefing-supplement,
  .pfm-briefing-doc > .pfm-mission-reference,
  .pfm-briefing-doc > .pfm-mission-reference-links {
    grid-column: 1 / -1;
  }

  .pfm-briefing-doc .pfm-mission-stack--tertiary {
    padding-top: 12px;
    padding-left: 12px;
    border-left-color: color-mix(in srgb, var(--foreground) 3%, var(--border));
  }

  .pfm-briefing-doc .pfm-mission-stack--tertiary::before {
    padding-bottom: 0;
    margin-bottom: 6px;
  }
}

/* —— Field briefing visual refresh —— */
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) {
  --pfm-pad-x: clamp(16px, 4vw, 32px);
  --pfm-brief-surface: #ffffff;
  --pfm-brief-muted: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  --pfm-brief-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
  --pfm-brief-radius: 16px;
  background:
    radial-gradient(ellipse 120% 80% at 50% -20%, color-mix(in srgb, var(--brand-600) 8%, transparent), transparent 55%),
    linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-header {
  position: static;
  top: auto;
  z-index: auto;
  padding: 10px var(--pfm-pad-x) 14px;
  border-bottom: none;
  background: transparent;
  backdrop-filter: none;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-title {
  font-size: clamp(1.25rem, 3.2vw, 1.625rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  white-space: normal;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-kicker {
  font-size: 11px;
  letter-spacing: 0.12em;
  margin-bottom: 4px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-visit-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 8px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-visit-type {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-visit-when {
  font-size: 13px;
  font-weight: 600;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-mission-lead {
  margin-top: 10px;
  max-width: 42rem;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-meta-chips {
  display: flex;
  margin-top: 8px;
  gap: 6px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-meta-chip {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--pfm-brief-surface);
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-status-chip {
  margin-top: 4px;
  padding: 6px 12px;
  font-size: 10px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-body--mission {
  padding: 2px var(--pfm-pad-x) 8px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc {
  --pfm-rhythm-mission: 12px;
  --pfm-rhythm-unknowns: 10px;
  --pfm-rhythm-questions: 8px;
  --pfm-rhythm-md: 12px;
  --pfm-brief-content: min(100%, 40rem);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 0 12px;
}

@media (min-width: 1024px) {
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.65fr);
    column-gap: 12px;
    row-gap: 6px;
    align-items: start;
  }

  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc > .pfm-briefing-supplement,
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc > .pfm-mission-reference,
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc > .pfm-mission-reference-links {
    grid-column: 1 / -1;
  }
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--primary,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--secondary {
  margin: 0;
  padding: 10px 12px 12px;
  border-radius: var(--pfm-brief-radius);
  background: var(--pfm-brief-surface);
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  box-shadow: var(--pfm-brief-shadow);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--primary {
  border-top: 3px solid var(--brand-600);
  padding-top: 10px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--secondary {
  padding-top: 10px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-focus--primary,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-focus--secondary {
  padding: 0 0 0 14px;
  margin: 0;
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 55%, var(--border));
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-focus--primary .pfm-mission-focus-title,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-focus--secondary .pfm-mission-focus-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-700);
  margin-bottom: 6px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-focus-kicker {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  margin-bottom: 6px;
  max-width: none;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--primary .pfm-today-card,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--secondary .pfm-today-card {
  padding: 12px 36px 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 3%, #fff);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--primary .pfm-today-card:hover:not(:disabled),
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--secondary .pfm-today-card:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  opacity: 1;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--primary .pfm-today-card-value {
  font-size: clamp(1.125rem, 2.8vw, 1.375rem);
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.02em;
  max-width: none;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--secondary .pfm-today-card-value {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.42;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--primary .pfm-today-card-edit,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-today-cards--secondary .pfm-today-card-edit {
  opacity: 0.5;
  top: 10px;
  right: 10px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-briefing-section--questions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-asks .pfm-mission-zone-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--brand-700);
  margin-bottom: 4px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-kicker {
  font-size: 11px;
  line-height: 1.35;
  margin-bottom: 6px;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-list {
  max-width: none;
  border-top: none;
  gap: 8px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-item {
  border: none;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-item:first-child {
  border-top: none;
  padding-top: 0;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-row {
  gap: 12px;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-item + .pfm-touch-queue-item .pfm-touch-queue-row {
  margin-top: 0;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-order {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, transparent);
  text-align: center;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-text {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.42;
  letter-spacing: -0.01em;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-actions {
  opacity: 0.72;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-row:hover .pfm-touch-queue-actions,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-row:focus-within .pfm-touch-queue-actions,
.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-row--menu-open .pfm-touch-queue-actions {
  opacity: 1;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-action {
  width: 28px;
  height: 28px;
  font-size: 12px;
  border-radius: 8px;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-touch-queue-action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--tertiary {
  margin: 0;
  padding: 16px 16px 14px;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  border-radius: var(--pfm-brief-radius);
  background: var(--pfm-brief-surface);
  box-shadow: var(--pfm-brief-shadow);
  border-top: none;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--tertiary::before {
  content: "Tactical notes";
  display: block;
  margin: 0 0 8px;
  padding-bottom: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-700);
  line-height: 1.2;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pfm-brief-muted);
  margin-bottom: 6px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-list {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--foreground);
  max-width: none;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-list li::before {
  width: 5px;
  height: 5px;
  background: var(--brand-600);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-empty {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-block {
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-block--caution {
  background: color-mix(in srgb, #f59e0b 6%, #fff);
  border-left: 3px solid #d97706;
  padding-left: 12px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-block--followup {
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  border-left: 3px solid color-mix(in srgb, var(--brand-600) 50%, var(--border));
  padding-left: 12px;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-tertiary-block + .pfm-mission-tertiary-block {
  margin-top: 0;
  padding-top: 10px;
  border-top: none;
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc > .pfm-briefing-supplement {
  margin-top: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-reference-summary {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--pfm-brief-muted);
}

.prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .prepare-for-meeting-footer--mission {
  border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, #fff 92%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.08);
}

@media (min-width: 1024px) {
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--tertiary {
    position: sticky;
    top: calc(var(--pfm-header-h, 56px) + 12px);
    border-left: none;
    align-self: start;
  }

  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--tertiary::before {
    border-bottom-color: color-mix(in srgb, var(--foreground) 6%, var(--border));
  }
}

@media (max-width: 480px) {
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) {
    --pfm-pad-x: 14px;
  }

  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--primary,
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--secondary,
  .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--tertiary {
    padding: 16px 14px;
    border-radius: 14px;
  }
}

/* Provider Debrief — specialized Field Briefing */
.prepare-for-meeting-page--provider-debrief .prepare-for-meeting-mission-lead {
  max-width: 42rem;
}

.pfm-debrief-plan {
  display: grid;
  gap: 18px;
  padding-bottom: 24px;
}

.pfm-debrief-plan-section {
  background: var(--card, #fff);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 16px;
  padding: 18px 16px;
}

.pfm-debrief-plan-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfm-debrief-plan-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.pfm-debrief-plan-longitudinal-grid {
  display: grid;
  gap: 12px;
}

.pfm-debrief-plan-longitudinal-block {
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 10%, var(--border));
}

.pfm-debrief-plan-longitudinal-label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.pfm-debrief-plan-empty,
.pfm-debrief-plan-alert {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

.pfm-debrief-plan-alert {
  color: var(--foreground);
  padding: 14px 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 28%, transparent);
}

.pfm-debrief-plan-link {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 700;
}

.pfm-debrief-plan-link--muted {
  color: var(--muted);
  font-weight: 600;
}

.pfm-debrief-plan-context {
  padding: 14px 16px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
}

.pfm-debrief-plan-context-label {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.pfm-debrief-plan-context-value {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.pfm-debrief-plan-context-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
}

.pfm-debrief-plan-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.pfm-debrief-plan-learning {
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
}

.pfm-debrief-plan-learning-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.pfm-debrief-plan-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--foreground);
}

.pfm-debrief-plan-confidence {
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
}

.pfm-debrief-plan-signal {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.pfm-debrief-plan-evidence,
.pfm-debrief-plan-rationale {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-debrief-plan-question {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.pfm-debrief-plan-list--objectives li,
.pfm-debrief-plan-list--questions li,
.pfm-debrief-plan-list--supporting li {
  position: relative;
  padding-left: 16px;
  font-size: 14px;
  line-height: 1.45;
}

.pfm-debrief-plan-list--objectives li::before,
.pfm-debrief-plan-list--questions li::before,
.pfm-debrief-plan-list--supporting li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--muted);
}

.pfm-debrief-plan-product-grid {
  display: grid;
  gap: 12px;
}

.pfm-debrief-plan-product-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  background: color-mix(in srgb, var(--foreground) 2%, transparent);
}

.pfm-debrief-plan-product-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.pfm-debrief-plan-product-name {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.pfm-debrief-plan-fit {
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--success, #16a34a) 14%, transparent);
}

.pfm-debrief-plan-product-rationale,
.pfm-debrief-plan-product-evidence {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}

.pfm-debrief-plan-product-rationale {
  color: var(--foreground);
  margin-bottom: 6px;
}

.pfm-debrief-plan-section--outcome {
  border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
}

.pfm-debrief-plan-outcome-primary {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.45;
}

.pfm-debrief-plan-next-step {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.pfm-debrief-plan-next-step-label {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.pfm-debrief-plan-next-step-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 800;
}

.pfm-debrief-plan-next-step-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

/* —— Intro call Field Briefing — execution layout —— */
.prepare-for-meeting-page--intro-execution {
  background: var(--mc-page-bg, var(--pfm-page-bg));
}

.prepare-for-meeting-page--intro-execution .prepare-for-meeting-body--mission {
  padding: clamp(8px, 2vw, 14px) var(--pfm-pad-x) 16px;
}

.pfm-exec-briefing {
  display: flex;
  flex-direction: column;
  gap: clamp(22px, 4vw, 36px);
  max-width: var(--pfm-read-max, 720px);
  margin: 0 auto;
  width: 100%;
  color: var(--mc-ink-soft, var(--foreground));
}

.pfm-exec-briefing__hero-bar {
  margin-bottom: 4px;
}

.pfm-exec-briefing__provider {
  font-size: clamp(24px, 5vw, 32px);
}

.pfm-exec-briefing__site {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
}

.pfm-exec-briefing__specialty {
  margin-top: 2px;
}

.pfm-exec-briefing__visit-meta {
  margin-top: 10px;
}

.pfm-exec-briefing__goal-label {
  margin: 0 0 10px;
}

.pfm-exec-briefing__goal-value {
  margin: 0;
  font-size: clamp(18px, 2.8vw, 22px);
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--mc-ink, var(--foreground));
  max-width: 42ch;
}

.pfm-exec-briefing__queue-label {
  margin: 0 0 16px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mc-accent, var(--brand-600)) 72%, var(--mc-ink, var(--foreground)));
}

.pfm-exec-briefing__queue-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

.pfm-exec-briefing__queue-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: clamp(16px, 2.5vw, 22px);
  border-radius: var(--mc-radius-md, 12px);
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid color-mix(in srgb, var(--mc-accent, var(--brand-600)) 22%, var(--mc-border, var(--border)));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 8%, transparent),
    0 8px 28px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 10%, transparent);
}

.pfm-exec-briefing__queue-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mc-accent, var(--brand-600)) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--mc-accent, var(--brand-600)) 55%, rgba(255, 255, 255, 0.2));
  box-shadow: 0 0 14px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 38%, transparent);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
}

.pfm-exec-briefing__queue-text {
  margin: 0;
  font-size: clamp(18px, 3.6vw, 22px);
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.02em;
  color: var(--mc-ink, var(--foreground));
}

.pfm-exec-briefing__queue-empty {
  margin: 0;
  padding: 16px 18px;
  border-radius: var(--mc-radius-md, 12px);
  font-size: 14px;
  line-height: 1.45;
  color: var(--mc-meta, var(--muted));
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed color-mix(in srgb, var(--mc-accent, var(--brand-600)) 18%, var(--mc-border, var(--border)));
}

.pfm-exec-briefing__launch {
  padding-top: 4px;
}

.pfm-exec-briefing__launch-btn {
  min-height: 48px;
  padding: 0 24px;
  font-size: 14px;
}

.pfm-exec-briefing__known {
  margin-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--mc-ink, #0f172a) 8%, transparent);
}

.pfm-exec-briefing__known-summary {
  cursor: pointer;
  padding: 14px 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mc-meta, var(--muted));
  list-style: none;
}

.pfm-exec-briefing__known-summary::-webkit-details-marker {
  display: none;
}

.pfm-exec-briefing__known-grid {
  display: grid;
  gap: 12px;
  margin: 0 0 16px;
  padding: 0;
}

.pfm-exec-briefing__known-row {
  display: grid;
  gap: 4px;
}

.pfm-exec-briefing__known-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mc-meta, var(--muted));
}

.pfm-exec-briefing__known-row dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--mc-ink-soft, var(--foreground));
}

.pfm-exec-briefing__known-empty {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--mc-meta, var(--muted));
}

@media (min-width: 641px) {
  .pfm-exec-briefing__queue-item {
    padding: 20px 18px;
  }
}

/* ═══ Field Briefing — Mission Control execution console ═══ */
.mc-workspace--field-briefing {
  --mc-page-bg: #e4eaf2;
  --pfm-page-bg: #e4eaf2;
}

.mc-workspace--field-briefing .pfm-mission-deck__inner {
  padding: clamp(10px, 2vw, 16px) var(--pfm-pad-x) clamp(12px, 2.5vw, 18px);
}

.mc-workspace--field-briefing .pfm-mission-deck__kicker,
.mc-workspace--field-briefing .mc-deck__kicker {
  flex-basis: 100%;
  width: 100%;
}

.mc-workspace--field-briefing .mc-deck__identity--inline .mc-deck__kicker {
  margin-bottom: 2px;
}

.mc-workspace--field-briefing .prepare-for-meeting-body--mission {
  padding: clamp(6px, 1.5vw, 12px) var(--pfm-pad-x) clamp(16px, 3vw, 28px);
}

.mc-workspace--field-briefing .prepare-for-meeting-page--mission .pfm-mission-stack--primary,
.mc-workspace--field-briefing .prepare-for-meeting-page--mission .pfm-mission-stack--secondary,
.mc-workspace--field-briefing .prepare-for-meeting-page--mission .pfm-mission-stack--tertiary,
.mc-workspace--field-briefing .prepare-for-meeting-page--mission .pfm-briefing-supplement {
  margin-left: 0;
  margin-right: 0;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--mc-ink, #0f172a) 8%, transparent);
  background: transparent;
  box-shadow: none;
  padding: clamp(20px, 3.5vw, 32px) 0;
}

.mc-workspace--field-briefing .prepare-for-meeting-page--mission .pfm-mission-stack--tertiary {
  border-bottom: none;
}

.mc-workspace--field-briefing .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc {
  gap: 0;
  padding: 0;
}

.mc-workspace--field-briefing .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--primary,
.mc-workspace--field-briefing .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--secondary,
.mc-workspace--field-briefing .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc .pfm-mission-stack--tertiary {
  margin: 0;
  padding: clamp(20px, 3.5vw, 32px) 0;
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--mc-ink, #0f172a) 8%, transparent);
  box-shadow: none;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-stack--primary,
.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-stack--secondary {
  padding-left: 0;
  padding-right: 0;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-focus--primary {
  padding: 0 0 0 16px;
  border-left: 3px solid color-mix(in srgb, var(--mc-accent, var(--brand-600)) 55%, transparent);
  box-shadow: inset 3px 0 12px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 8%, transparent);
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-focus--primary .pfm-mission-focus-title,
.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-asks .pfm-mission-zone-title {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--mc-accent, var(--brand-600)) 72%, var(--mc-ink, var(--foreground)));
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-today-cards--primary .pfm-today-card-value {
  font-size: clamp(20px, 3.2vw, 26px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.28;
  max-width: 44ch;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-touch-queue-list {
  gap: 12px;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-touch-queue-item {
  padding: 0;
  border: none;
  background: transparent;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-touch-queue-row {
  padding: clamp(14px, 2.2vw, 20px);
  border-radius: var(--mc-radius-md, 12px);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid color-mix(in srgb, var(--mc-accent, var(--brand-600)) 20%, var(--mc-border, var(--border)));
  box-shadow: 0 8px 24px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 8%, transparent);
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-touch-queue-order {
  background: color-mix(in srgb, var(--mc-accent, var(--brand-600)) 72%, rgba(15, 23, 42, 0.9));
  box-shadow: 0 0 12px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 35%, transparent);
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-touch-queue-text {
  font-size: clamp(17px, 2.8vw, 21px);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-tertiary-block {
  padding: 0;
  background: transparent;
  border: none;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-tertiary-title {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--mc-meta, var(--muted));
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-reference {
  margin-top: 8px;
  border: none;
  background: transparent;
  box-shadow: none;
}

.mc-workspace--field-briefing .pfm-field-briefing .pfm-mission-reference-summary {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--mc-meta, var(--muted));
}

.mc-workspace--field-briefing .prepare-for-meeting-footer--mission {
  left: 0;
  right: 0;
  max-width: none;
  margin: 0;
  padding: 10px var(--pfm-pad-x) calc(10px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, #111827 0%, #0a101a 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -10px 36px rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(12px);
}

.mc-workspace--field-briefing .prepare-for-meeting-footer-btn--complete-call.prepare-for-meeting-footer-btn--primary {
  background: linear-gradient(
    180deg,
    var(--mc-accent, var(--brand-600)),
    color-mix(in srgb, var(--mc-accent, var(--brand-600)) 78%, #000)
  );
  border-color: color-mix(in srgb, var(--mc-accent, var(--brand-600)) 70%, #000);
  box-shadow: 0 4px 18px color-mix(in srgb, var(--mc-accent, var(--brand-600)) 35%, transparent);
  color: #fff;
}

.mc-workspace--field-briefing .prepare-for-meeting-footer-btn--secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
  color: #e2e8f0;
}

.mc-workspace--field-briefing .prepare-for-meeting-footer-btn--tertiary {
  color: #94a3b8;
}

.mc-workspace--field-briefing .prepare-for-meeting-footer-btn--tertiary:hover {
  color: #e2e8f0;
}

.mc-workspace--field-briefing .pfm-exec-briefing__hero.mc-deck--inset {
  border-bottom: none;
  box-shadow: var(--mc-elev-hero);
}

.mc-workspace--field-briefing .pfm-exec-briefing__hero .mc-deck__inner {
  padding: clamp(14px, 2.5vw, 22px);
}

@media (min-width: 1024px) {
  .mc-workspace--field-briefing .prepare-for-meeting-page--mission:has(.pfm-briefing-doc) .pfm-briefing-doc {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
}

/* ═══ Active engagement workspace (in-progress) ═══ */
.prepare-for-meeting-page--live {
  --pfm-live-bg: #0f172a;
  --pfm-live-surface: #1e293b;
  --pfm-live-text: #f8fafc;
  --pfm-live-muted: #94a3b8;
  --pfm-page-bg: var(--pfm-live-bg);
  background: var(--pfm-live-bg);
  color: var(--pfm-live-text);
}

.prepare-for-meeting-page--live .prepare-for-meeting-body--mission {
  padding: 0 var(--pfm-pad-x) clamp(20px, 4vw, 32px);
}

.pfm-live-cheat {
  display: grid;
  gap: clamp(14px, 3vw, 20px);
  color: var(--pfm-live-text);
  max-width: 640px;
  margin: 0 auto;
}

.pfm-live-cheat__head {
  padding: clamp(12px, 2.5vw, 18px) 0 4px;
}

.pfm-live-cheat__bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.pfm-live-cheat__kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pfm-live-muted);
}

.pfm-live-cheat__provider {
  margin: 0;
  font-size: clamp(22px, 5vw, 28px);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.pfm-live-cheat__type {
  margin: 6px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--pfm-live-muted);
}

.pfm-live-cheat__block {
  background: var(--pfm-live-surface);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: clamp(14px, 3vw, 18px);
}

.pfm-live-cheat__block--primary {
  border-color: color-mix(in srgb, var(--brand-500, #3b82f6) 45%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-500, #3b82f6) 18%, transparent);
}

.pfm-live-cheat__label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pfm-live-muted);
}

.pfm-live-cheat__goal {
  margin: 0;
  font-size: clamp(17px, 4vw, 20px);
  font-weight: 800;
  line-height: 1.35;
}

.pfm-live-cheat__primary {
  margin: 0;
  font-size: clamp(18px, 4.2vw, 22px);
  font-weight: 800;
  line-height: 1.4;
}

.pfm-live-cheat__secondary {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: color-mix(in srgb, var(--pfm-live-surface) 88%, #000);
  overflow: hidden;
}

.pfm-live-cheat__secondary-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  list-style: none;
  color: var(--pfm-live-text);
}

.pfm-live-cheat__secondary-summary::-webkit-details-marker {
  display: none;
}

.pfm-live-cheat__secondary-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--pfm-live-muted);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 2px 8px;
}

.pfm-live-cheat__secondary-list {
  margin: 0;
  padding: 0 16px 14px 32px;
  display: grid;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: #e2e8f0;
}

.pfm-live-cheat__notes-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pfm-live-cheat__notes-status {
  font-size: 11px;
  font-weight: 700;
  color: var(--pfm-live-muted);
}

.pfm-live-cheat__notes {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--pfm-live-text);
  font: inherit;
  font-size: 15px;
  line-height: 1.45;
  padding: 12px 14px;
}

.pfm-live-cheat__notes:focus {
  outline: 2px solid color-mix(in srgb, var(--brand-500, #3b82f6) 50%, transparent);
  outline-offset: 1px;
}

.pfm-live-cheat__outcome-grid {
  display: grid;
  gap: 10px;
}

.pfm-live-cheat__outcome {
  min-height: 52px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: var(--pfm-live-text);
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  padding: 12px 16px;
}

.pfm-live-cheat__outcome--success {
  border-color: color-mix(in srgb, #22c55e 50%, transparent);
  background: color-mix(in srgb, #22c55e 18%, transparent);
}

.pfm-live-cheat__outcome--neutral {
  border-color: color-mix(in srgb, #f59e0b 45%, transparent);
  background: color-mix(in srgb, #f59e0b 14%, transparent);
}

.pfm-live-cheat__outcome--negative {
  border-color: color-mix(in srgb, #ef4444 45%, transparent);
  background: color-mix(in srgb, #ef4444 14%, transparent);
}

.pfm-live-cheat__outcome:disabled {
  opacity: 0.6;
  cursor: wait;
}

.pfm-live-cheat__outcome-recorded {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #86efac;
}

.prepare-for-meeting-page--live .prepare-for-meeting-footer--execution {
  padding-top: 10px;
}

.prepare-for-meeting-page--live .prepare-for-meeting-footer--execution .prepare-for-meeting-footer-btn--primary {
  width: 100%;
}

/* —— Mobile engagement flow footers (≤480px; desktop rules above unchanged) —— */
@media (max-width: 480px) {
  .prepare-for-meeting-page--mission,
  .prepare-for-meeting-page--briefing,
  .prepare-for-meeting-page--intro-call,
  .prepare-for-meeting-page--precall-plan {
    --pfm-footer-h: calc(104px + env(safe-area-inset-bottom, 0px));
  }

  .prepare-for-meeting-page--precall-plan {
    --pfm-footer-h: calc(84px + env(safe-area-inset-bottom, 0px));
  }

  .prepare-for-meeting-page--mission:has(.prepare-for-meeting-footer--execution),
  .prepare-for-meeting-page--live,
  .prepare-for-meeting-page--provider-debrief {
    --pfm-footer-h: calc(128px + env(safe-area-inset-bottom, 0px));
  }

  .prepare-for-meeting-body--mission,
  .prepare-for-meeting-body--briefing,
  .prepare-for-meeting-body--intro-call {
    padding-bottom: calc(var(--pfm-footer-h) + 4px);
  }

  .prepare-for-meeting-footer--mission,
  .prepare-for-meeting-footer--execution,
  .prepare-for-meeting-footer--precall-sticky {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px var(--pfm-pad-x) calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .prepare-for-meeting-footer__actions-row {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .prepare-for-meeting-footer--mission .prepare-for-meeting-footer-btn,
  .prepare-for-meeting-footer--execution .prepare-for-meeting-footer-btn,
  .prepare-for-meeting-footer--precall-sticky .prepare-for-meeting-footer-btn {
    flex: none !important;
    width: 100%;
    max-width: none !important;
    min-height: 44px;
    font-size: 13px;
    font-weight: 800;
    padding: 0 14px;
    border-radius: 12px;
    line-height: 1.25;
    white-space: normal;
  }

  .prepare-for-meeting-footer-btn--primary {
    order: 10;
  }

  .prepare-for-meeting-footer-btn--secondary {
    order: 1;
  }

  .prepare-for-meeting-footer-btn--tertiary {
    order: 5;
    min-height: 44px;
    font-size: 12px;
  }

  .prepare-for-meeting-footer--mission .prepare-for-meeting-footer-btn--secondary.prepare-for-meeting-footer-btn--compact {
    flex: none !important;
    max-width: none !important;
  }

  .pfm-precall-footer__inner {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 8px var(--pfm-pad-x) calc(8px + env(safe-area-inset-bottom, 0px));
  }

  .pfm-precall-footer__actions {
    order: 1;
    flex-direction: row;
    gap: 8px;
    width: 100%;
    justify-content: stretch;
  }

  .prepare-for-meeting-footer--precall-sticky .prepare-for-meeting-footer-btn {
    min-height: 44px !important;
  }

  .pfm-precall-footer__actions .prepare-for-meeting-footer-btn--secondary {
    order: 1;
    flex: 1 1 0 !important;
    width: auto !important;
  }

  .pfm-precall-footer__actions .prepare-for-meeting-footer-btn--primary {
    order: 2;
    flex: 1.5 1 0 !important;
    max-width: none !important;
    width: auto !important;
  }

  .pfm-precall-footer__back {
    order: 2;
    align-self: center;
    min-height: 44px;
    padding: 0 12px;
    font-size: 12px;
  }

  .mc-workspace--field-briefing .prepare-for-meeting-footer--mission {
    padding: 10px var(--pfm-pad-x) calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .pfm-debrief-plan {
    gap: 12px;
    padding-bottom: calc(var(--pfm-footer-h) + 8px);
  }

  .pfm-debrief-plan-section {
    padding: 12px;
    border-radius: 12px;
  }

  .pfm-debrief-plan-title {
    font-size: 16px;
  }

  /* Keep the plain action footers (capture / review / result) on a single
     compact row; the :has() rules above still stack approval + post-touch. */
  .pfm-debrief-footer {
    gap: 8px;
    padding: 8px var(--pfm-pad-x) calc(8px + env(safe-area-inset-bottom, 0px));
  }

  .pfm-debrief-footer-primary,
  .pfm-debrief-footer-secondary,
  .pfm-debrief-footer-apply-selected {
    min-height: 44px;
    border-radius: 10px;
  }

  .pfm-debrief-footer-primary {
    order: 10;
  }

  .pfm-debrief-footer-secondary-row {
    gap: 8px;
    width: 100%;
  }

  .pfm-debrief-post-touch-footer {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .pfm-debrief-post-touch-footer .pfm-debrief-footer-primary {
    order: 2;
  }

  .pfm-debrief-compose-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .pfm-debrief-mic {
    width: 100%;
    min-height: 44px;
  }

  .prepare-for-meeting-page--provider-debrief .dpb-footer {
    padding: 10px var(--pfm-pad-x) calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .prepare-for-meeting-page--provider-debrief .dpb-footer__primary {
    min-height: 48px;
    font-size: 15px;
    border-radius: 12px;
  }
}
`;

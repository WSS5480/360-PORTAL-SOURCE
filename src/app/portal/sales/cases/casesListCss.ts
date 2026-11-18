/** Dense scannable cases list — default directory view. */

export const casesListCss = `
.cases-list-panel {
  margin: 0;
  min-width: 0;
}

.cases-list-table-wrap {
  width: 100%;
  overflow-x: auto;
  --cases-list-cols:
    minmax(0, 1.1fr)
    minmax(0, 1fr)
    minmax(0, 0.72fr)
    minmax(0, 0.85fr)
    minmax(0, 0.72fr)
    minmax(0, 1.05fr)
    52px;
}

.cases-list-table {
  width: 100%;
  min-width: 0;
}

.cases-list-head,
.cases-list-row.ops-queue-row--clickable .ops-queue-row__main {
  display: grid;
  grid-template-columns: var(--cases-list-cols);
  gap: 4px 8px;
  align-items: center;
}

.cases-list-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.cases-list-row.ops-queue-row--clickable .ops-queue-row__main {
  min-height: 34px;
  padding: 4px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}

.cases-list-row.ops-queue-row--clickable:hover .ops-queue-row__main {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.cases-list-row--attention .ops-queue-row__main {
  background: color-mix(in srgb, #f59e0b 4%, #fff);
}

.cases-list-row .ops-queue-row__grid {
  display: contents;
}

.cases-list-col {
  min-width: 0;
  overflow: hidden;
}

.cases-list-provider {
  display: block;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-list-text,
.cases-list-type,
.cases-list-status,
.cases-list-next {
  display: block;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-list-text {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.cases-list-type {
  color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
}

.cases-list-status {
  font-weight: 800;
  color: var(--brand-700);
}

.cases-list-next {
  font-weight: 750;
  color: var(--foreground);
}

.cases-list-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
  position: relative;
  z-index: 2;
}

.cases-list-open:hover {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
}

.cases-list-dictation {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #f59e0b 26%, var(--border));
  background: color-mix(in srgb, #f59e0b 9%, #fff);
  color: #92400e;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.cases-list-dictation[data-captured="true"] {
  border-color: color-mix(in srgb, #0d9488 28%, var(--border));
  background: color-mix(in srgb, #0d9488 9%, #fff);
  color: #0f766e;
}

.cases-list-mobile-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cases-list-mobile-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
}

.cases-list-mobile-row[data-needs-attention="true"],
.cases-list-mobile-row--attention {
  background: color-mix(in srgb, #f59e0b 5%, #fff);
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 70%, transparent);
}

.cases-list-mobile-main {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.cases-list-mobile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.cases-list-mobile-provider {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.cases-list-mobile-status {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.cases-list-mobile-org {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-list-mobile-schedule {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
}

.cases-list-mobile-date,
.cases-list-mobile-type {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-list-mobile-type::before {
  content: "·";
  margin-right: 6px;
  color: color-mix(in srgb, var(--foreground) 28%, var(--border));
}

.cases-list-mobile-meta {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-list-mobile-next {
  margin: 2px 0 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.35;
  color: var(--foreground);
  min-width: 0;
}

.cases-list-mobile-next-label {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.cases-list-mobile-open {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  padding: 0 10px;
  border-left: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  touch-action: manipulation;
}

.cases-board-card {
  display: grid;
  gap: 0;
  min-width: 320px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  overflow: hidden;
  list-style: none;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent);
}

.cases-board-card[data-needs-attention="true"] {
  background: color-mix(in srgb, #f59e0b 4%, #fff);
  border-color: color-mix(in srgb, #f59e0b 22%, var(--border));
}

.cases-list-table--identity {
  --cases-list-cols: minmax(0, 1fr) auto;
}

.cases-list-col--identity {
  min-width: 0;
  padding: 0;
}

.cases-directory-root .cases-list-table--identity .cases-list-head {
  padding: 7px 12px;
}

.cases-directory-root .cases-list-row.ops-queue-row--clickable .ops-queue-row__main {
  min-height: 38px;
  padding: 6px 12px;
}

.cases-directory-root .cases-list-row .ops-queue-open-hint,
.cases-directory-root .cases-list-mobile-row .ops-queue-open-hint {
  min-height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  font-size: 9px;
}

.cases-directory-root .cases-list-row .case-identity--list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 14px;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-primary {
  display: grid;
  grid-template-columns: auto minmax(150px, 0.9fr) minmax(180px, 1.2fr);
  align-items: center;
  gap: 8px;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-type,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-provider,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-provider-link,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-facility,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-facility-link,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-date,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-provider,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-provider-link {
  font-size: 13px;
  line-height: 1.2;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-specialty {
  display: none;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-location {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-top: 0;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-facility,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-facility-link,
.cases-directory-root .cases-list-row .case-identity--list .case-identity-date {
  font-size: 11px;
  line-height: 1.2;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-secondary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 0;
  min-width: 0;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-secondary-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  line-height: 1.2;
}

.cases-directory-root .cases-list-row .case-identity--list .case-identity-secondary-row:not(:first-child) {
  display: none;
}

.cases-list-mobile-row.ops-queue-mobile-row {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
  border-radius: 0;
  padding: 0;
  gap: 0;
  box-shadow: none;
}

.cases-list-mobile-row.ops-queue-mobile-row--clickable .ops-queue-row__content {
  gap: 2px;
  padding: 7px 10px;
}

.cases-list-mobile-row.ops-queue-mobile-row .ops-queue-row__actions--mobile {
  display: none;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list {
  gap: 2px;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-primary {
  gap: 1px;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-type {
  font-size: 9px;
  line-height: 1.15;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-provider,
.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-provider-link {
  font-size: 13px;
  line-height: 1.18;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-specialty {
  display: none;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-location {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 0;
  min-width: 0;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-facility,
.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-facility-link,
.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-date {
  font-size: 11px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-date {
  flex-shrink: 0;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 1px;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-secondary-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  line-height: 1.2;
}

.cases-directory-root .cases-list-mobile-row .case-identity--list .case-identity-secondary-row:not(:first-child) {
  display: none;
}

.cases-list-mobile-row--attention.ops-queue-mobile-row--clickable {
  background: color-mix(in srgb, #f59e0b 5%, #fff);
  box-shadow: inset 3px 0 0 color-mix(in srgb, #f59e0b 70%, transparent);
}

.cases-board-card-link {
  display: block;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.cases-board-card-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 75%, #fff);
  outline-offset: -2px;
}

.cases-board-card:has(.cases-board-card-link:hover) {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--brand-600) 12%, transparent);
}

.cases-board-card[data-needs-attention="true"]:has(.cases-board-card-link:hover) {
  border-color: color-mix(in srgb, #f59e0b 38%, var(--border));
  box-shadow: 0 2px 8px color-mix(in srgb, #f59e0b 14%, transparent);
}

.cases-board-card-body {
  display: grid;
  gap: 12px;
  padding: 14px;
  min-width: 0;
}

.cases-board-card-header {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.cases-board-card-provider {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-board-card-procedure {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-board-card-facility {
  margin: 0;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.3;
  color: color-mix(in srgb, var(--foreground) 86%, var(--muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-board-card-date {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-board-card-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.cases-board-card-status-badge {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: 11px !important;
  font-weight: 800 !important;
  padding: 5px 10px !important;
  border-radius: 999px !important;
  line-height: 1.2 !important;
}

.cases-board-card-priority-insight {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.cases-board-card-priority-insight-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.2;
}

.cases-board-card-priority-insight-value {
  margin: 0;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.4;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cases-board-card-priority-insight-value[data-empty="true"] {
  color: var(--muted);
  font-weight: 700;
  font-style: italic;
}

.cases-board-card-priority-insight-source {
  font-size: 11px;
  font-weight: 750;
  line-height: 1.2;
  color: var(--muted);
}

.cases-board-card-metrics-section {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.cases-board-card-metrics-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.2;
}

.cases-board-card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.cases-board-card-metric-pill {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  color: var(--foreground);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cases-board-card-metrics-empty {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--muted);
}

.cases-board-card-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
  touch-action: manipulation;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--brand-900) 18%, transparent);
  pointer-events: none;
}

.cases-board-card-cta:active {
  background: color-mix(in srgb, var(--brand-700) 92%, #000);
}

.cases-board-card-link:active .cases-board-card-cta {
  background: color-mix(in srgb, var(--brand-700) 92%, #000);
}

.cases-board-card[data-needs-attention="true"] .cases-board-card-cta {
  background: color-mix(in srgb, #d97706 88%, var(--brand-600));
  box-shadow: 0 1px 2px color-mix(in srgb, #92400e 22%, transparent);
}

.cases-board-card-next-action,
.cases-board-card-open-btn {
  display: none;
}

@media (min-width: 901px) {
  .cases-board-card {
    min-width: 0;
  }

  .cases-board-card-provider {
    font-size: 17px;
  }
}

@media (max-width: 1100px) {
  .cases-list-table-wrap {
    --cases-list-cols:
      minmax(0, 1.05fr)
      minmax(0, 0.9fr)
      minmax(0, 0.68fr)
      minmax(0, 0.8fr)
      minmax(0, 0.68fr)
      minmax(0, 1fr)
      52px;
  }
}

@media (max-width: 900px) {
  .cases-list-panel {
    display: none !important;
  }
}

@media (min-width: 901px) {
  .cases-list-mobile-list {
    display: none !important;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

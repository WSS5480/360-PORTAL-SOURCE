/** Providers directory — operations toolbar + mission/operations visibility. */

import { operationsQueueCss } from "../shared/operationsQueueCss";

export const providersOperationsCss = `
${operationsQueueCss}

/* —— Toolbar —— */
.providers-directory-tools {
  display: grid;
  gap: 0;
}

.providers-directory-toolbar-row {
  display: grid;
  gap: 8px;
  padding: 0 12px;
}

.providers-directory-toolbar-row--primary {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  padding-bottom: 6px;
}

.providers-directory-toolbar-toggle-desktop {
  display: none;
}

.providers-directory-toolbar-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.providers-directory-toolbar-row--view {
  padding-bottom: 8px;
}

.providers-directory-toolbar-row--view .directory-view-mode-toggle {
  width: 100%;
}

.providers-directory-toolbar-row--view .directory-view-mode-toggle__btn {
  flex: 1;
  min-height: 32px;
}

.providers-directory-toolbar-search {
  min-width: 0;
}

.providers-directory-toolbar-search.sc-mobile-list-search-wrap {
  min-height: 34px;
}

.providers-directory-root .providers-directory-toolbar-cluster .sc-mobile-list-tool-btn {
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  border-radius: 9px;
}

.providers-directory-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.providers-directory-contacts-link {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  min-height: 34px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
  white-space: nowrap;
  touch-action: manipulation;
}

.providers-directory-contacts-link:active {
  background: color-mix(in srgb, var(--foreground) 5%, #fff);
}

.providers-directory-contacts-link__short {
  display: none;
}

.providers-directory-root .providers-directory-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: auto;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  touch-action: manipulation;
}

.providers-directory-root .providers-directory-add-btn:active {
  background: color-mix(in srgb, var(--brand-600) 88%, #000);
}

/* —— Empty state —— */
.providers-directory-empty-wrap {
  padding: 12px;
}

.providers-directory-empty {
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 18px 16px;
  border-radius: 12px;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--brand-600) 5%, #fff) 0%,
    #fff 48%,
    color-mix(in srgb, #22d3ee 5%, #fff) 100%
  );
  box-shadow: 0 6px 24px color-mix(in srgb, var(--foreground) 6%, transparent);
}

.providers-directory-empty::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--brand-600), #22d3ee);
}

.providers-directory-empty__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  margin-bottom: 10px;
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700);
}

.providers-directory-empty__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.providers-directory-empty__text {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  font-weight: 650;
}

@media (max-width: 480px) {
  .providers-directory-contacts-link__long {
    display: none;
  }

  .providers-directory-contacts-link__short {
    display: inline;
  }

  .providers-directory-root .providers-directory-add-btn {
    padding: 0 10px;
    font-size: 11px;
  }
}

@media (min-width: 901px) {
  .providers-directory-toolbar-row--primary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .providers-directory-toolbar-toggle-desktop {
    display: block;
  }

  .providers-directory-toolbar-row--view {
    display: none;
  }
}

@media (max-width: 900px) {
  .providers-directory-root.providers-directory-root--operations .sc-mobile-provider-list {
    display: none !important;
  }

  /* —— Touch targets —— */
  .providers-directory-toolbar-row--view .directory-view-mode-toggle__btn {
    min-height: 44px;
  }

  .providers-directory-root .providers-directory-toolbar-cluster .sc-mobile-list-tool-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }

  .providers-directory-toolbar-search.sc-mobile-list-search-wrap {
    min-height: 44px;
  }

  .providers-directory-contacts-link,
  .providers-directory-root .providers-directory-add-btn {
    min-height: 44px;
  }
}

@media (min-width: 901px) {
  .providers-directory-root.providers-directory-root--mission .ops-queue-panel,
  .providers-directory-root.providers-directory-root--mission .ops-queue-mobile-list,
  .providers-directory-root.providers-directory-root--mission .providers-ops-mobile-list {
    display: none !important;
  }

  .providers-directory-root.providers-directory-root--operations .providers-ops-mobile-list {
    display: none !important;
  }
}

/* —— Mission command center —— */
.providers-mission-command-center {
  margin: 8px 12px 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border));
  background:
    linear-gradient(
      165deg,
      color-mix(in srgb, var(--brand-600) 7%, var(--surface)) 0%,
      var(--surface) 52%,
      color-mix(in srgb, #22d3ee 4%, var(--surface)) 100%
    );
  box-shadow: 0 8px 24px color-mix(in srgb, var(--brand-600) 8%, transparent);
}

.providers-mission-command-center-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.providers-mission-command-center-kicker {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 78%, var(--foreground));
}

.providers-mission-command-center-clear {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  font-weight: 750;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.providers-mission-command-center-clear--inline {
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
  border-radius: 8px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  text-decoration: none;
}

.providers-mission-command-center-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.providers-mission-metric {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--surface) 92%, var(--foreground) 2%);
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}

.providers-mission-metric:hover {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600) 8%, transparent);
  transform: translateY(-1px);
}

.providers-mission-metric--active {
  border-color: color-mix(in srgb, var(--brand-600) 42%, var(--border));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-600) 14%, transparent);
}

.providers-mission-metric-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.2;
}

.providers-mission-metric-value {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--foreground);
}

.providers-mission-metric--discovery.providers-mission-metric--populated .providers-mission-metric-value {
  color: #92400e;
}

.providers-mission-metric--observe.providers-mission-metric--populated .providers-mission-metric-value {
  color: #166534;
}

.providers-mission-metric--debrief.providers-mission-metric--populated .providers-mission-metric-value {
  color: #1e40af;
}

.providers-mission-metric--evaluation.providers-mission-metric--populated .providers-mission-metric-value {
  color: #7c3aed;
}

.providers-mission-metric--commitment.providers-mission-metric--populated .providers-mission-metric-value {
  color: #0f766e;
}

.providers-mission-metric--outcomes.providers-mission-metric--populated .providers-mission-metric-value {
  color: #115e59;
}

@media (max-width: 699px) {
  .providers-directory-root--mission .providers-mission-command-center {
    margin: 4px 8px 0;
    padding: 7px 8px;
    border-radius: 10px;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--brand-600) 5%, transparent);
  }

  .providers-directory-root--mission .providers-mission-command-center-head {
    margin-bottom: 5px;
  }

  .providers-directory-root--mission .providers-mission-command-center-kicker {
    font-size: 9px;
    line-height: 1;
  }

  .providers-directory-root--mission .providers-mission-command-center-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
  }

  .providers-directory-root--mission .providers-mission-metric {
    gap: 1px;
    min-height: 44px;
    padding: 6px 8px;
    border-radius: 8px;
  }

  .providers-directory-root--mission .providers-mission-metric-label {
    font-size: 8px;
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .providers-directory-root--mission .providers-mission-metric-value {
    font-size: 18px;
    line-height: 1;
  }
}

.provider-mission-board-column--focused {
  border-color: color-mix(in srgb, var(--mission-accent, var(--brand-600)) 38%, var(--border));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--mission-accent, var(--brand-600)) 14%, transparent),
    0 12px 32px color-mix(in srgb, var(--mission-accent, var(--brand-600)) 12%, transparent);
  transform: scale(1.01);
  transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease;
}

@media (min-width: 768px) {
  .providers-mission-command-center-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .providers-mission-command-center-metrics {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

/* —— Legacy portfolio summary (removed from UI) —— */
.providers-ops-portfolio-summary {
  display: none;
}

/* —— Providers operations table (portfolio management queue) —— */
@keyframes providers-ops-priority-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 35%, transparent);
  }
  50% {
    box-shadow: 0 0 0 3px color-mix(in srgb, #ef4444 0%, transparent);
  }
}

.providers-ops-panel.ops-queue-panel {
  margin: 6px 12px 14px;
  border-radius: 14px;
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    0 10px 32px color-mix(in srgb, var(--brand-600) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border));
  overflow: hidden;
  background: var(--surface);
  position: relative;
}

.providers-ops-panel.ops-queue-panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-600), #22d3ee, var(--brand-600));
  background-size: 200% 100%;
  z-index: 1;
}

.providers-ops-kicker {
  margin: 0;
  padding: 12px 14px 8px;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--brand-600) 4%, var(--surface)) 0%,
    var(--surface) 100%
  );
  display: flex;
  align-items: center;
  gap: 8px;
}

.providers-ops-kicker::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #22d3ee, var(--brand-600));
  box-shadow: 0 0 8px color-mix(in srgb, #22d3ee 40%, transparent);
  flex-shrink: 0;
}

.providers-ops-table-wrap {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  --providers-ops-cols:
    minmax(0, 1.05fr)
    minmax(0, 0.72fr)
    minmax(0, 1fr)
    minmax(0, 0.82fr)
    minmax(0, 0.78fr);
}

.providers-ops-table {
  width: 100%;
  min-width: 0;
}

.providers-ops-head.ops-queue-head,
.providers-ops-row.ops-queue-row--clickable .ops-queue-row__main {
  display: grid;
  grid-template-columns: var(--providers-ops-cols);
  gap: 4px 6px;
  align-items: center;
}

.providers-ops-head.ops-queue-head {
  padding: 8px 12px;
  min-height: 0;
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.providers-ops-row.ops-queue-row--clickable .ops-queue-row__main {
  min-height: 44px;
  padding: 6px 12px;
  border-left: 3px solid transparent;
  transition:
    background 140ms ease,
    border-left-color 140ms ease,
    box-shadow 140ms ease;
}

.providers-ops-row--overdue.ops-queue-row--clickable .ops-queue-row__main {
  border-left-color: #ef4444;
}

.providers-ops-row--action.ops-queue-row--clickable .ops-queue-row__main {
  border-left-color: #3b82f6;
}

.providers-ops-row--waiting.ops-queue-row--clickable .ops-queue-row__main {
  border-left-color: #f59e0b;
}

.providers-ops-row--progressing.ops-queue-row--clickable .ops-queue-row__main {
  border-left-color: #22c55e;
}

.providers-ops-row.ops-queue-row--clickable:hover .ops-queue-row__main {
  background: color-mix(in srgb, #22d3ee 4%, var(--surface));
}

.providers-ops-row .ops-queue-row__grid {
  display: contents;
}

.providers-ops-col {
  min-width: 0;
  overflow: hidden;
  isolation: isolate;
}

.providers-ops-col--provider {
  grid-column: 1;
  display: grid;
  gap: 1px;
}

.providers-ops-provider-org {
  font-size: 10px;
  font-weight: 650;
  line-height: 1.25;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.providers-ops-col--stage {
  grid-column: 2;
}

.providers-ops-col--next {
  grid-column: 3;
}

.providers-ops-col--upcoming {
  grid-column: 4;
}

.providers-ops-col--priority {
  grid-column: 5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.providers-ops-priority-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 8px 4px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}

.providers-ops-row--overdue .providers-ops-priority-label {
  border-color: color-mix(in srgb, #ef4444 24%, var(--border));
  background: color-mix(in srgb, #ef4444 8%, var(--surface));
}

.providers-ops-row--action .providers-ops-priority-label {
  border-color: color-mix(in srgb, #3b82f6 24%, var(--border));
  background: color-mix(in srgb, #3b82f6 8%, var(--surface));
}

.providers-ops-row--waiting .providers-ops-priority-label {
  border-color: color-mix(in srgb, #f59e0b 24%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, var(--surface));
}

.providers-ops-row--progressing .providers-ops-priority-label {
  border-color: color-mix(in srgb, #22c55e 24%, var(--border));
  background: color-mix(in srgb, #22c55e 8%, var(--surface));
}

.providers-ops-priority-text {
  font-size: 10px;
  font-weight: 750;
  line-height: 1.25;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.providers-ops-priority-text--overdue {
  color: #991b1b;
}

.providers-ops-priority-text--action {
  color: #1e40af;
}

.providers-ops-priority-text--waiting {
  color: #92400e;
}

.providers-ops-priority-text--progressing {
  color: #166534;
}

.providers-ops-priority {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.providers-ops-priority--overdue {
  background: #ef4444;
  box-shadow: 0 0 0 2px color-mix(in srgb, #ef4444 22%, transparent);
  animation: providers-ops-priority-pulse 2.4s ease infinite;
}

.providers-ops-priority--waiting {
  background: #f59e0b;
  box-shadow: 0 0 0 2px color-mix(in srgb, #f59e0b 20%, transparent);
}

.providers-ops-priority--action {
  background: #3b82f6;
  box-shadow: 0 0 0 2px color-mix(in srgb, #3b82f6 20%, transparent);
}

.providers-ops-priority--progressing {
  background: #22c55e;
  box-shadow: 0 0 0 2px color-mix(in srgb, #22c55e 20%, transparent);
}

.providers-ops-priority--health-green {
  background: #22c55e;
  box-shadow: 0 0 0 2px color-mix(in srgb, #22c55e 20%, transparent);
}

.providers-ops-priority--health-yellow {
  background: #f59e0b;
  box-shadow: 0 0 0 2px color-mix(in srgb, #f59e0b 20%, transparent);
}

.providers-ops-priority--health-blue {
  background: #3b82f6;
  box-shadow: 0 0 0 2px color-mix(in srgb, #3b82f6 20%, transparent);
}

.providers-ops-priority--health-red {
  background: #ef4444;
  box-shadow: 0 0 0 2px color-mix(in srgb, #ef4444 20%, transparent);
}

.providers-ops-priority--health-neutral {
  background: var(--muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--muted) 20%, transparent);
}

.providers-ops-row--action {
  background: color-mix(in srgb, #3b82f6 3%, var(--surface));
}

.providers-ops-row--overdue {
  background: color-mix(in srgb, #ef4444 3%, var(--surface));
}

.providers-ops-row--waiting {
  background: color-mix(in srgb, #f59e0b 2%, var(--surface));
}

.providers-ops-row--progressing {
  background: color-mix(in srgb, #22c55e 2%, var(--surface));
}

.providers-ops-row--health-green {
  background: color-mix(in srgb, #22c55e 2%, var(--surface));
}

.providers-ops-row--health-blue {
  background: color-mix(in srgb, #3b82f6 2%, var(--surface));
}

.providers-ops-row--health-red {
  background: color-mix(in srgb, #ef4444 3%, var(--surface));
}

.providers-ops-row--health-yellow {
  background: color-mix(in srgb, #f59e0b 2%, var(--surface));
}

.providers-ops-mission--green,
.providers-ops-status--green {
  color: #166534;
}

.providers-ops-mission--yellow,
.providers-ops-status--yellow {
  color: #92400e;
}

.providers-ops-mission--blue,
.providers-ops-status--blue {
  color: #1e40af;
}

.providers-ops-mission--red,
.providers-ops-status--red {
  color: #991b1b;
}

.providers-ops-mission--neutral,
.providers-ops-status--neutral {
  color: var(--muted);
}

.providers-ops-mission-pill--green {
  background: color-mix(in srgb, #22c55e 12%, var(--surface));
  border-color: color-mix(in srgb, #22c55e 28%, var(--border));
  color: #166534;
}

.providers-ops-mission-pill--yellow,
.providers-ops-pathway-pill--yellow {
  background: color-mix(in srgb, #f59e0b 12%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  color: #92400e;
}

.providers-ops-mission-pill--blue,
.providers-ops-pathway-pill--blue {
  background: color-mix(in srgb, #3b82f6 12%, var(--surface));
  border-color: color-mix(in srgb, #3b82f6 28%, var(--border));
  color: #1e40af;
}

.providers-ops-mission-pill--red,
.providers-ops-pathway-pill--red {
  background: color-mix(in srgb, #ef4444 10%, var(--surface));
  border-color: color-mix(in srgb, #ef4444 26%, var(--border));
  color: #991b1b;
}

.providers-ops-mission-pill--neutral,
.providers-ops-pathway-pill--neutral {
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
}

.providers-ops-pathway-pill--green {
  background: color-mix(in srgb, #22c55e 8%, var(--surface));
  border-color: color-mix(in srgb, #22c55e 20%, var(--border));
  color: #166534;
}

.providers-ops-org-sub {
  margin-top: 1px;
  font-size: 8px;
  font-weight: 650;
  color: var(--muted);
}

.providers-ops-organization {
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.providers-ops-status {
  font-weight: 700;
  color: var(--foreground);
}

.providers-ops-mission {
  font-weight: 750;
  color: var(--brand-700);
}

.providers-ops-next-action {
  font-weight: 800;
  font-size: 11px;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.providers-ops-upcoming {
  font-weight: 750;
  color: color-mix(in srgb, var(--brand-700) 88%, var(--foreground));
}

.providers-ops-upcoming--none {
  color: var(--muted);
  font-weight: 650;
}

.providers-ops-head-static--priority {
  width: 8px;
  height: 1px;
  overflow: hidden;
  padding: 0;
  opacity: 0;
}

.providers-ops-head-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
  cursor: pointer;
  text-align: left;
  min-width: 0;
  transition: background 120ms ease, color 120ms ease;
}

.providers-ops-head-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.providers-ops-head-sort {
  flex-shrink: 0;
  font-size: 10px;
}

.providers-ops-head-static {
  display: block;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: right;
  color: inherit;
}

.providers-ops-head-btn:hover,
.providers-ops-head-btn--active {
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.providers-ops-head-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 75%, var(--brand-600));
  outline-offset: 1px;
  border-radius: 3px;
}

.providers-ops-text {
  display: block;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

.providers-ops-text--truncate,
.providers-ops-text--truncate-optional {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.providers-ops-provider-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--foreground);
  overflow: hidden;
  word-break: break-word;
  white-space: normal;
}

.providers-ops-pathway,
.providers-ops-stage {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.providers-ops-mission {
  font-size: 9px;
}

@media (max-width: 1100px) {
  .providers-ops-table-wrap {
    --providers-ops-cols:
      minmax(0, 1fr)
      minmax(0, 0.68fr)
      minmax(0, 0.92fr)
      minmax(0, 0.72fr)
      minmax(0, 0.72fr);
  }
}

@media (max-width: 960px) {
  .providers-ops-table-wrap {
    --providers-ops-cols:
      minmax(0, 1fr)
      minmax(0, 0.62fr)
      minmax(0, 0.92fr)
      minmax(0, 0.68fr)
      minmax(0, 0.68fr);
  }
}

/* —— Mobile operations list —— */
.providers-ops-mobile-list,
.providers-ops-mobile-list.ops-queue-mobile-list {
  list-style: none;
  margin: 0;
  padding: 2px 12px 14px;
  display: grid;
  gap: 6px;
}

.providers-ops-mobile-row.ops-queue-mobile-row {
  padding: 0;
  border-radius: 12px;
  gap: 0;
  border-color: color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    0 4px 16px color-mix(in srgb, var(--foreground) 4%, transparent);
  overflow: hidden;
  border-left-width: 4px;
  border-left-style: solid;
  border-left-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.providers-ops-mobile-row--overdue.ops-queue-mobile-row {
  border-left-color: #ef4444;
}

.providers-ops-mobile-row--action.ops-queue-mobile-row {
  border-left-color: #3b82f6;
}

.providers-ops-mobile-row--waiting.ops-queue-mobile-row {
  border-left-color: #f59e0b;
}

.providers-ops-mobile-row--progressing.ops-queue-mobile-row {
  border-left-color: #22c55e;
}

.providers-ops-mobile-row.ops-queue-mobile-row--clickable .ops-queue-row__content {
  gap: 7px;
  padding: 12px 14px;
}

.providers-ops-mobile-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.providers-ops-mobile-line--title {
  align-items: center;
  gap: 8px;
}

.providers-ops-mobile-line--title .providers-ops-provider-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 900;
}

.providers-ops-mobile-line--title .providers-ops-priority-text {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
}

.providers-ops-mobile-row--overdue .providers-ops-priority-text--overdue {
  border-color: color-mix(in srgb, #ef4444 24%, var(--border));
  background: color-mix(in srgb, #ef4444 10%, var(--surface));
}

.providers-ops-mobile-row--action .providers-ops-priority-text--action {
  border-color: color-mix(in srgb, #3b82f6 24%, var(--border));
  background: color-mix(in srgb, #3b82f6 10%, var(--surface));
}

.providers-ops-mobile-line--stages {
  gap: 6px;
}

.providers-ops-mobile-line--org {
  margin-top: -2px;
  justify-content: space-between;
  gap: 8px;
}

.providers-ops-mobile-k {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, var(--muted));
}

.providers-ops-mobile-line--next,
.providers-ops-mobile-line--meta {
  justify-content: space-between;
  gap: 8px;
}

.providers-ops-mobile-org {
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.providers-ops-status-pill,
.providers-ops-mission-pill,
.providers-ops-stage-pill {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.providers-ops-stage-pill {
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700, var(--brand-600));
}

.providers-ops-status-pill {
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  color: var(--foreground);
}

.providers-ops-status-pill--green {
  background: color-mix(in srgb, #22c55e 8%, var(--surface));
  border-color: color-mix(in srgb, #22c55e 20%, var(--border));
  color: #166534;
}

.providers-ops-status-pill--yellow {
  background: color-mix(in srgb, #f59e0b 12%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  color: #92400e;
}

.providers-ops-status-pill--blue {
  background: color-mix(in srgb, #3b82f6 12%, var(--surface));
  border-color: color-mix(in srgb, #3b82f6 28%, var(--border));
  color: #1e40af;
}

.providers-ops-status-pill--red {
  background: color-mix(in srgb, #ef4444 10%, var(--surface));
  border-color: color-mix(in srgb, #ef4444 26%, var(--border));
  color: #991b1b;
}

.providers-ops-status-pill--neutral {
  background: color-mix(in srgb, var(--foreground) 5%, var(--surface));
  border-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
}

.providers-ops-mobile-upcoming {
  font-size: 10px;
  font-weight: 750;
  color: color-mix(in srgb, var(--brand-700) 88%, var(--foreground));
}

.providers-ops-mobile-upcoming--none {
  font-size: 10px;
  font-weight: 650;
  color: var(--muted);
}

.providers-ops-mission-pill,
.providers-ops-stage-pill {
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700);
}

.providers-ops-mobile-line--next {
  margin-top: -2px;
}

.providers-ops-mobile-next-action {
  font-size: 13px;
  font-weight: 850;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--foreground);
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  flex: 1;
  min-width: 0;
}

.providers-ops-mobile-line--meta {
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.providers-ops-mobile-value {
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.providers-ops-mobile-signals {
  font-weight: 800;
  color: #b45309;
}

.providers-ops-mobile-cases {
  font-weight: 750;
  color: var(--muted);
}

.providers-ops-mobile-dot {
  font-size: 9px;
  color: var(--muted);
  font-weight: 700;
}

.providers-ops-shell {
  display: grid;
  gap: 0;
}

.providers-ops-shell > .providers-ops-portfolio-summary {
  margin: 4px 12px 0;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px 8px 0 0;
  background: var(--surface);
}

.providers-ops-shell > .providers-ops-panel {
  margin-top: 0;
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.providers-ops-shell > .providers-ops-mobile-list {
  margin: 0 12px 12px;
  padding-top: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-top: none;
  border-radius: 0 0 10px 10px;
  background: var(--surface);
}

.providers-ops-mobile-summary-wrap {
  display: none;
}

@media (max-width: 900px) {
  .providers-ops-shell > .providers-ops-portfolio-summary {
    margin: 8px 12px 0;
    border-radius: 10px 10px 0 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 8px 12px;
  }

  .providers-ops-shell > .providers-ops-panel {
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

@media (prefers-reduced-motion: reduce) {
  .providers-ops-priority--overdue {
    animation: none;
  }
}
`;

import { operationsQueueCss } from "../shared/operationsQueueCss";

export const organizationsOperationsCss = `
${operationsQueueCss}

.org-directory-root--operations .org-card-grid,
.org-directory-root--operations .org-attn-section,
.org-directory-root--operations .org-all-section-title {
  display: none !important;
}

.org-directory-toolbar-row--view {
  padding: 0 12px 8px;
}

.org-directory-toolbar-row--view .directory-view-mode-toggle {
  width: 100%;
}

.org-directory-toolbar-row--view .directory-view-mode-toggle__btn {
  flex: 1;
  min-height: 44px;
}

.org-directory-root .ops-queue-panel {
  margin-top: 10px;
  border-radius: 14px;
  border-color: color-mix(in srgb, var(--brand-600) 10%, var(--border));
  box-shadow:
    0 12px 30px color-mix(in srgb, var(--foreground) 5%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent);
}

.org-directory-root .ops-queue-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background:
    radial-gradient(520px 120px at 12% 0%, color-mix(in srgb, var(--brand-600) 10%, transparent), transparent 64%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-2) 70%, #fff), #fff);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.org-directory-root .ops-queue-summary-title {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--foreground);
}

.org-directory-root .ops-queue-summary-sub {
  margin: 3px 0 0;
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  line-height: 1.35;
}

.org-directory-root .ops-queue-summary-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.org-directory-root .ops-queue-summary-metrics span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, #fff 86%, var(--brand-600) 4%);
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  font-size: 10px;
  font-weight: 850;
  white-space: nowrap;
}

.org-directory-root .ops-queue-row {
  min-height: 54px;
}

.org-directory-root .ops-queue-stage-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
}

.org-directory-root .ops-queue-stage-row .ops-queue-stage {
  margin-top: 0;
}

.org-directory-root .ops-queue-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  flex-shrink: 0;
}

.org-directory-root .ops-queue-status-dot--blocked {
  background: #f59e0b;
  box-shadow: 0 0 0 3px color-mix(in srgb, #f59e0b 14%, transparent);
}

.org-directory-root .ops-queue-status-dot--advancing {
  background: #14b8a6;
  box-shadow: 0 0 0 3px color-mix(in srgb, #14b8a6 14%, transparent);
}

.org-directory-root .ops-queue-status-dot--active {
  background: color-mix(in srgb, var(--muted) 60%, var(--border));
}

.org-directory-root .ops-queue-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.org-directory-root .ops-queue-status-pill--blocked {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 9%, #fff);
  border-color: color-mix(in srgb, #f59e0b 20%, var(--border));
}

.org-directory-root .ops-queue-status-pill--advancing {
  color: #0f766e;
  background: color-mix(in srgb, #14b8a6 9%, #fff);
  border-color: color-mix(in srgb, #14b8a6 20%, var(--border));
}

.org-directory-root .ops-queue-status-pill--active {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

.org-directory-toolbar-toggle-desktop {
  display: none;
}

.org-directory-tools .sc-mobile-list-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.org-directory-tools .sc-mobile-list-search-wrap {
  flex: 1;
  min-width: 0;
}

@media (min-width: 901px) {
  .org-directory-toolbar-toggle-desktop {
    display: block;
  }

  .org-directory-toolbar-row--view {
    display: none;
  }

  .org-directory-root--mission .ops-queue-panel,
  .org-directory-root--mission .ops-queue-mobile-list {
    display: none !important;
  }
}

@media (max-width: 720px) {
  .org-directory-root .ops-queue-summary {
    flex-direction: column;
    padding: 11px 12px;
  }

  .org-directory-root .ops-queue-summary-metrics {
    justify-content: flex-start;
  }
}
`;
